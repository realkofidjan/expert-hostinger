const Product = require('../models/Product');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { getAssetPath } = require('../utils/imageHandler');

/**
 * @desc    Get all products
 * @route   GET /api/products
 */
const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12; // Default 12 products per page
        const offset = (page - 1) * limit;
        const categoryId = req.query.category;
        const search = req.query.q;
        const { minPrice, maxPrice, brand, color, onSale, isFeatured } = req.query;

        const products = await Product.getAll({ 
            limit, offset, categoryId, search,
            minPrice, maxPrice, brand, color, onSale, isFeatured
        });
        const total = await Product.getTotalCount({ 
            categoryId, search,
            minPrice, maxPrice, brand, color, onSale, isFeatured
        });

        // Fetch variants for all products in the list to enable swatches
        if (products.length > 0) {
            const productIds = products.map(p => p.id);
            const [variants] = await db.query(
                'SELECT * FROM product_variants WHERE product_id IN (?)',
                [productIds]
            );
            
            // Attach variants to products
            products.forEach(p => {
                p.variants = variants.filter(v => v.product_id === p.id);
            });
        }

        res.json({
            products,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Get product by ID
 * @route   GET /api/products/:id
 */
const getProductById = async (req, res) => {
    try {
        const product = await Product.getById(req.params.id);
        console.log('CONTROLLER_GET_VARIANTS:', product ? product.variants : 'No variants');
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Create individual product
 * @route   POST /api/admin/products
 */
const createProduct = async (req, res) => {
    try {
        let { 
            name, sku, price, stock, description, specifications, category_id, 
            subcategory_id, brand, color, dimensions, 
            weight_capacity, material, fabric_type, warranty, certifications,
            is_featured,
            status, variants 
        } = req.body;

        console.log('--- PRODUCT CREATION DEBUG ---');
        console.log('Name:', name);
        console.log('Raw variants from body:', req.body.variants);

        // SKU Uniqueness Check
        const existing = await Product.getBySku(sku);
        if (existing) {
            return res.status(400).json({ error: `SKU '${sku}' already exists.` });
        }
        
        let parsedVariants = [];
        if (variants) {
            if (typeof variants === 'string') {
                try {
                    parsedVariants = JSON.parse(variants);
                    console.log('Parsed variants (string):', parsedVariants);
                } catch (e) {
                    console.error('Failed to parse variants string:', e.message);
                    parsedVariants = [];
                }
            } else if (Array.isArray(variants)) {
                parsedVariants = variants;
                console.log('Variants is already array:', parsedVariants);
            }
        }

        const productId = await Product.create({
            name, sku, 
            price: parseFloat(price) || 0,
            stock: parseInt(stock) || 0,
            description,
            specifications,
            category_id: parseInt(category_id) || null,
            subcategory_id: parseInt(subcategory_id) || null,
            brand, color, dimensions,
            weight_capacity, material, fabric_type, warranty, certifications,
            is_featured: (is_featured === 'true' || is_featured === true),
            status: status || 'active',
            variants: parsedVariants
        });

        // Handle Image Uploads
        if (req.files && req.files.length > 0) {
            const { relativeDir, absoluteDir } = getAssetPath('products', productId);
            const imageRecords = [];

            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
                const absolutePath = path.join(absoluteDir, filename);
                const relativePath = `/assets/${relativeDir}/${filename}`.replace(/\\/g, '/');

                fs.writeFileSync(absolutePath, file.buffer);
                // Set first image as primary by default
                imageRecords.push({ url: relativePath, is_primary: i === 0 ? 1 : 0 });
            }

            await Product.addImages(productId, imageRecords);
        }

        // Log action
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'CREATE_PRODUCT', `Created product ID: ${productId}, Name: ${name}`]
        );

        res.status(201).json({ message: 'Product created successfully', productId });
    } catch (error) {
        console.error('CREATE_PRODUCT_ERROR:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Update individual product
 * @route   PUT /api/admin/products/:id
 */
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        let { 
            name, sku, price, stock, description, specifications, category_id, 
            subcategory_id, brand, color, dimensions, 
            weight_capacity, material, fabric_type, warranty, certifications,
            is_featured,
            status, variants 
        } = req.body;

        // SKU Uniqueness Check (if changed)
        const currentProduct = await Product.getById(id);
        if (currentProduct.sku !== sku) {
            const existing = await Product.getBySku(sku);
            if (existing) {
                return res.status(400).json({ error: `SKU '${sku}' is already taken by another product.` });
            }
        }

        let parsedVariants = [];
        if (variants) {
            if (typeof variants === 'string') {
                try {
                    parsedVariants = JSON.parse(variants);
                } catch (e) {
                    parsedVariants = [];
                }
            } else if (Array.isArray(variants)) {
                parsedVariants = variants;
            }
        }

        await Product.update(id, {
            name, sku, 
            price: parseFloat(price) || 0,
            stock: parseInt(stock) || 0,
            description,
            specifications,
            category_id: parseInt(category_id) || null,
            subcategory_id: parseInt(subcategory_id) || null,
            brand, color, dimensions,
            weight_capacity, material, fabric_type, warranty, certifications,
            is_featured: (is_featured === 'true' || is_featured === true),
            status: status || currentProduct.status,
            variants: parsedVariants
        });

        // Handle Image Uploads
        if (req.files && req.files.length > 0) {
            const { relativeDir, absoluteDir } = getAssetPath('products', id);
            const imageRecords = [];

            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
                const absolutePath = path.join(absoluteDir, filename);
                const relativePath = `/assets/${relativeDir}/${filename}`.replace(/\\/g, '/');

                fs.writeFileSync(absolutePath, file.buffer);
                imageRecords.push({ url: relativePath, is_primary: i === 0 ? 1 : 0 });
            }

            await Product.addImages(id, imageRecords);
        }

        // Log action
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'UPDATE_PRODUCT', `Updated product ID: ${id}, Name: ${name}`]
        );

        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error('UPDATE_PRODUCT_ERROR:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/admin/products/:id
 */
const deleteProduct = async (req, res) => {
    try {
        await Product.delete(req.params.id);
        
        // Log action
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'DELETE_PRODUCT', `Deleted product ID: ${req.params.id}`]
        );

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Get bulk upload template
 */
const getTemplate = async (req, res) => {
    try {
        const XLSX = require('xlsx');
        const CategoryModel = require('../models/Category');
        const BrandModel = require('../models/Brand');

        // Fetch valid data for reference sheet
        const categories = await CategoryModel.getAll();
        const brands = await BrandModel.getAll();

        const mainData = [
            ["Name", "SKU", "Price", "Stock", "Category", "Subcategory", "Brand", "Description", "Image URLs", "Variants"],
            ["Ergonomic Executive Chair", "EXE-CHR-001", 12500.00, 50, "Furniture", "Executive Chairs", "Expert", "Premium ergonomic chair with lumbar support", "https://photos.app.goo.gl/example1, https://photos.app.goo.gl/example2", "Black:20, Grey:15, Blue:15"]
        ];

        const refData = [["Valid Categories", "Valid Subcategories", "Valid Brands"]];
        
        // Populate reference data
        categories.forEach(cat => {
            refData.push([cat.name, "", ""]);
            cat.subcategories.forEach(sub => {
                refData.push(["", sub.name, ""]);
            });
        });
        brands.forEach((brand, idx) => {
            if (refData[idx + 1]) {
                refData[idx + 1][2] = brand.name;
            } else {
                refData.push(["", "", brand.name]);
            }
        });

        const wb = XLSX.utils.book_new();
        const wsMain = XLSX.utils.aoa_to_sheet(mainData);
        const wsRef = XLSX.utils.aoa_to_sheet(refData);

        XLSX.utils.book_append_sheet(wb, wsMain, "Inventory Sheet");
        XLSX.utils.book_append_sheet(wb, wsRef, "System Reference");
        
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename=expert_master_template.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('TEMPLATE_GEN_ERROR:', error);
        res.status(500).json({ error: 'Failed to generate template', details: error.message });
    }
};

/**
 * @desc    Get product metadata (min/max price, available colors) for filters
 * @route   GET /api/products/meta
 */
const getProductMeta = async (req, res) => {
    try {
        // Get min/max price
        const [priceResult] = await db.query('SELECT MIN(price) as minPrice, MAX(price) as maxPrice FROM products');
        
        // Get all unique colors from variants table only
        const [variantColors] = await db.query('SELECT DISTINCT color_name FROM product_variants WHERE color_name IS NOT NULL AND color_name != ""');
        
        const allColors = new Set();
        variantColors.forEach(c => allColors.add(c.color_name.trim()));
        
        res.json({
            minPrice: parseFloat(priceResult[0].minPrice) || 0,
            maxPrice: parseFloat(priceResult[0].maxPrice) || 50000,
            colors: Array.from(allColors).sort()
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getTemplate,
    getProductMeta
};
