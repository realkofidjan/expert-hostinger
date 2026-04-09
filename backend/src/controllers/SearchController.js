const db = require('../config/db');

const globalSearch = async (req, res) => {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ results: [] });

    const term = `%${q.trim()}%`;

    try {
        const [products] = await db.query(
            `SELECT id, name, sku as subtitle, 'product' as type FROM products
             WHERE name LIKE ? OR sku LIKE ? LIMIT 5`,
            [term, term]
        );
        const [categories] = await db.query(
            `SELECT id, name, 'Category' as subtitle, 'category' as type
             FROM categories WHERE name LIKE ? LIMIT 4`,
            [term]
        );
        const [brands] = await db.query(
            `SELECT id, name, 'Brand' as subtitle, 'brand' as type
             FROM brands WHERE name LIKE ? LIMIT 4`,
            [term]
        );
        const [users] = await db.query(
            `SELECT id, email as name, role as subtitle, 'user' as type
             FROM users WHERE email LIKE ? OR full_name LIKE ? LIMIT 3`,
            [term, term]
        );
        const [orders] = await db.query(
            `SELECT id, CONCAT('Order #', id) as name, status as subtitle, 'order' as type
             FROM orders WHERE id = ? OR status LIKE ? LIMIT 3`,
            [parseInt(q.trim()) || 0, term]
        );

        res.json({
            results: [
                ...products,
                ...categories,
                ...brands,
                ...orders,
                ...users,
            ]
        });
    } catch (err) {
        console.error('SEARCH_ERROR:', err.message);
        res.status(500).json({ error: 'Search failed' });
    }
};

module.exports = { globalSearch };
