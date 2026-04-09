const pool = require('../config/db');

class ProductVariant {
    static async create(data) {
        const { product_id, color_name, color_code, sku, stock_quantity, price_extra, image_path } = data;
        const [result] = await pool.execute(
            'INSERT INTO product_variants (product_id, color_name, color_code, sku, stock_quantity, price_extra, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [product_id, color_name, color_code, sku, stock_quantity || 0, price_extra || 0, image_path || null]
        );
        return result.insertId;
    }

    static async getByProductId(productId) {
        const [rows] = await pool.execute('SELECT * FROM product_variants WHERE product_id = ?', [productId]);
        return rows;
    }

    static async delete(id) {
        const [result] = await pool.execute('DELETE FROM product_variants WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    static async updateStock(id, quantity) {
        const [result] = await pool.execute('UPDATE product_variants SET stock_quantity = ? WHERE id = ?', [quantity, id]);
        return result.affectedRows > 0;
    }
}

module.exports = ProductVariant;
