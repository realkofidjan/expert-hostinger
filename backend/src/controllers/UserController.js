const User = require('../models/User');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../../assets');
const STORAGE_LIMIT = 50 * 1024 * 1024 * 1024; // 50 GB

const getDirSize = (dirPath) => {
  let size = 0;
  try {
    if (!fs.existsSync(dirPath)) return 0;
    for (const file of fs.readdirSync(dirPath)) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) size += stat.size;
      else if (stat.isDirectory()) size += getDirSize(filePath);
    }
  } catch (e) { /* ignore */ }
  return size;
};

// Pre-computed storage — never blocks a request
let _storageCache = { used: 0, limit: STORAGE_LIMIT, percent: '0.00' };

const refreshStorage = () => {
  try {
    const used = getDirSize(ASSETS_DIR);
    _storageCache = { used, limit: STORAGE_LIMIT, percent: ((used / STORAGE_LIMIT) * 100).toFixed(2) };
  } catch (e) { /* keep last cached value */ }
};

// Compute once on startup (deferred so it doesn't block server init)
setTimeout(refreshStorage, 500);
// Then refresh every 5 minutes
setInterval(refreshStorage, 5 * 60 * 1000);

/**
 * @desc    Get all administrative users
 * @route   GET /api/auth/users
 */
const getAllUsers = async (req, res) => {
    try {
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const q = req.query.q || '';

        const params = [];
        let where = '';
        if (q) {
            where = 'WHERE email LIKE ? OR full_name LIKE ?';
            params.push(`%${q}%`, `%${q}%`);
        }

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users ${where}`, params);
        const [users] = await db.query(
            `SELECT id, full_name, email, role, status, phone, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        res.json({ users, pagination: { total, pages: Math.ceil(total / limit), currentPage: page, limit } });
    } catch (error) {
        console.error('GET_USERS_ERROR:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Get counts and recent activity for dashboard
 * @route   GET /api/admin/stats
 */
const getStats = async (req, res) => {
    try {
        // Run all DB queries in parallel
        const [
            [userCount],
            [customerCount],
            [productCount],
            [orderCount],
            [pendingOrderCount],
            [quoteCount],
            [lowStockProducts],
            [lowStockCount],
            [recentOrders],
            [revenueTotal],
            [revenueMonth],
            [bestSellingProducts],
        ] = await Promise.all([
            db.query('SELECT COUNT(*) as count FROM users'),
            db.query('SELECT COUNT(*) as count FROM users WHERE role = "customer"'),
            db.query('SELECT COUNT(*) as count FROM products'),
            db.query('SELECT COUNT(*) as count FROM orders'),
            db.query('SELECT COUNT(*) as count FROM orders WHERE status = "pending"'),
            db.query('SELECT COUNT(*) as count FROM quotes'),
            db.query(`
                SELECT p.id, p.name, p.stock, c.name as category
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.stock < 10
                ORDER BY p.stock ASC
                LIMIT 5
            `),
            db.query('SELECT COUNT(*) as count FROM products WHERE stock < 10'),
            db.query(`
                SELECT o.*, u.full_name, u.email, u.phone
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                ORDER BY o.created_at DESC
                LIMIT 5
            `),
            db.query(`
                SELECT COALESCE(SUM(total_amount), 0) as total
                FROM orders
                WHERE payment_status IN ('paid', 'verified')
            `),
            db.query(`
                SELECT COALESCE(SUM(total_amount), 0) as total
                FROM orders
                WHERE payment_status IN ('paid', 'verified')
                AND MONTH(created_at) = MONTH(CURRENT_DATE())
                AND YEAR(created_at) = YEAR(CURRENT_DATE())
            `),
            db.query(`
                SELECT p.id, p.name, p.primary_image, SUM(oi.quantity) as sold_qty, SUM(oi.subtotal) as total_revenue
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.payment_status IN ('paid', 'verified')
                GROUP BY p.id
                ORDER BY sold_qty DESC
                LIMIT 5
            `),
        ]);

        const storage = _storageCache;

        res.json({
            totalUsers: userCount[0].count,
            totalCustomers: customerCount[0].count,
            totalProducts: productCount[0].count,
            totalOrders: orderCount[0].count,
            pendingOrders: pendingOrderCount[0].count,
            totalQuotes: quoteCount[0].count,
            storage,
            lowStockProducts,
            lowStockCount: lowStockCount[0].count,
            recentOrders,
            financials: {
                totalRevenue: revenueTotal[0].total,
                thisMonthRevenue: revenueMonth[0].total
            },
            bestSellingProducts
        });
    } catch (error) {
        console.error('GET_STATS_ERROR:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Update administrative user
 * @route   PUT /api/admin/users/:id
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, status } = req.body;

        // Protection: Don't allow editing admins through this endpoint
        const [targetUser] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
        if (targetUser && targetUser[0] && targetUser[0].role === 'admin') {
            return res.status(403).json({ error: 'Cannot modify administrative accounts' });
        }

        await User.update(id, { role, status });
        
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'UPDATE_USER', `Updated user ID: ${id} to role: ${role}, status: ${status}`]
        );
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Delete a non-admin user
 * @route   DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const [targetUser] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
        if (!targetUser || !targetUser[0]) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (targetUser[0].role === 'admin') {
            return res.status(403).json({ error: 'Cannot delete admin accounts' });
        }

        await db.query('DELETE FROM users WHERE id = ?', [id]);

        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'DELETE_USER', `Deleted user ID: ${id}`]
        );
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('DELETE_USER_ERROR:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
    try {
        const { full_name, phone } = req.body;
        const id = req.user.id;
        let signature = req.body.signature;

        // If a file was uploaded, update the signature path and purge the old file
        if (req.file) {
            signature = `assets/signature_imgs/${req.file.filename}`;
            
            // Definitively remove the old signature file from the disk
            const [oldUser] = await db.query('SELECT signature FROM users WHERE id = ?', [id]);
            if (oldUser && oldUser[0] && oldUser[0].signature) {
                // Construct absolute path to the old asset
                const oldPath = path.join(__dirname, '../..', oldUser[0].signature);
                try {
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                        console.log(`[CLEANUP] Purged legacy signature: ${oldPath}`);
                    }
                } catch (err) {
                    console.error(`[CLEANUP_ERROR] Failed to purge legacy signature: ${err.message}`);
                }
            }
        }

        // Fetch current user data to preserve role and status
        const [user] = await db.query('SELECT role, status, email FROM users WHERE id = ?', [id]);
        if (!user || !user[0]) {
            return res.status(404).json({ error: 'User not found' });
        }

        await User.update(id, {
            full_name,
            phone,
            signature: signature || null,
            role: user[0].role,
            status: user[0].status,
            email: user[0].email
        });

        const updatedUser = await User.findById(id);
        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
        console.error('UPDATE_PROFILE_ERROR:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Reset all operational data (orders, inquiries, quotes, logs, notifications)
 * @route   DELETE /api/admin/reset-database
 * @access  Admin only
 */
const resetDatabase = async (req, res) => {
    try {
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        // Clear almost everything except users, roles, and settings
        const tablesToClear = [
            'notifications', 'activity_logs', 'logs', 'payments', 
            'order_items', 'orders', 'inquiries', 'quotes', 'quote_items',
            'cart_items', 'wishlist', 'wishlists', 'inventory_logs',
            'products', 'product_variants', 'product_images', 
            'categories', 'subcategories', 'brands', 'discounts', 'discount_codes',
            'projects', 'project_images', 'gallery_projects', 'gallery_images',
            'promotions', 'sales', 'newsletters'
        ];
        
        for (const table of tablesToClear) {
            try { await db.query(`TRUNCATE TABLE \`${table}\``); } catch (e) { /* table may not exist */ }
        }
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        // Clear physical assets
        try {
            if (fs.existsSync(ASSETS_DIR)) {
                const items = fs.readdirSync(ASSETS_DIR);
                for (const item of items) {
                    const itemPath = path.join(ASSETS_DIR, item);
                    if (fs.lstatSync(itemPath).isDirectory()) {
                        fs.rmSync(itemPath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(itemPath);
                    }
                }
                console.log(`[RESET] Purged physical assets in ${ASSETS_DIR}`);
            }
        } catch (assetErr) {
            console.error(`[RESET_ASSETS_ERROR] ${assetErr.message}`);
        }

        // Log the action (to the freshly-cleared table — first entry)
        await db.query(
            'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
            [req.user.id, 'RESET_DATABASE', `Database operational data and assets reset by admin UID-${req.user.id}`]
        );

        res.json({ message: 'Database reset complete. All products, orders, inquiries, projects, assets, and logs have been cleared. User accounts, roles, and settings were preserved.' });
    } catch (error) {
        console.error('RESET_DATABASE_ERROR:', error);
        // Ensure FK checks are re-enabled even on error
        try { await db.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

module.exports = {
    getAllUsers,
    getStats,
    updateUser,
    deleteUser,
    updateProfile,
    resetDatabase,
};
