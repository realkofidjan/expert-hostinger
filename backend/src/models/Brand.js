const pool = require('../config/db');

class Brand {
    static async getAll() {
        const [rows] = await pool.execute('SELECT * FROM brands ORDER BY name ASC');
        return rows;
    }

    static async create(data) {
        const { name, slug, logo } = data;
        const [result] = await pool.execute(
            'INSERT INTO brands (name, slug, logo) VALUES (?, ?, ?)',
            [name, slug, logo || null]
        );
        return result.insertId;
    }

    static async delete(id) {
        const [result] = await pool.execute('DELETE FROM brands WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    static async findById(id) {
        const [rows] = await pool.execute('SELECT * FROM brands WHERE id = ?', [id]);
        return rows[0];
    }

    static async update(id, data) {
        const { name, slug, logo } = data;
        const [result] = await pool.execute(
            'UPDATE brands SET name = ?, slug = ?, logo = ? WHERE id = ?',
            [name, slug, logo || null, id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Brand;
