const db = require('../config/db');

class Wishlist {
    static async add(userId, productId) {
        const [result] = await db.query(
            'INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)',
            [userId, productId]
        );
        return result.affectedRows > 0;
    }

    static async remove(userId, productId) {
        const [result] = await db.query(
            'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );
        return result.affectedRows > 0;
    }

    static async getByUser(userId) {
        const [rows] = await db.query(
            `SELECT p.*, b.name as brand_name, c.name as category_name,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
             FROM wishlists w
             JOIN products p ON w.product_id = p.id
             LEFT JOIN brands b ON p.brand = b.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE w.user_id = ?
             ORDER BY w.created_at DESC`,
            [userId]
        );
        return rows;
    }

    static async isWishlisted(userId, productId) {
        const [rows] = await db.query(
            'SELECT 1 FROM wishlists WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );
        return rows.length > 0;
    }
}

module.exports = Wishlist;
