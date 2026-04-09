const db = require('../config/db');

const getAll = async (req, res) => {
    try {
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const q = req.query.q || '';

        const params = [];
        let where = '';
        if (q) { where = 'WHERE s.name LIKE ?'; params.push(`%${q}%`); }

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM sales s ${where}`, params);
        const [rows] = await db.query(
            `SELECT s.*, u.email as created_by_email,
                CASE
                    WHEN s.is_active = 0 THEN 'paused'
                    WHEN NOW() < s.starts_at THEN 'upcoming'
                    WHEN NOW() > s.ends_at THEN 'ended'
                    ELSE 'active'
                END as status
             FROM sales s LEFT JOIN users u ON s.created_by = u.id
             ${where} ORDER BY s.starts_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        res.json({ sales: rows, pagination: { total, pages: Math.ceil(total / limit), currentPage: page, limit } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const create = async (req, res) => {
    const { name, description, type, value, starts_at, ends_at, scope, target_ids } = req.body;
    if (!name || !type || value == null || !starts_at || !ends_at) {
        return res.status(400).json({ error: 'Name, type, value, start and end dates are required' });
    }
    try {
        const [result] = await db.query(
            `INSERT INTO sales (name, description, type, value, starts_at, ends_at, scope, target_ids, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                description || null,
                type,
                parseFloat(value),
                starts_at,
                ends_at,
                scope || 'all',
                target_ids ? JSON.stringify(target_ids) : null,
                req.user.id
            ]
        );
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'CREATE_SALE', `Created sale: ${name}`]
        );
        res.status(201).json({ id: result.insertId, message: 'Sale created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const update = async (req, res) => {
    const { id } = req.params;
    const { name, description, type, value, starts_at, ends_at, scope, target_ids, is_active } = req.body;
    try {
        await db.query(
            `UPDATE sales SET name=?, description=?, type=?, value=?, starts_at=?, ends_at=?, scope=?, target_ids=?, is_active=?
             WHERE id=?`,
            [
                name.trim(),
                description || null,
                type,
                parseFloat(value),
                starts_at,
                ends_at,
                scope || 'all',
                target_ids ? JSON.stringify(target_ids) : null,
                is_active !== false,
                id
            ]
        );
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'UPDATE_SALE', `Updated sale ID: ${id} — ${name}`]
        );
        res.json({ message: 'Sale updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const toggleActive = async (req, res) => {
    const { id } = req.params;
    try {
        const [[before]] = await db.query('SELECT name, is_active FROM sales WHERE id = ?', [id]);
        if (!before) return res.status(404).json({ error: 'Not found' });
        await db.query('UPDATE sales SET is_active = NOT is_active WHERE id = ?', [id]);
        const newState = !before.is_active;
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, newState ? 'ACTIVATE_SALE' : 'PAUSE_SALE',
             `${newState ? 'Activated' : 'Paused'} sale: ${before.name}`]
        );
        res.json({ message: 'Toggled', is_active: newState });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const remove = async (req, res) => {
    const { id } = req.params;
    try {
        const [[sale]] = await db.query('SELECT name FROM sales WHERE id = ?', [id]);
        if (!sale) return res.status(404).json({ error: 'Not found' });
        await db.query('DELETE FROM sales WHERE id = ?', [id]);
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'DELETE_SALE', `Deleted sale: ${sale.name}`]
        );
        res.json({ message: 'Sale deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAll, create, update, toggleActive, remove };
