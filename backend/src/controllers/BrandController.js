const Brand = require('../models/Brand');
const db = require('../config/db');

const getAllBrands = async (req, res) => {
    try {
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const q = req.query.q || '';

        const params = [];
        let where = '';
        if (q) { where = 'WHERE name LIKE ?'; params.push(`%${q}%`); }

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM brands ${where}`, params);
        const [brands] = await db.query(
            `SELECT * FROM brands ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        res.json({ brands, pagination: { total, pages: Math.ceil(total / limit), currentPage: page, limit } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch brands' });
    }
};

const { getAssetPath } = require('../utils/imageHandler');
const { optimizeImage } = require('../utils/imageOptimizer');
const fs = require('fs');
const path = require('path');

const createBrand = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        
        let logoPath = null;
        if (req.file) {
            const { relativeDir, absoluteDir } = getAssetPath('brands');
            const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
            const absolutePath = path.join(absoluteDir, filename);
            await optimizeImage(req.file.buffer, absolutePath);
            logoPath = `/assets/${relativeDir}/${filename}`.replace(/\\/g, '/');
        }

        const brandId = await Brand.create({
            name,
            slug,
            logo: logoPath
        });

        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'CREATE_BRAND', `Created brand: ${name}`]
        );
        res.status(201).json({
            message: 'Brand created successfully',
            brandId
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Brand already exists' });
        }
        res.status(500).json({ error: 'Failed to create brand' });
    }
};

const deleteBrand = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (brand && brand.logo) {
             // Optional: delete file logic could be added here
        }
        const success = await Brand.delete(req.params.id);
        if (!success) return res.status(404).json({ error: 'Brand not found' });
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'DELETE_BRAND', `Deleted brand: ${brand ? brand.name : req.params.id}`]
        );
        res.json({ message: 'Brand deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete brand' });
    }
};

const updateBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        
        let logoPath = req.body.logo; // Keep existing if no new file
        if (req.file) {
            const { relativeDir, absoluteDir } = getAssetPath('brands');
            const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
            const absolutePath = path.join(absoluteDir, filename);
            await optimizeImage(req.file.buffer, absolutePath);
            logoPath = `/assets/${relativeDir}/${filename}`.replace(/\\/g, '/');
        }

        const success = await Brand.update(id, {
            name,
            slug,
            logo: logoPath
        });

        if (!success) return res.status(404).json({ error: 'Brand not found' });

        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'UPDATE_BRAND', `Updated brand: ${name}`]
        );
        res.json({ message: 'Brand updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update brand' });
    }
};

module.exports = {
    getAllBrands,
    createBrand,
    deleteBrand,
    updateBrand
};
