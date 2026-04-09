const db = require('../config/db');

const Category = {
    /**
     * @desc    Get all categories with nested subcategories
     * @returns {Array} Nested category hierarchy
     */
    getAll: async () => {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY name ASC');
        const [subcategories] = await db.query('SELECT * FROM subcategories ORDER BY name ASC');

        return categories.map(cat => ({
            ...cat,
            subcategories: subcategories.filter(sub => sub.category_id === cat.id)
        }));
    },

    /**
     * @desc    Create a new main category
     */
    create: async (data) => {
        const { name, slug, image_url } = data;
        const [result] = await db.query(
            'INSERT INTO categories (name, slug, image_url) VALUES (?, ?, ?)',
            [name, slug, image_url || null]
        );
        return result.insertId;
    },

    /**
     * @desc    Update main category
     */
    update: async (id, data) => {
        const { name, slug, image_url } = data;
        const [result] = await db.query(
            'UPDATE categories SET name = ?, slug = ?, image_url = ? WHERE id = ?',
            [name, slug, image_url, id]
        );
        return result.affectedRows > 0;
    },

    /**
     * @desc    Delete main category (subcategories deleted by FK CASCADE)
     */
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    /**
     * @desc    Subcategory: Create
     */
    createSubcategory: async (data) => {
        const { category_id, name, slug } = data;
        const [result] = await db.query(
            'INSERT INTO subcategories (category_id, name, slug) VALUES (?, ?, ?)',
            [category_id, name, slug]
        );
        return result.insertId;
    },

    /**
     * @desc    Subcategory: Update
     */
    updateSubcategory: async (id, data) => {
        const { name, slug } = data;
        const [result] = await db.query(
            'UPDATE subcategories SET name = ?, slug = ? WHERE id = ?',
            [name, slug, id]
        );
        return result.affectedRows > 0;
    },

    /**
     * @desc    Subcategory: Delete
     */
    deleteSubcategory: async (id) => {
        const [result] = await db.query('DELETE FROM subcategories WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Category;
