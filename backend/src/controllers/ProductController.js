const Product = require('../models/Product');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { getAssetPath } = require('../utils/imageHandler');
const { optimizeImage } = require('../utils/imageOptimizer');
const { getIo } = require('../utils/socket');

/* ─── Sale helpers (no JSON SQL functions — pure JS) ────────────────────────
   Fetches all currently active sales and returns a function that resolves
   the best sale for a given product row { id, price, category_id }.
──────────────────────────────────────────────────────────────────────────────*/
const getActiveSales = async () => {
    const [rows] = await db.query(
        `SELECT id, name, type, value, scope, target_ids
         FROM sales
         WHERE is_active = 1 AND NOW() BETWEEN starts_at AND ends_at`
    );
    return rows.map(s => ({
        ...s,
        targetIds: (() => {
            try {
                const parsed = typeof s.target_ids === 'string'
                    ? JSON.parse(s.target_ids)
                    : (s.target_ids || []);
                return parsed.map(Number);
            } catch { return []; }
        })()
    }));
};

const applySaleToProduct = (product, activeSales) => {
    const pid = Number(product.id);
    const cid = Number(product.category_id);
    const price = parseFloat(product.price);

    // Priority: product-specific > category > all
    const match =
        activeSales.find(s => s.scope === 'products' && s.targetIds.includes(pid)) ||
        activeSales.find(s => s.scope === 'categories' && s.targetIds.includes(cid)) ||
        activeSales.find(s => s.scope === 'all');

    if (match) {
        product.sale_price = match.type === 'percentage'
            ? Math.round(Math.max(0, price * (1 - match.value / 100)) * 100) / 100
            : Math.round(Math.max(0, price - match.value) * 100) / 100;
        product.active_sale_name = match.name;
    }
    return product;
};

/**
 * @desc    Get all products
 * @route   GET /api/products
 */
const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;
        const categoryId = req.query.category;
        const search = req.query.q;
        const { minPrice, maxPrice, brand, color, onSale, isFeatured } = req.query;

        // Resolve active sales in JS — no MySQL JSON functions needed
        const activeSales = await getActiveSales();

        // For onSale filter: compute which product IDs are on sale, then pass to query
        let saleProductIds = undefined;
        if (onSale === 'true') {
            if (activeSales.length === 0) {
                return res.json({ products: [], pagination: { total: 0, pages: 0, currentPage: page, limit } });
            }
            const hasAll = activeSales.some(s => s.scope === 'all');
            if (!hasAll) {
                // Fetch all product IDs and filter against active sales
                const [allProds] = await db.query('SELECT id, category_id FROM products WHERE status = "active"');
                saleProductIds = allProds
                    .filter(p => {
                        const pid = Number(p.id), cid = Number(p.category_id);
                        return activeSales.some(s =>
                            (s.scope === 'products' && s.targetIds.includes(pid)) ||
                            (s.scope === 'categories' && s.targetIds.includes(cid))
                        );
                    })
                    .map(p => p.id);
                if (saleProductIds.length === 0) {
                    return res.json({ products: [], pagination: { total: 0, pages: 0, currentPage: page, limit } });
                }
            }
        }

        const products = await Product.getAll({
            limit, offset, categoryId, search,
            minPrice, maxPrice, brand, color, isFeatured, saleProductIds
        });
        const total = await Product.getTotalCount({
            categoryId, search,
            minPrice, maxPrice, brand, color, isFeatured, saleProductIds
        });

        // Attach variants + sale prices
        if (products.length > 0) {
            const productIds = products.map(p => p.id);
            const [variants] = await db.query(
                'SELECT * FROM product_variants WHERE product_id IN (?)',
                [productIds]
            );
            products.forEach(p => {
                p.variants = variants.filter(v => v.product_id === p.id);
                applySaleToProduct(p, activeSales);
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
        if (!product) return res.status(404).json({ error: 'Product not found' });
        // Apply active sale in JS
        const activeSales = await getActiveSales();
        applySaleToProduct(product, activeSales);
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

                const savedPath = await optimizeImage(file.buffer, absolutePath);
                const savedFilename = path.basename(savedPath);
                const relativePath = `/assets/${relativeDir}/${savedFilename}`.replace(/\\/g, '/');

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

        const io = getIo();
        if (io) io.emit('admin_products_updated', { action: 'created', productId });
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

        // Handle Image Deletions (Gallery Pruning)
        if (req.body.deleted_image_urls) {
            try {
                const toDelete = JSON.parse(req.body.deleted_image_urls);
                if (Array.isArray(toDelete) && toDelete.length > 0) {
                    for (const url of toDelete) {
                        const absPath = path.join(__dirname, '../../assets', url.replace('/assets/', ''));
                        if (fs.existsSync(absPath)) try { fs.unlinkSync(absPath); } catch {}
                        await Product.deleteImage(id, url);
                    }
                }
            } catch (e) {
                console.warn('Pruning images failed:', e.message);
            }
        }

        // Handle New Image Uploads
        if (req.files && req.files.length > 0) {
            const { relativeDir, absoluteDir } = getAssetPath('products', id);
            const imageRecords = [];

            // Check if we need to set a primary image (if none exist or all were deleted)
            const currentImages = await Product.getById(id);
            const hasPrimary = currentImages?.images?.some(img => img.is_primary);

            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
                const absolutePath = path.join(absoluteDir, filename);

                const savedPath = await optimizeImage(file.buffer, absolutePath);
                const savedFilename = path.basename(savedPath);
                const relativePath = `/assets/${relativeDir}/${savedFilename}`.replace(/\\/g, '/');

                // Set as primary only if no primary exists and it's the first in this batch
                imageRecords.push({ url: relativePath, is_primary: (!hasPrimary && i === 0) ? 1 : 0 });
            }

            await Product.addImages(id, imageRecords);
        }

        // Log action
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'UPDATE_PRODUCT', `Updated product ID: ${id}, Name: ${name}`]
        );

        const io = getIo();
        if (io) io.emit('admin_products_updated', { action: 'updated', productId: id });
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
        const id = req.params.id;
        const product = await Product.getById(id);
        
        if (product && product.images) {
            // Surgically purge all associated image files
            product.images.forEach(img => {
                const absPath = path.join(__dirname, '../../assets', img.image_url.replace('/assets/', ''));
                if (fs.existsSync(absPath)) try { fs.unlinkSync(absPath); } catch {}
            });
        }

        await Product.delete(id);
        
        // Log action
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'DELETE_PRODUCT', `Deleted product ID: ${req.params.id}`]
        );

        const io = getIo();
        if (io) io.emit('admin_products_updated', { action: 'deleted', productId: req.params.id });
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
            ["Ergonomic Executive Chair", "EXE-CHR-001", 12500.00, "", "Furniture", "Executive Chairs", "Expert", "Premium ergonomic chair with lumbar support", "https://photos.app.goo.gl/example1", "Black:120x60x75cm:20, Black:160x80x75cm:10, Grey:120x60x75cm:15"],
            ["Office Side Table", "SIDE-TBL-001", 4500.00, "", "Furniture", "Tables", "Expert", "Compact side table", "", "White:30, Brown:25"]
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
