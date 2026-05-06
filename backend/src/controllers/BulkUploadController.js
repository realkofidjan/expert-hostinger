const ProductModel = require('../models/Product');
const CategoryModel = require('../models/Category');
const BrandModel = require('../models/Brand');
const db = require('../config/db');
const xlsx = require('xlsx');
const { resolveImageUrls, downloadImage } = require('../utils/googlePhotos');
const { getAssetPath } = require('../utils/imageHandler');
const path = require('path');
const fs = require('fs-extra');

/**
 * Helper to get all relevant mappings from DB
 */
const getSystemMappings = async () => {
    // 1. Categories & Subcategories
    const categories = await CategoryModel.getAll();
    const categoryMap = {}; // name -> { id, subs: { name -> id } }
    
    categories.forEach(cat => {
        const subMap = {};
        cat.subcategories.forEach(sub => {
            subMap[sub.name.toLowerCase().trim()] = sub.id;
        });
        categoryMap[cat.name.toLowerCase().trim()] = { id: cat.id, subcategories: subMap };
    });
    
    // 2. Brands
    const brands = await BrandModel.getAll();
    const brandMap = {}; // name -> id OR string (depending on if we store as ID or Name)
    // Looking at products table, brand is typically a VARCHAR. Let's see if there's a brand_id.
    // Based on index.js, there is a BrandController, so let's pre-fetch their names for validation.
    const validBrandNames = new Set(brands.map(b => b.name.toLowerCase().trim()));
    
    return { categoryMap, validBrandNames };
};

/**
 * @desc    Stage 1: Preflight Validation
 */
const validateUpload = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        if (data.length === 0) throw new Error('Excel file is empty.');

        const validatedRows = [];
        let totalErrors = 0;

        const existingSkus = await ProductModel.getAllSkus();
        const seenInFile = new Set();
        const { categoryMap, validBrandNames } = await getSystemMappings();

        for (const row of data) {
            const errors = [];
            
            // Basic fields & type handling
            const name = (row.Name || row.name || '').toString().trim();
            const sku = (row.SKU || row.sku || '').toString().trim();
            const brandInput = (row.Brand || row.brand || '').toString().trim();
            const catNameInput = (row.Category || row.category || '').toString().toLowerCase().trim();
            const subCatNameInput = (row.Subcategory || row.subcategory || '').toString().toLowerCase().trim();

            if (!name) errors.push('Missing Name');
            if (!sku) {
                errors.push('Missing SKU');
            } else {
                if (existingSkus.includes(sku)) errors.push('SKU exists in database');
                if (seenInFile.has(sku)) errors.push('Duplicate SKU in file');
                seenInFile.add(sku);
            }

            // Category & Subcategory Resolution (Names Only)
            let resolvedCatId = null;
            let resolvedSubCatId = null;

            if (catNameInput) {
                const catMatch = categoryMap[catNameInput];
                if (catMatch) {
                    resolvedCatId = catMatch.id;
                    if (subCatNameInput) {
                        const subCatMatch = catMatch.subcategories[subCatNameInput];
                        if (subCatMatch) {
                            resolvedSubCatId = subCatMatch;
                        } else {
                            errors.push(`Subcategory '${subCatNameInput}' not found under '${catNameInput}'`);
                        }
                    }
                } else {
                    errors.push(`Category '${catNameInput}' not found`);
                }
            } else {
                errors.push('Category Name is required');
            }

            // Brand Validation
            if (brandInput && !validBrandNames.has(brandInput.toLowerCase())) {
                errors.push(`Brand '${brandInput}' not found`);
            }

            // Variants parsing — supports:
            //   Color              (e.g. "Black")
            //   Color:Dimensions   (e.g. "Black:120x60cm")
            const variants = [];
            const rawVariants = row.Variants || row.variants || '';
            if (rawVariants) {
                const pairs = rawVariants.split(',').map(p => p.trim());
                for (const pair of pairs) {
                    const parts = pair.split(':').map(s => s?.trim());
                    if (parts.length === 1) {
                        const [vColor] = parts;
                        if (!vColor) {
                            errors.push(`Invalid Variant: ${pair}`);
                        } else {
                            variants.push({ color_name: vColor, dimensions: null });
                        }
                    } else if (parts.length === 2) {
                        const [vColor, vDimensions] = parts;
                        if (!vColor) {
                            errors.push(`Invalid Variant: ${pair}`);
                        } else {
                            variants.push({ color_name: vColor, dimensions: vDimensions || null });
                        }
                    } else {
                        errors.push(`Invalid Variant format: ${pair} (expected Color or Color:Dimensions)`);
                    }
                }
            }

            const rawImages = row.Images || row.images || row['Image URLs'] || '';
            const imageUrls = rawImages ? rawImages.split(',').map(u => u.trim()) : [];

            validatedRows.push({
                ...row,
                name, sku,
                brand: brandInput,
                category_id: resolvedCatId,
                subcategory_id: resolvedSubCatId,
                variants,
                imageUrls,
                isValid: errors.length === 0,
                errors
            });

            if (errors.length > 0) totalErrors++;
        }

        res.json({
            summary: { total: data.length, valid: data.length - totalErrors, errors: totalErrors },
            rows: validatedRows
        });
    } catch (error) {
        console.error('VALIDATION_ERROR:', error);
        res.status(500).json({ error: 'Validation failed', details: error.message });
    }
};

