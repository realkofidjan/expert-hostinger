const db = require('../config/db');

const Product = {
    /**
     * @desc    Create a new product
     * @param   {object} productData
     * @returns {number} insertId
     */
    create: async (productData) => {
        const { 
            name, sku, description, price, stock, category_id, 
            subcategory_id, brand, color, dimensions, 
            weight_capacity, material, fabric_type, warranty, certifications,
            is_featured = false, status = 'active',
            variants = []
        } = productData;

        // Calculate total stock if variants provided
        let totalStock = stock || 0;
        if (variants && variants.length > 0) {
            totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock_quantity) || 0), 0);
        }

        const [result] = await db.query(
            `INSERT INTO products 
            (name, sku, description, specifications, price, stock, category_id, subcategory_id, brand, color, dimensions, weight_capacity, material, fabric_type, warranty, certifications, is_featured, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, sku, description, productData.specifications || null, price, totalStock, 
                category_id || null, subcategory_id || null, brand, color, dimensions, 
                productData.weight_capacity || null, productData.material || null, 
                productData.fabric_type || null, productData.warranty || null, 
                productData.certifications || null, is_featured, status || 'active'
            ]
        );

        const productId = result.insertId;

        // Add variants if any
        if (variants && variants.length > 0) {
            for (const v of variants) {
                await db.query(
                    'INSERT INTO product_variants (product_id, color_name, color_code, dimensions, stock_quantity, sku) VALUES (?, ?, ?, ?, ?, ?)',
                    [productId, v.color_name, v.color_code || null, v.dimensions || null, v.stock_quantity || 0, v.sku || `${sku}-${v.color_name}-${v.dimensions || 'std'}`.replace(/\s+/g, '_')]
                );
            }
        }

        return productId;
    },

    /**
     * @desc    Update product details
     * @param   {number|string} id
     * @param   {object} data
     */
    update: async (id, data) => {
        const { 
            name, sku, description, price, stock, category_id, 
            subcategory_id, brand, color, dimensions, 
            weight_capacity, material, fabric_type, warranty, certifications,
            is_featured, status,
            variants
        } = data;

        // Calculate total stock if variants provided
        let totalStock = stock;
        if (variants !== undefined && variants !== null) {
            totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock_quantity) || 0), 0);
        }

        const [result] = await db.query(
            `UPDATE products SET 
            name = ?, sku = ?, description = ?, specifications = ?, price = ?, stock = ?, category_id = ?, 
            subcategory_id = ?, brand = ?, color = ?, dimensions = ?, weight_capacity = ?, material = ?, 
            fabric_type = ?, warranty = ?, certifications = ?, is_featured = ?, status = ? 
            WHERE id = ?`,
            [
                name, sku, description, data.specifications || null, price, totalStock, category_id, 
                subcategory_id, brand, color, dimensions, weight_capacity || null, material || null, 
                fabric_type || null, warranty || null, certifications || null, is_featured, status, id
            ]
        );

        // Sync variants if provided
        if (variants !== undefined) {
            // Delete old variants
            await db.query('DELETE FROM product_variants WHERE product_id = ?', [id]);
            // Insert new ones
            if (variants && variants.length > 0) {
                for (const v of variants) {
                    await db.query(
                        'INSERT INTO product_variants (product_id, color_name, color_code, dimensions, stock_quantity, sku) VALUES (?, ?, ?, ?, ?, ?)',
                        [id, v.color_name, v.color_code || null, v.dimensions || null, v.stock_quantity || 0, v.sku || `${sku}-${v.color_name}-${v.dimensions || 'std'}`.replace(/\s+/g, '_')]
                    );
                }
            }
        }

        return result.affectedRows > 0;
    },

    /**
     * @desc    Get all products with primary image
     * @returns {Array} products
     */
    getAll: async ({ limit, offset, categoryId, search, status = 'active', ...reqFilters } = {}) => {
        let sql = `
            SELECT p.*, c.name as category_name, s.name as subcategory_name,
                   (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
                   (SELECT CASE WHEN sal.type = 'percentage' THEN ROUND(GREATEST(0, p.price * (1 - sal.value/100)), 2)
                                ELSE ROUND(GREATEST(0, p.price - sal.value), 2) END
                    FROM sales sal
                    WHERE sal.is_active = 1 AND NOW() BETWEEN sal.starts_at AND sal.ends_at
                      AND (sal.scope = 'all'
                        OR (sal.scope = 'products' AND JSON_CONTAINS(sal.target_ids, CAST(p.id AS CHAR)))
                        OR (sal.scope = 'categories' AND JSON_CONTAINS(sal.target_ids, CAST(p.category_id AS CHAR))))
                    ORDER BY CASE sal.scope WHEN 'products' THEN 1 WHEN 'categories' THEN 2 ELSE 3 END, sal.value DESC
                    LIMIT 1) as sale_price,
                   (SELECT sal.name
                    FROM sales sal
                    WHERE sal.is_active = 1 AND NOW() BETWEEN sal.starts_at AND sal.ends_at
                      AND (sal.scope = 'all'
                        OR (sal.scope = 'products' AND JSON_CONTAINS(sal.target_ids, CAST(p.id AS CHAR)))
                        OR (sal.scope = 'categories' AND JSON_CONTAINS(sal.target_ids, CAST(p.category_id AS CHAR))))
                    ORDER BY CASE sal.scope WHEN 'products' THEN 1 WHEN 'categories' THEN 2 ELSE 3 END, sal.value DESC
                    LIMIT 1) as active_sale_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN subcategories s ON p.subcategory_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            sql += " AND p.status = ?";
            params.push(status);
        }

        if (categoryId && categoryId !== 'all') {
            sql += " AND p.category_id = ?";
            params.push(categoryId);
        }

        if (search) {
            sql += " AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)";
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (reqFilters?.minPrice) {
            sql += " AND p.price >= ?";
            params.push(parseFloat(reqFilters.minPrice));
        }

        if (reqFilters?.maxPrice) {
            sql += " AND p.price <= ?";
            params.push(parseFloat(reqFilters.maxPrice));
        }

        if (reqFilters?.brand) {
            sql += " AND p.brand = ?";
            params.push(reqFilters.brand);
        }

        if (reqFilters?.color) {
            sql += " AND (p.color = ? OR EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.color_name = ?))";
            params.push(reqFilters.color, reqFilters.color);
        }

        if (reqFilters?.onSale === 'true') {
            sql += ` AND EXISTS (
                SELECT 1 FROM sales sal
                WHERE sal.is_active = 1 AND NOW() BETWEEN sal.starts_at AND sal.ends_at
                  AND (sal.scope = 'all'
                    OR (sal.scope = 'products' AND JSON_CONTAINS(sal.target_ids, CAST(p.id AS CHAR)))
                    OR (sal.scope = 'categories' AND JSON_CONTAINS(sal.target_ids, CAST(p.category_id AS CHAR))))
            )`;
        }

        if (reqFilters?.isFeatured === 'true') {
            sql += " AND p.is_featured = 1";
        }

        sql += " ORDER BY p.created_at DESC";

        if (limit !== undefined) {
            sql += " LIMIT ? OFFSET ?";
            params.push(parseInt(limit), parseInt(offset || 0));
        }

        const [rows] = await db.query(sql, params);
        return rows;
    },

    getTotalCount: async ({ categoryId, search, status = 'active', ...reqFilters } = {}) => {
        let sql = "SELECT COUNT(*) as count FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1";
        const params = [];

        if (status) {
            sql += " AND p.status = ?";
            params.push(status);
        }

        if (categoryId && categoryId !== 'all') {
            sql += " AND p.category_id = ?";
            params.push(categoryId);
        }

        if (search) {
            sql += " AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)";
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (reqFilters?.minPrice) {
            sql += " AND p.price >= ?";
            params.push(parseFloat(reqFilters.minPrice));
        }

        if (reqFilters?.maxPrice) {
            sql += " AND p.price <= ?";
            params.push(parseFloat(reqFilters.maxPrice));
        }

        if (reqFilters?.brand) {
            sql += " AND p.brand = ?";
            params.push(reqFilters.brand);
        }

        if (reqFilters?.color) {
            sql += " AND (p.color = ? OR EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.color_name = ?))";
            params.push(reqFilters.color, reqFilters.color);
        }

        if (reqFilters?.onSale === 'true') {
            sql += ` AND EXISTS (
                SELECT 1 FROM sales sal
                WHERE sal.is_active = 1 AND NOW() BETWEEN sal.starts_at AND sal.ends_at
                  AND (sal.scope = 'all'
                    OR (sal.scope = 'products' AND JSON_CONTAINS(sal.target_ids, CAST(p.id AS CHAR)))
                    OR (sal.scope = 'categories' AND JSON_CONTAINS(sal.target_ids, CAST(p.category_id AS CHAR))))
            )`;
        }

        if (reqFilters?.isFeatured === 'true') {
            sql += " AND p.is_featured = 1";
        }

        const [rows] = await db.query(sql, params);
        return rows[0].count;
    },

    /**
     * @desc    Get product by ID with all images
     * @param   {number|string} id
     */
    getById: async (id) => {
        const [rows] = await db.query(`
            SELECT p.*,
                   (SELECT CASE WHEN sal.type = 'percentage' THEN ROUND(GREATEST(0, p.price * (1 - sal.value/100)), 2)
                                ELSE ROUND(GREATEST(0, p.price - sal.value), 2) END
                    FROM sales sal
                    WHERE sal.is_active = 1 AND NOW() BETWEEN sal.starts_at AND sal.ends_at
                      AND (sal.scope = 'all'
                        OR (sal.scope = 'products' AND JSON_CONTAINS(sal.target_ids, CAST(p.id AS CHAR)))
                        OR (sal.scope = 'categories' AND JSON_CONTAINS(sal.target_ids, CAST(p.category_id AS CHAR))))
                    ORDER BY CASE sal.scope WHEN 'products' THEN 1 WHEN 'categories' THEN 2 ELSE 3 END, sal.value DESC
                    LIMIT 1) as sale_price,
                   (SELECT sal.name
                    FROM sales sal
                    WHERE sal.is_active = 1 AND NOW() BETWEEN sal.starts_at AND sal.ends_at
                      AND (sal.scope = 'all'
                        OR (sal.scope = 'products' AND JSON_CONTAINS(sal.target_ids, CAST(p.id AS CHAR)))
                        OR (sal.scope = 'categories' AND JSON_CONTAINS(sal.target_ids, CAST(p.category_id AS CHAR))))
                    ORDER BY CASE sal.scope WHEN 'products' THEN 1 WHEN 'categories' THEN 2 ELSE 3 END, sal.value DESC
                    LIMIT 1) as active_sale_name
            FROM products p WHERE p.id = ?`, [id]);
        if (rows.length === 0) return null;

        const product = rows[0];

        // Fetch images
        const [images] = await db.query('SELECT image_url, is_primary FROM product_images WHERE product_id = ?', [id]);
        product.images = images;

        // Fetch variants
        const [variants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [id]);
        product.variants = variants;
        
        return product;
    },

    /**
     * @desc    Delete product
     * @param   {number|string} id
     */
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    /**
     * @desc    Image Management: Add product images
     * @param   {number|string} productId
     * @param   {Array} urls [{ url: string, is_primary: boolean }]
     */
    addImages: async (productId, images) => {
        for (const img of images) {
            await db.query(
                'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
                [productId, img.url, img.is_primary || false]
            );
        }
    },

    /**
     * @desc    Image Management: Delete specific image
     * @param   {number|string} productId
     * @param   {string} imageUrl
     */
    deleteImage: async (productId, imageUrl) => {
        await db.query('DELETE FROM product_images WHERE product_id = ? AND image_url = ?', [productId, imageUrl]);
    },

    /**
     * @desc    Get product by SKU
     * @param   {string} sku
     */
    getBySku: async (sku) => {
        const [rows] = await db.query('SELECT * FROM products WHERE sku = ?', [sku]);
        return rows[0] || null;
    },

    /**
     * @desc    Get all active SKUs in the system
     * @returns {Array} List of SKU strings
     */
    getAllSkus: async () => {
        const [rows] = await db.query('SELECT sku FROM products');
        return rows.map(r => r.sku);
    },

    /**
     * @desc    Get total count of products
     */
    getCount: async () => {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM products');
        return rows[0].count;
    }
};

module.exports = Product;
