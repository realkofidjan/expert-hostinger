require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketUtils = require('./src/utils/socket');
const multer = require('multer');
const { protect, authorize, optionalProtect } = require('./src/middleware/auth');
const underConstruction = require('./src/middleware/underConstruction');
const AuthController = require('./src/controllers/AuthController');
const BulkUploadController = require('./src/controllers/BulkUploadController');
const OrderController = require('./src/controllers/OrderController');
const InquiryController = require('./src/controllers/InquiryController');
const QuoteController = require('./src/controllers/QuoteController');
const UserController = require('./src/controllers/UserController');
const BlogController = require('./src/controllers/BlogController');
const ProductController = require('./src/controllers/ProductController');
const CategoryController = require('./src/controllers/CategoryController');
const PaymentController = require('./src/controllers/PaymentController');
const BrandController = require('./src/controllers/BrandController');
const LogController = require('./src/controllers/LogController');
const SearchController = require('./src/controllers/SearchController');
const DiscountController = require('./src/controllers/DiscountController');
const SaleController = require('./src/controllers/SaleController');
const SettingsController = require('./src/controllers/SettingsController');
const DeliveryController = require('./src/controllers/DeliveryController');
const AddressController = require('./src/controllers/AddressController');
const NotificationController = require('./src/controllers/NotificationController');
const WishlistController = require('./src/controllers/WishlistController');
const ProjectsController = require('./src/controllers/ProjectsController');
const { exportBackup, restoreBackup } = require('./src/controllers/BackupController');

// ── Multer: in-memory for images, disk for receipts ──────────────────────────
const upload = multer({ storage: multer.memoryStorage() });

