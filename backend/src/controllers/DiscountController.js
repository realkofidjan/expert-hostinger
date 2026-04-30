const db = require('../config/db');

const getAll = async (req, res) => {
    try {
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const q = req.query.q || '';

        const params = [];
        let where = '';
        if (q) { where = 'WHERE d.code LIKE ?'; params.push(`%${q}%`); }

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM discounts d ${where}`, params);
        const [rows] = await db.query(
            `SELECT d.*, u.email as created_by_email FROM discounts d
             LEFT JOIN users u ON d.created_by = u.id
             ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        res.json({ discounts: rows, pagination: { total, pages: Math.ceil(total / limit), currentPage: page, limit } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const create = async (req, res) => {
    const { code, type, value, min_order_amount, max_uses, expires_at, is_active } = req.body;
    if (!code || !type || value == null) {
        return res.status(400).json({ error: 'Code, type and value are required' });
    }
    try {
        const [result] = await db.query(
            `INSERT INTO discounts (code, type, value, min_order_amount, max_uses, expires_at, is_active, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                code.toUpperCase().trim(),
                type,
                parseFloat(value),
                parseFloat(min_order_amount) || 0,
                max_uses ? parseInt(max_uses) : null,
                expires_at || null,
                is_active !== false,
                req.user.id
            ]
        );
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'CREATE_DISCOUNT', `Created coupon: ${code.toUpperCase()}`]
        );
        res.status(201).json({ id: result.insertId, message: 'Coupon created' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Coupon code already exists' });
        }
        res.status(500).json({ error: err.message });
    }
};

const update = async (req, res) => {
    const { id } = req.params;
    const { code, type, value, min_order_amount, max_uses, expires_at, is_active } = req.body;
    try {
        await db.query(
            `UPDATE discounts SET code=?, type=?, value=?, min_order_amount=?, max_uses=?, expires_at=?, is_active=?
             WHERE id=?`,
            [
                code.toUpperCase().trim(),
                type,
                parseFloat(value),
                parseFloat(min_order_amount) || 0,
                max_uses ? parseInt(max_uses) : null,
                expires_at || null,
                is_active !== false,
                id
            ]
        );
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'UPDATE_DISCOUNT', `Updated coupon ID: ${id}`]
        );
        res.json({ message: 'Coupon updated' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Coupon code already exists' });
        }
        res.status(500).json({ error: err.message });
    }
};

const toggleActive = async (req, res) => {
    const { id } = req.params;
    try {
        const [[before]] = await db.query('SELECT code, is_active FROM discounts WHERE id = ?', [id]);
        if (!before) return res.status(404).json({ error: 'Not found' });
        await db.query('UPDATE discounts SET is_active = NOT is_active WHERE id = ?', [id]);
        const newState = !before.is_active;
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, newState ? 'ACTIVATE_DISCOUNT' : 'PAUSE_DISCOUNT',
             `${newState ? 'Activated' : 'Paused'} coupon: ${before.code}`]
        );
        res.json({ message: 'Toggled', is_active: newState });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const remove = async (req, res) => {
    const { id } = req.params;
    try {
        const [[discount]] = await db.query('SELECT code FROM discounts WHERE id = ?', [id]);
        if (!discount) return res.status(404).json({ error: 'Not found' });
        await db.query('DELETE FROM discounts WHERE id = ?', [id]);
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'DELETE_DISCOUNT', `Deleted coupon: ${discount.code}`]
        );
        res.json({ message: 'Coupon deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ─── Public: validate a coupon code ─────────────────────────────────────── */
const validate = async (req, res) => {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code is required' });
    try {
        const [[coupon]] = await db.query(
            `SELECT * FROM discounts
             WHERE code = ? AND is_active = 1
             AND (expires_at IS NULL OR expires_at > NOW())
             AND (max_uses IS NULL OR uses_count < max_uses)`,
            [code.toUpperCase().trim()]
        );
        if (!coupon) {
            return res.status(404).json({ error: 'Invalid or expired coupon code' });
        }
        const orderSubtotal = parseFloat(subtotal) || 0;
        if (parseFloat(coupon.min_order_amount) > 0 && orderSubtotal < parseFloat(coupon.min_order_amount)) {
            return res.status(400).json({
                error: `Minimum order of ₵${parseFloat(coupon.min_order_amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })} required for this coupon`
            });
        }
        let discount_amount;
        if (coupon.type === 'percentage') {
            discount_amount = Math.round(orderSubtotal * (parseFloat(coupon.value) / 100) * 100) / 100;
        } else {
            discount_amount = Math.min(parseFloat(coupon.value), orderSubtotal);
        }
        res.json({
            valid: true,
            code: coupon.code,
            type: coupon.type,
            value: parseFloat(coupon.value),
            discount_amount,
            message: coupon.type === 'percentage'
                ? `${coupon.value}% discount applied`
                : `₵${discount_amount.toLocaleString('en-GH', { minimumFractionDigits: 2 })} discount applied`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAll, create, update, toggleActive, remove, validate };
