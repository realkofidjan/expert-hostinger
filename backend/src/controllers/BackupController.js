const db = require('../config/db');
const xlsx = require('xlsx');
const archiver = require('archiver');
const AdmZip = require('adm-zip');

const BACKUP_TABLES = [
  'users', 'products', 'product_variants', 'product_images',
  'categories', 'subcategories', 'brands',
  'blogs', 'blog_images', 'orders', 'order_items',
  'inquiries', 'quotes', 'quote_items', 'payments',
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
        archive.append(Buffer.from(buffer), { name: `${table}.xlsx` });
      } catch (e) {
        console.warn(`Backup skip ${table}:`, e.message);
      }
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
    const entries = zip.getEntries().filter(e => e.entryName.endsWith('.xlsx'));
    const results = [];

    await db.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const entry of entries) {
      const tableName = entry.entryName.replace(/\.xlsx$/i, '');

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

        for (const row of rows) {
          const values = columns.map(c => (row[c] === undefined || row[c] === '') ? null : row[c]);
          await db.query(`INSERT INTO \`${tableName}\` (${colList}) VALUES (${placeholders})`, values);
        }

        results.push({ table: tableName, status: 'restored', rows: rows.length });
      } catch (e) {
        results.push({ table: tableName, status: 'error', reason: e.message });
      }
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 1');

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