const receiptsDir = path.join(__dirname, 'uploads', 'receipts');
if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, receiptsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 8)}${ext}`);
  }
});
const receiptUpload = multer({
  storage: receiptStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPEG, PNG and PDF files are allowed for receipts'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const app = express();
const API_BASE_URL = process.env.VITE_API_BASE_URL || '/api';
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // In production/monolithic mode, we allow the origin if it exists, or true for same-origin
    if (!origin) return callback(null, true);
    callback(null, true); // Simple and robust for deployment
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(underConstruction);

// Serve Static Files
const frontendBuildPath = path.join(__dirname, 'public');
app.use(express.static(frontendBuildPath));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ── Auth & User ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', AuthController.register);
app.post('/api/auth/login', AuthController.login);
app.get('/api/auth/me', protect, AuthController.getMe);
app.put('/api/auth/profile', protect, UserController.updateProfile);
app.get('/api/auth/users', protect, authorize('admin'), UserController.getAllUsers);
app.put('/api/admin/users/:id', protect, authorize('admin'), UserController.updateUser);
app.delete('/api/admin/users/:id', protect, authorize('admin'), UserController.deleteUser);
app.delete('/api/admin/reset-database', protect, authorize('admin'), UserController.resetDatabase);
app.get('/api/admin/logs', protect, authorize('admin', 'sub-admin', 'staff'), LogController.getAllLogs);
app.get('/api/admin/stats', protect, authorize('admin', 'sub-admin', 'staff'), UserController.getStats);

// ── Products ──────────────────────────────────────────────────────────────────
app.get('/api/products', ProductController.getAllProducts);
app.get('/api/products/meta', ProductController.getProductMeta);
app.get('/api/products/:id', ProductController.getProductById);
app.get('/api/admin/products/template', protect, authorize('admin', 'sub-admin'), ProductController.getTemplate);
app.post('/api/admin/products', protect, authorize('admin', 'sub-admin'), upload.array('images', 10), ProductController.createProduct);
app.put('/api/admin/products/:id', protect, authorize('admin', 'sub-admin'), upload.array('images', 10), ProductController.updateProduct);
app.delete('/api/admin/products/:id', protect, authorize('admin', 'sub-admin'), ProductController.deleteProduct);

// ── Categories & Brands ───────────────────────────────────────────────────────
app.get('/api/categories', CategoryController.getAllCategories);
app.post('/api/admin/categories', protect, authorize('admin', 'sub-admin'), CategoryController.createCategory);
app.put('/api/admin/categories/:id', protect, authorize('admin', 'sub-admin'), CategoryController.updateCategory);
app.delete('/api/admin/categories/:id', protect, authorize('admin', 'sub-admin'), CategoryController.deleteCategory);
app.post('/api/admin/subcategories', protect, authorize('admin', 'sub-admin'), CategoryController.createSubcategory);
app.put('/api/admin/subcategories/:id', protect, authorize('admin', 'sub-admin'), CategoryController.updateSubcategory);
app.delete('/api/admin/subcategories/:id', protect, authorize('admin', 'sub-admin'), CategoryController.deleteSubcategory);

app.get('/api/brands', BrandController.getAllBrands);
app.get('/api/admin/brands', protect, authorize('admin', 'sub-admin', 'staff'), BrandController.getAllBrands);
app.post('/api/admin/brands', protect, authorize('admin', 'sub-admin'), upload.single('logo'), BrandController.createBrand);
app.put('/api/admin/brands/:id', protect, authorize('admin', 'sub-admin'), upload.single('logo'), BrandController.updateBrand);
app.delete('/api/admin/brands/:id', protect, authorize('admin', 'sub-admin'), BrandController.deleteBrand);

// ── Blogs ─────────────────────────────────────────────────────────────────────
app.get('/api/blogs', BlogController.getAllBlogs);
app.get('/api/blogs/:id', BlogController.getBlogById);
app.post('/api/admin/blogs', protect, authorize('admin', 'sub-admin'), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery', maxCount: 10 }]), BlogController.createBlog);
app.put('/api/admin/blogs/:id', protect, authorize('admin', 'sub-admin'), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery', maxCount: 10 }]), BlogController.updateBlog);
app.delete('/api/admin/blogs/:id', protect, authorize('admin', 'sub-admin'), BlogController.deleteBlog);

// ── Orders ────────────────────────────────────────────────────────────────────
app.get('/api/my-orders', protect, OrderController.getMyOrders);
app.get('/api/admin/orders', protect, authorize('admin', 'sub-admin', 'staff'), OrderController.getAllOrders);
app.get('/api/admin/orders/:id', protect, authorize('admin', 'sub-admin', 'staff'), OrderController.getOrderById);
app.post('/api/orders', optionalProtect, OrderController.createOrder);
app.get('/api/orders/lookup', OrderController.lookupOrder);
app.get('/api/orders/:orderNumber/details', OrderController.getOrderDetails);
app.post('/api/orders/:orderNumber/cancel', OrderController.publicCancelOrder);
app.post('/api/orders/:orderNumber/upload-receipt', receiptUpload.single('bank_receipt'), OrderController.uploadReceipt);
app.patch('/api/admin/orders/:id/status', protect, authorize('admin', 'sub-admin', 'staff'), OrderController.updateStatus);
app.patch('/api/admin/orders/:id/verify-transfer', protect, authorize('admin', 'sub-admin', 'staff'), OrderController.verifyBankTransfer);
app.get('/api/admin/orders/:id/document', protect, authorize('admin', 'sub-admin', 'staff'), OrderController.getDocument);
app.get('/api/admin/orders/:id/preview-receipt', protect, authorize('admin', 'sub-admin', 'staff'), OrderController.previewReceipt);
app.post('/api/admin/orders/:id/send-receipt', protect, authorize('admin', 'sub-admin', 'staff'), OrderController.sendReceipt);

// ── Delivery Regions ──────────────────────────────────────────────────────────
app.get('/api/delivery-regions', DeliveryController.getPublic);
app.get('/api/admin/delivery-regions', protect, authorize('admin', 'sub-admin', 'staff'), DeliveryController.getAll);
app.put('/api/admin/delivery-regions/:id', protect, authorize('admin'), DeliveryController.update);

// ── User Addresses ────────────────────────────────────────────────────────────
app.get('/api/my-addresses', protect, AddressController.getMyAddresses);
app.post('/api/my-addresses', protect, AddressController.saveAddress);

// ── Wishlist ──────────────────────────────────────────────────────────────────
app.get('/api/wishlist', protect, WishlistController.getWishlist);
app.post('/api/wishlist/toggle', protect, WishlistController.toggleWishlist);
app.get('/api/wishlist/check/:productId', protect, WishlistController.checkWishlist);
app.put('/api/my-addresses/:id', protect, AddressController.updateAddress);
app.delete('/api/my-addresses/:id', protect, AddressController.deleteAddress);

// ── Inquiries ─────────────────────────────────────────────────────────────────
app.get('/api/admin/inquiries', protect, authorize('admin', 'sub-admin', 'staff'), InquiryController.getAll);
app.post('/api/inquiries', optionalProtect, InquiryController.create);
app.patch('/api/admin/inquiries/:id/status', protect, authorize('admin', 'sub-admin', 'staff'), InquiryController.updateStatus);

// ── Quotes (kept for legacy, not shown in UI) ─────────────────────────────────
app.get('/api/admin/quotes', protect, authorize('admin', 'sub-admin', 'staff'), QuoteController.getAll);
app.get('/api/my-quotes', protect, QuoteController.getMyQuotes);
app.post('/api/quotes/:id/reject', protect, QuoteController.reject);
app.post('/api/quotes', optionalProtect, QuoteController.create);
app.post('/api/quotes/:id/approve', protect, QuoteController.approve);
app.patch('/api/admin/quotes/:id/details', protect, authorize('admin', 'sub-admin', 'staff'), QuoteController.updateQuoteDetails);
app.patch('/api/admin/quotes/:id/status', protect, authorize('admin', 'sub-admin', 'staff'), QuoteController.updateStatus);
app.post('/api/admin/quotes/:id/confirm-payment', protect, authorize('admin', 'sub-admin', 'staff'), QuoteController.confirmManualPayment);

// ── Payments (Paystack — MoMo) ────────────────────────────────────────────────
app.post('/api/payments/initialize', optionalProtect, PaymentController.initialize);
app.get('/api/payments/verify/:reference', PaymentController.verify);
app.post('/api/payments/webhook', PaymentController.webhook);

// ── Notifications ─────────────────────────────────────────────────────────────
app.get('/api/admin/notifications', protect, authorize('admin', 'sub-admin', 'staff'), NotificationController.getAll);
app.patch('/api/admin/notifications/read-all', protect, authorize('admin', 'sub-admin', 'staff'), NotificationController.markAllRead);
app.patch('/api/admin/notifications/:id/read', protect, authorize('admin', 'sub-admin', 'staff'), NotificationController.markRead);

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings', SettingsController.getPublic);
app.get('/api/admin/settings', protect, authorize('admin', 'sub-admin', 'staff'), SettingsController.getAll);
app.put('/api/admin/settings', protect, authorize('admin'), SettingsController.update);

// ── Search ────────────────────────────────────────────────────────────────────
app.get('/api/admin/search', protect, authorize('admin', 'sub-admin', 'staff'), SearchController.globalSearch);

// ── Discounts ─────────────────────────────────────────────────────────────────
app.get('/api/admin/discounts', protect, authorize('admin', 'sub-admin', 'staff'), DiscountController.getAll);
app.post('/api/admin/discounts', protect, authorize('admin'), DiscountController.create);
app.put('/api/admin/discounts/:id', protect, authorize('admin'), DiscountController.update);
app.patch('/api/admin/discounts/:id/toggle', protect, authorize('admin'), DiscountController.toggleActive);
app.delete('/api/admin/discounts/:id', protect, authorize('admin'), DiscountController.remove);

// ── Sales ─────────────────────────────────────────────────────────────────────
app.get('/api/admin/sales', protect, authorize('admin', 'sub-admin', 'staff'), SaleController.getAll);
app.post('/api/admin/sales', protect, authorize('admin'), SaleController.create);
app.put('/api/admin/sales/:id', protect, authorize('admin'), SaleController.update);
app.patch('/api/admin/sales/:id/toggle', protect, authorize('admin'), SaleController.toggleActive);
app.delete('/api/admin/sales/:id', protect, authorize('admin'), SaleController.remove);

// ── Projects ──────────────────────────────────────────────────────────────────
app.get('/api/projects', ProjectsController.getPublic);
app.get('/api/admin/projects', protect, authorize('admin', 'sub-admin', 'staff'), ProjectsController.getAll);
app.post('/api/admin/projects', protect, authorize('admin', 'sub-admin'), upload.array('images', 20), ProjectsController.create);
app.put('/api/admin/projects/:id', protect, authorize('admin', 'sub-admin'), upload.array('images', 20), ProjectsController.update);
app.delete('/api/admin/projects/:id', protect, authorize('admin', 'sub-admin'), ProjectsController.remove);

// ── Backup & Restore ─────────────────────────────────────────────────────────
app.get('/api/admin/backup/export', protect, authorize('admin'), exportBackup);
app.post('/api/admin/backup/restore', protect, authorize('admin'), upload.single('backup'), restoreBackup);

// ── Bulk Upload ───────────────────────────────────────────────────────────────
app.get('/api/bulk-upload/count', protect, authorize('admin', 'sub-admin'), BulkUploadController.getProductCount);
app.post('/api/admin/bulk-upload/validate', protect, authorize('admin', 'sub-admin'), upload.single('file'), BulkUploadController.validateUpload);
app.post('/api/admin/bulk-upload/confirm', protect, authorize('admin', 'sub-admin'), BulkUploadController.confirmUpload);

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('SERVER_ERROR:', err);
  res.status(500).json({ error: 'Something went wrong', details: err.message });
});

// ── Catch-all for Frontend (SPA) ─────────────────────────────────────────────
// Robust catch-all using app.use() to avoid Express 5 path-to-regexp issues
app.use((req, res) => {
  // If request is for an API route that wasn't found, send 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  const indexPath = path.join(frontendBuildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'Expert Office Furnish API v2.0', note: 'Frontend build not found' });
  }
});
const db = require('./src/config/db');
(async () => {
  try {
    const [cols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'"
    );
    const existing = cols.map(c => c.COLUMN_NAME);
    if (!existing.includes('estimated_delivery_date')) {
      await db.query('ALTER TABLE orders ADD COLUMN estimated_delivery_date DATE NULL');
      console.log('Migration: added estimated_delivery_date');
    }
    if (!existing.includes('delivery_notes')) {
      await db.query('ALTER TABLE orders ADD COLUMN delivery_notes TEXT NULL');
      console.log('Migration: added delivery_notes');
    }
  } catch (e) {
    console.warn('Migration error:', e.message);
  }
})();

const server = http.createServer(app);
socketUtils.init(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
