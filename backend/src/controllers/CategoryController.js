const Category = require('../models/Category');
const db = require('../config/db');

const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.getAll();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name, image_url } = req.body;
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const categoryId = await Category.create({ name, slug, image_url });

        // Log action
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'CREATE_CATEGORY', `Created category: ${name} (ID: ${categoryId})`]
        );

        res.status(201).json({ message: 'Category created successfully', categoryId });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, image_url } = req.body;
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        await Category.update(id, { name, slug, image_url });

        // Log action
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'UPDATE_CATEGORY', `Updated category ID: ${id}`]
        );

        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await Category.delete(id);

        // Log action
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'DELETE_CATEGORY', `Deleted category ID: ${id}`]
        );

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// Subcategory Handlers
const createSubcategory = async (req, res) => {
    try {
        const { category_id, name } = req.body;
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const subcategoryId = await Category.createSubcategory({ category_id, name, slug });

        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'CREATE_SUBCATEGORY', `Created subcategory: ${name} (ID: ${subcategoryId})`]
        );

        res.status(201).json({ message: 'Subcategory created successfully', subcategoryId });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const updateSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        await Category.updateSubcategory(id, { name, slug });

        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'UPDATE_SUBCATEGORY', `Updated subcategory ID: ${id}`]
        );

        res.json({ message: 'Subcategory updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

const deleteSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        await Category.deleteSubcategory(id);

        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'DELETE_SUBCATEGORY', `Deleted subcategory ID: ${id}`]
        );

        res.json({ message: 'Subcategory deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

module.exports = {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory
};
