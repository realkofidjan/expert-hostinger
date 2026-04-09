const pool = require('../config/db');

const LogController = {
    // Get all activity logs with user names
    getAllLogs: async (req, res) => {
        try {
            const page   = Math.max(1, parseInt(req.query.page)  || 1);
            const limit  = Math.min(100, parseInt(req.query.limit) || 25);
            const offset = (page - 1) * limit;
            const q      = req.query.q || '';
            const action = req.query.action || '';

            const conditions = [];
            const params = [];
            if (q) { conditions.push('(u.email LIKE ? OR al.context LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
            if (action) { conditions.push('al.action = ?'); params.push(action); }
            const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

            const [[{ total }]] = await pool.query(
                `SELECT COUNT(*) AS total FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id ${where}`,
                params
            );
            const [rows] = await pool.query(
                `SELECT al.*, COALESCE(u.email, 'Deleted User') as admin_name
                 FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id
                 ${where} ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );
            res.json({ logs: rows, pagination: { total, pages: Math.ceil(total / limit), currentPage: page, limit } });
        } catch (err) {
            console.error('FETCH_LOGS_ERROR:', err);
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = LogController;