/**
 * @desc    Stage 2: Confirm and Import
 */
const confirmUpload = async (req, res) => {
    const { products } = req.body;
    if (!products || !Array.isArray(products)) return res.status(400).json({ error: 'No data' });

    const results = { success: [], errors: [] };

    for (const product of products) {
        try {
            if (!product.isValid) {
                results.errors.push({ name: product.name, sku: product.sku, error: 'Validation failed' });
                continue;
            }

            const productId = await ProductModel.create({
                name: product.name,
                sku: product.sku,
                description: product.Description || product.description || '',
                category_id: product.category_id,
                subcategory_id: product.subcategory_id,
                brand: product.brand,
                color: product.Color || product.color || '',
                dimensions: product.Dimensions || product.dimensions || '',
                material: product.Material || product.material || '',
                weight_capacity: product['Weight Capacity'] || product.weight_capacity || null,
                fabric_type: product['Fabric Type'] || product.fabric_type || null,
                warranty: product.Warranty || product.warranty || null,
                certifications: product.Certifications || product.certifications || null,
                variants: product.variants,
                is_featured: product['Is Featured'] === true || product['Is Featured'] === 'true' || product.is_featured === true || product.is_featured === 'true'
            });

            if (product.imageUrls?.length > 0) {
                const { relativeDir, absoluteDir } = getAssetPath('products', productId);
                const imageRecords = [];
                let seq = 1;

                for (const rowUrl of product.imageUrls) {
                    try {
                        const directUrls = await resolveImageUrls(rowUrl);
                        for (const directUrl of directUrls) {
                            const filename = `${Date.now()}-${seq}-${product.sku}.jpg`;
                            const outputPath = path.join(absoluteDir, filename);
                            await downloadImage(directUrl, outputPath);
                            imageRecords.push({ url: `/assets/${relativeDir}/${filename}`.replace(/\\/g, '/'), is_primary: seq === 1 });
                            seq++;
                            if (seq > 20) break;
                        }
                        if (seq > 20) break;
                    } catch (err) { console.error(`Img Download Failed: ${rowUrl}`, err.message); }
                }

                if (imageRecords.length > 0) await ProductModel.addImages(productId, imageRecords);
            }

            results.success.push({ name: product.name, sku: product.sku });
        } catch (err) {
            results.errors.push({ name: product.name, sku: product.sku, error: err.message });
        }
    }

    // Log the bulk import action
    try {
        const successSkus = results.success.map(p => p.sku).join(', ');
        const failedSkus = results.errors.map(p => p.sku).join(', ');
        const context = `Bulk imported ${results.success.length}/${products.length} products. ` +
            (successSkus ? `Imported: ${successSkus}. ` : '') +
            (failedSkus ? `Failed: ${failedSkus}.` : '');
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'BULK_IMPORT', context]
        );
    } catch (logErr) {
        console.error('BULK_IMPORT_LOG_ERROR:', logErr.message);
    }

    console.log(`BULK_SYNC: ${results.success.length} OK, ${results.errors.length} ERR`);
    res.json({
        summary: { total: products.length, success: results.success.length, failed: results.errors.length },
        success: results.success,
        errors: results.errors
    });
};

const getProductCount = async (req, res) => {
    try {
        const count = await ProductModel.getCount();
        res.json({ count });
    } catch (err) { res.status(500).json({ error: 'Server error', details: err.message }); }
};

module.exports = { validateUpload, confirmUpload, getProductCount };
