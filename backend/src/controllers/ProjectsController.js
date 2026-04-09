const db = require('../config/db');
const { getAssetPath } = require('../utils/imageHandler');
const fs = require('fs');
const path = require('path');
const { optimizeImage } = require('../utils/imageOptimizer');

// ── Ensure tables exist ────────────────────────────────────────────────────────
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        title        VARCHAR(255) NOT NULL,
        slug         VARCHAR(255) NOT NULL UNIQUE,
        description  TEXT,
        client       VARCHAR(255),
        location     VARCHAR(255),
        year         INT,
        cover_image  VARCHAR(500),
        status       ENUM('published','draft') DEFAULT 'draft',
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS project_images (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        project_id  INT NOT NULL,
        image_url   VARCHAR(500) NOT NULL,
        caption     VARCHAR(255),
        sort_order  INT DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);
  } catch (err) {
    console.error('PROJECTS_TABLES_INIT_ERROR:', err.message);
  }
})();

// ── Helpers ────────────────────────────────────────────────────────────────────
const slugify = (str) =>
  str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const saveImages = async (files, projectId) => {
  const { absoluteDir, relativeDir } = getAssetPath('content', `projects/${projectId}`);
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${Date.now()}-${i}${ext}`;
    const absolutePath = path.join(absoluteDir, filename);
    await optimizeImage(file.buffer, absolutePath);
    urls.push(`/assets/${relativeDir}/${filename}`.replace(/\\/g, '/'));
  }
  return urls;
};

const attachImages = async (projects) => {
  if (!projects.length) return;
  const ids = projects.map(p => p.id);
  const [images] = await db.query(
    `SELECT * FROM project_images WHERE project_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort_order ASC`,
    ids
  );
  const imgMap = {};
  images.forEach(img => {
    if (!imgMap[img.project_id]) imgMap[img.project_id] = [];
    imgMap[img.project_id].push(img);
  });
  projects.forEach(p => { p.images = imgMap[p.id] || []; });
};

// ── Public ─────────────────────────────────────────────────────────────────────
const getPublic = async (req, res) => {
  try {
    const [projects] = await db.query(
      `SELECT id, title, slug, description, client, location, year, cover_image, created_at
       FROM projects WHERE status = 'published' ORDER BY created_at DESC`
    );
    await attachImages(projects);
    res.json(projects);
  } catch (err) {
    console.error('PROJECTS_PUBLIC_ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// ── Admin ──────────────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 12);
    const offset = (page - 1) * limit;
    const q      = req.query.q || '';
    const status = req.query.status || '';

    const conditions = [];
    const params = [];
    if (q)      { conditions.push('(title LIKE ? OR client LIKE ? OR location LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (status) { conditions.push('status = ?'); params.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM projects ${where}`, params);
    const [projects] = await db.query(
      `SELECT * FROM projects ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    await attachImages(projects);

    res.json({ projects, pagination: { total, pages: Math.ceil(total / limit), currentPage: page, limit } });
  } catch (err) {
    console.error('PROJECTS_GET_ALL_ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

const create = async (req, res) => {
  try {
    const { title, description, client, location, year, status, cover_index } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    let slug = slugify(title);
    const [[existing]] = await db.query('SELECT id FROM projects WHERE slug = ?', [slug]);
    if (existing) slug = `${slug}-${Date.now()}`;

    const safeYear = (year === '' || year === undefined) ? null : parseInt(year);

    const [result] = await db.query(
      `INSERT INTO projects (title, slug, description, client, location, year, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, description || null, client || null, location || null, safeYear, status || 'draft']
    );
    const projectId = result.insertId;

    let coverImage = null;
    if (req.files && req.files.length > 0) {
      const urls = await saveImages(req.files, projectId);
      const coverIdx = parseInt(cover_index) || 0;
      coverImage = urls[Math.min(coverIdx, urls.length - 1)];
      for (let i = 0; i < urls.length; i++) {
        await db.query(
          `INSERT INTO project_images (project_id, image_url, sort_order) VALUES (?, ?, ?)`,
          [projectId, urls[i], i]
        );
      }
      await db.query(`UPDATE projects SET cover_image = ? WHERE id = ?`, [coverImage, projectId]);
    }

    await db.query(
      'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
      [req.user.id, 'CREATE_PROJECT', `Created project ID: ${projectId}, Title: ${title}`]
    );

    res.status(201).json({ message: 'Project created', projectId, slug });
  } catch (err) {
    console.error('PROJECTS_CREATE_ERROR:', err);
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, client, location, year, status, cover_index, deleted_image_ids } = req.body;

    const [[project]] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Delete removed images
    if (deleted_image_ids) {
      const delIds = JSON.parse(deleted_image_ids);
      if (delIds.length) {
        const [toDelete] = await db.query(
          `SELECT image_url FROM project_images WHERE id IN (${delIds.map(() => '?').join(',')})`, delIds
        );
        toDelete.forEach(img => {
          const abs = path.join(__dirname, '../../assets', img.image_url.replace('/assets/', ''));
          if (fs.existsSync(abs)) try { fs.unlinkSync(abs); } catch {}
        });
        await db.query(`DELETE FROM project_images WHERE id IN (${delIds.map(() => '?').join(',')})`, delIds);
      }
    }

    // Save new images
    if (req.files && req.files.length > 0) {
      const [last] = await db.query(
        'SELECT sort_order FROM project_images WHERE project_id = ? ORDER BY sort_order DESC LIMIT 1', [id]
      );
      let nextOrder = last.length ? (last[0].sort_order + 1) : 0;
      const urls = await saveImages(req.files, id);
      for (const url of urls) {
        await db.query(
          `INSERT INTO project_images (project_id, image_url, sort_order) VALUES (?, ?, ?)`,
          [id, url, nextOrder++]
        );
      }
    }

    // Determine cover image
    let coverImage = project.cover_image;
    if (cover_index !== undefined) {
      const [allImgs] = await db.query(
        'SELECT image_url FROM project_images WHERE project_id = ? ORDER BY sort_order ASC', [id]
      );
      const idx = parseInt(cover_index) || 0;
      if (allImgs[idx]) coverImage = allImgs[idx].image_url;
    }

    const safeYear = (year === '' || year === undefined) ? project.year : parseInt(year);

    await db.query(
      `UPDATE projects SET title=?, description=?, client=?, location=?, year=?, status=?, cover_image=? WHERE id=?`,
      [title || project.title, description ?? project.description, client ?? project.client,
       location ?? project.location, safeYear, status || project.status, coverImage, id]
    );

    await db.query(
      'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
      [req.user.id, 'UPDATE_PROJECT', `Updated project ID: ${id}`]
    );

    res.json({ message: 'Project updated' });
  } catch (err) {
    console.error('PROJECTS_UPDATE_ERROR:', err);
    res.status(500).json({ error: 'Failed to update project', details: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const [images] = await db.query('SELECT image_url FROM project_images WHERE project_id = ?', [id]);
    images.forEach(img => {
      const abs = path.join(__dirname, '../../assets', img.image_url.replace('/assets/', ''));
      if (fs.existsSync(abs)) try { fs.unlinkSync(abs); } catch {}
    });
    await db.query('DELETE FROM projects WHERE id = ?', [id]);
    await db.query(
      'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
      [req.user.id, 'DELETE_PROJECT', `Deleted project ID: ${id}`]
    );
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('PROJECTS_DELETE_ERROR:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

module.exports = { getPublic, getAll, create, update, remove };
