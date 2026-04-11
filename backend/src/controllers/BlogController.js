const Blog = require('../models/Blog');
const { getAssetPath } = require('../utils/imageHandler');
const { optimizeImage } = require('../utils/imageOptimizer');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// ── Ensure blog_images table exists ───────────────────────────────────────────
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS blog_images (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                blog_id     INT NOT NULL,
                image_url   VARCHAR(500) NOT NULL,
                sort_order  INT DEFAULT 0,
                FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
            )
        `);
    } catch (err) {
        console.error('BLOG_IMAGES_TABLE_INIT_ERROR:', err.message);
    }
})();

// ── Helpers ────────────────────────────────────────────────────────────────────
const saveFile = async (file, subdir = '') => {
    const { relativeDir, absoluteDir } = getAssetPath('content', subdir);
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const absolutePath = path.join(absoluteDir, filename);
    const savedPath = await optimizeImage(file.buffer, absolutePath);
    const savedFilename = path.basename(savedPath);
    return `/assets/${relativeDir}/${savedFilename}`.replace(/\\/g, '/');
};

const attachGallery = async (blogs) => {
    if (!blogs.length) return;
    const ids = blogs.map(b => b.id);
    const [images] = await db.query(
        `SELECT * FROM blog_images WHERE blog_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort_order ASC`,
        ids
    );
    const imgMap = {};
    images.forEach(img => {
        if (!imgMap[img.blog_id]) imgMap[img.blog_id] = [];
        imgMap[img.blog_id].push(img);
    });
    blogs.forEach(b => { b.gallery = imgMap[b.id] || []; });
};

// ── Controllers ────────────────────────────────────────────────────────────────
const getAllBlogs = async (req, res) => {
    try {
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, parseInt(req.query.limit) || 12);
        const offset = (page - 1) * limit;
        const q      = req.query.q || '';
        const status = req.query.status || '';

        const conditions = [];
        const params = [];
        if (q) { conditions.push('(title LIKE ? OR excerpt LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
        if (status) { conditions.push('status = ?'); params.push(status); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM blogs ${where}`, params);
        const [blogs] = await db.query(
            `SELECT * FROM blogs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        res.json({ blogs, pagination: { total, pages: Math.ceil(total / limit), currentPage: page, limit } });
    } catch (err) {
        console.error('GET_ALL_BLOGS_ERROR:', err);
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
};

const getBlogById = async (req, res) => {
    try {
        const blog = await Blog.getById(req.params.id);
        if (!blog) return res.status(404).json({ error: 'Blog not found' });
        // Attach gallery images
        const [gallery] = await db.query(
            'SELECT * FROM blog_images WHERE blog_id = ? ORDER BY sort_order ASC', [blog.id]
        );
        blog.gallery = gallery;
        res.json(blog);
    } catch (err) {
        console.error('GET_BLOG_BY_ID_ERROR:', err);
        res.status(500).json({ error: 'Failed to fetch blog' });
    }
};

const createBlog = async (req, res) => {
    try {
        const { title, content, excerpt, status } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        // Cover image
        let imagePath = null;
        const coverFile = req.files?.['image']?.[0];
        if (coverFile) imagePath = await saveFile(coverFile);

        const blogId = await Blog.create({
            title, slug, content, excerpt,
            image_url: imagePath,
            author_id: req.user.id,
            status: status || 'draft'
        });

        // Gallery images
        const galleryFiles = req.files?.['gallery'] || [];
        for (let i = 0; i < galleryFiles.length; i++) {
            const url = await saveFile(galleryFiles[i], `blog-${blogId}`);
            await db.query(
                'INSERT INTO blog_images (blog_id, image_url, sort_order) VALUES (?, ?, ?)',
                [blogId, url, i]
            );
        }

        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'CREATE_BLOG', `Created blog ID: ${blogId}, Title: ${title}`]
        );

        res.status(201).json({ message: 'Blog created successfully', blogId });
    } catch (err) {
        console.error('CREATE_BLOG_ERROR:', err);
        res.status(500).json({ error: 'Failed to create blog', details: err.message });
    }
};

const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, excerpt, status, deleted_gallery_ids } = req.body;

        const blog = await Blog.getById(id);
        if (!blog) return res.status(404).json({ error: 'Blog not found' });

        const slug = title ? title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : blog.slug;

        // Handle cover image update and cleanup
        let imagePath = blog.image_url;
        const coverFile = req.files?.['image']?.[0];
        if (coverFile) {
            // Delete old cover image if it exists
            if (blog.image_url) {
                const oldAbs = path.join(__dirname, '../../assets', blog.image_url.replace('/assets/', ''));
                if (fs.existsSync(oldAbs)) try { fs.unlinkSync(oldAbs); } catch {}
            }
            imagePath = await saveFile(coverFile);
        }

        await Blog.update(id, {
            title: title || blog.title,
            slug,
            content: content || blog.content,
            excerpt: excerpt !== undefined ? excerpt : blog.excerpt,
            image_url: imagePath,
            status: status || blog.status
        });

        // Delete removed gallery images
        if (deleted_gallery_ids) {
            const delIds = JSON.parse(deleted_gallery_ids);
            if (delIds.length) {
                const [toDelete] = await db.query(
                    `SELECT image_url FROM blog_images WHERE id IN (${delIds.map(() => '?').join(',')})`, delIds
                );
                toDelete.forEach(img => {
                    const abs = path.join(__dirname, '../../assets', img.image_url.replace('/assets/', ''));
                    if (fs.existsSync(abs)) try { fs.unlinkSync(abs); } catch {}
                });
                await db.query(`DELETE FROM blog_images WHERE id IN (${delIds.map(() => '?').join(',')})`, delIds);
            }
        }

        // Add new gallery images
        const galleryFiles = req.files?.['gallery'] || [];
        if (galleryFiles.length) {
            const [[{ maxOrder }]] = await db.query(
                'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM blog_images WHERE blog_id = ?', [id]
            );
            let nextOrder = maxOrder + 1;
            for (const file of galleryFiles) {
                const url = await saveFile(file, `blog-${id}`);
                await db.query(
                    'INSERT INTO blog_images (blog_id, image_url, sort_order) VALUES (?, ?, ?)',
                    [id, url, nextOrder++]
                );
            }
        }

        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'UPDATE_BLOG', `Updated blog ID: ${id}`]
        );

        res.json({ message: 'Blog updated successfully' });
    } catch (err) {
        console.error('UPDATE_BLOG_ERROR:', err);
        res.status(500).json({ error: 'Failed to update blog', details: err.message });
    }
};

const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        // Clean up gallery images from disk
        const [gallery] = await db.query('SELECT image_url FROM blog_images WHERE blog_id = ?', [id]);
        gallery.forEach(img => {
            const abs = path.join(__dirname, '../../assets', img.image_url.replace('/assets/', ''));
            if (fs.existsSync(abs)) try { fs.unlinkSync(abs); } catch {}
        });
        const success = await Blog.delete(id);
        if (!success) return res.status(404).json({ error: 'Blog not found' });

        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'DELETE_BLOG', `Deleted blog ID: ${id}`]
        );

        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        console.error('DELETE_BLOG_ERROR:', err);
        res.status(500).json({ error: 'Failed to delete blog' });
    }
};

module.exports = { getAllBlogs, getBlogById, createBlog, updateBlog, deleteBlog };
