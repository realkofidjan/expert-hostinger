const db = require('../config/db');
const xlsx = require('xlsx');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const BACKUP_TABLES = [
  'users', 'products', 'product_variants', 'product_images',
  'categories', 'subcategories', 'brands',
  'blogs', 'blog_images', 'orders', 'order_items',
  'inquiries', 'quotes', 'quote_items', 'payments',
  'proforma_invoices',
  'settings', 'delivery_regions', 'discounts', 'discount_codes',
  'sales', 'projects', 'project_images', 'activity_logs',
  'notifications', 'addresses'
];

const exportBackup = async (req, res) => {
  try {
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="expert-office-backup-${date}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);

    for (const table of BACKUP_TABLES) {
      try {
        const [rows] = await db.query(`SELECT * FROM \`${table}\``);
        const ws = xlsx.utils.json_to_sheet(rows.length ? rows : []);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, table);
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        archive.append(Buffer.from(buffer), { name: `data/${table}.xlsx` });
      } catch (e) {
        console.warn(`Backup skip ${table}:`, e.message);
      }
    }

    // Surgical archival of physical assets (Excluding uploads as requested)
    const assetsDir = process.env.ASSETS_DIR || path.join(__dirname, '../../assets');
    
    if (fs.existsSync(assetsDir)) {
      archive.directory(assetsDir, 'assets');
    }

    await archive.finalize();
  } catch (error) {
    console.error('EXPORT_BACKUP_ERROR:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Export failed', details: error.message });
  }
};

const restoreBackup = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const zip = new AdmZip(req.file.buffer);
    const results = [];

    // ── Phase 1: Physical Asset Restoration ──────────────────────────────────
    const assetsBase = process.env.ASSETS_DIR || path.join(__dirname, '../../assets');
    const targetDir = path.dirname(assetsBase); // parent of assets dir
    try {
      // Extract assets if they exist in the ZIP
      const zipEntries = zip.getEntries();
      const hasAssets = zipEntries.some(e => e.entryName.startsWith('assets/'));

      if (hasAssets) {
        // Clear current assets before restoring to ensure a clean state
        const assetsPath = process.env.ASSETS_DIR || path.join(__dirname, '../../assets');
        if (fs.existsSync(assetsPath)) {
          const items = fs.readdirSync(assetsPath);
          for (const item of items) {
            const itemPath = path.join(assetsPath, item);
            try {
              if (fs.lstatSync(itemPath).isDirectory()) fs.rmSync(itemPath, { recursive: true, force: true });
              else fs.unlinkSync(itemPath);
            } catch (e) { console.warn(`Cleanup skip ${item}:`, e.message); }
          }
        }

        let assetCount = 0;
        for (const entry of zipEntries) {
          if (entry.entryName.startsWith('assets/') && !entry.isDirectory) {
            const entryPath = path.join(targetDir, entry.entryName);
            const parentDir = path.dirname(entryPath);
            if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
            fs.writeFileSync(entryPath, entry.getData());
            assetCount++;
          }
        }
        results.push({ area: 'assets', status: 'restored', files: assetCount });
      }
    } catch (err) {
      console.warn('Asset restore issue:', err.message);
      results.push({ area: 'files', status: 'partial/error', reason: err.message });
    }

    // ── Phase 2: Database Data Restoration ──────────────────────────────────
    const dataEntries = zip.getEntries().filter(e => e.entryName.startsWith('data/') && e.entryName.endsWith('.xlsx'));
    
    await db.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const entry of dataEntries) {
      const tableName = entry.entryName.replace('data/', '').replace(/\.xlsx$/i, '');

      if (!BACKUP_TABLES.includes(tableName)) {
        results.push({ table: tableName, status: 'skipped', reason: 'Unknown table' });
        continue;
      }

      try {
        const buffer = entry.getData();
        const wb = xlsx.read(buffer, { type: 'buffer', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(ws);

        if (!rows.length) {
          results.push({ table: tableName, status: 'skipped', reason: 'Empty' });
          continue;
        }

        await db.query(`TRUNCATE TABLE \`${tableName}\``);

        const columns = Object.keys(rows[0]);
        const colList = columns.map(c => `\`${c}\``).join(', ');
        const placeholders = columns.map(() => '?').join(', ');

        // Boolean columns (TINYINT(1)) can come back from xlsx as true/false — coerce to 0/1
        const booleanCols = new Set(['is_primary', 'is_featured', 'is_default', 'is_active', 'is_deleted']);

        for (const row of rows) {
          const values = columns.map(c => {
            const v = row[c];
            if (v === undefined || v === '') return null;
            if (booleanCols.has(c) && typeof v === 'boolean') return v ? 1 : 0;
            return v;
          });
          await db.query(`INSERT INTO \`${tableName}\` (${colList}) VALUES (${placeholders})`, values);
        }

        results.push({ table: tableName, status: 'restored', rows: rows.length });
      } catch (e) {
        results.push({ table: tableName, status: 'error', reason: e.message });
      }
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    // Repair: ensure every product with images has exactly one primary image
    // (xlsx boolean round-trip can zero out is_primary values)
    try {
      await db.query(`
        UPDATE product_images pi
        INNER JOIN (
          SELECT MIN(id) as first_id, product_id
          FROM product_images
          GROUP BY product_id
        ) first ON first.product_id = pi.product_id
        SET pi.is_primary = 1
        WHERE pi.id = first.first_id
          AND NOT EXISTS (
            SELECT 1 FROM (SELECT product_id FROM product_images WHERE is_primary = 1) existing
            WHERE existing.product_id = pi.product_id
          )
      `);
    } catch (e) {
      console.warn('Primary image repair skipped:', e.message);
    }

    await db.query(
      'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
      [req.user.id, 'RESTORE_BACKUP', `Restored ${results.filter(r => r.status === 'restored').length} tables`]
    );

    res.json({ message: 'Restore complete', results });
  } catch (error) {
    try { await db.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
    console.error('RESTORE_BACKUP_ERROR:', error);
    res.status(500).json({ error: 'Restore failed', details: error.message });
  }
};

module.exports = { exportBackup, restoreBackup };
