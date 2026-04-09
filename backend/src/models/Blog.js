const pool = require('../config/db');

class Blog {
    static async getAll() {
        const [rows] = await pool.execute('SELECT * FROM blogs ORDER BY created_at DESC');
        return rows;
    }

    static async getBySlug(slug) {
        const [rows] = await pool.execute('SELECT * FROM blogs WHERE slug = ?', [slug]);
        return rows[0];
    }

    static async getById(id) {
        const [rows] = await pool.execute('SELECT * FROM blogs WHERE id = ?', [id]);
        return rows[0];
    }

    static async create(data) {
        const { title, slug, content, excerpt, image_url, author_id, status } = data;
        const [result] = await pool.execute(
            'INSERT INTO blogs (title, slug, content, excerpt, image_url, author_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, slug, content, excerpt || null, image_url || null, author_id || null, status || 'draft']
        );
        return result.insertId;
    }

    static async update(id, data) {
        const { title, slug, content, excerpt, image_url, status } = data;
        const [result] = await pool.execute(
            'UPDATE blogs SET title = ?, slug = ?, content = ?, excerpt = ?, image_url = ?, status = ? WHERE id = ?',
            [title, slug, content, excerpt, image_url, status, id]
        );
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await pool.execute('DELETE FROM blogs WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Blog;
