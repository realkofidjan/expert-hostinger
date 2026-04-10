const db = require('../config/db');
const { createNotification } = require('./NotificationController');
const { sendMail } = require('../utils/mailer');
const { buildReceiptHtml } = require('../utils/receiptGenerator');
const { generatePdf } = require('../utils/pdfGenerator');
const { getIo } = require('../utils/socket');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;

const generateOrderNumber = () => {
  const d = new Date();
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `EXP-${datePart}-${rand}`;
};

const OrderController = {
  getAllOrders: async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, parseInt(req.query.limit) || 20);
      const offset = (page - 1) * limit;
      const { status, payment_method, q } = req.query;

      const conditions = [];
      const params = [];
      if (status && status !== 'all') { conditions.push('o.status = ?'); params.push(status); }
      if (payment_method && payment_method !== 'all') { conditions.push('o.payment_method = ?'); params.push(payment_method); }
      if (q) {
        conditions.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?)');
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM orders o ${where}`, params);
      const [rows] = await db.query(
        `SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
         FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      res.json({ orders: rows, pagination: { total, pages: Math.ceil(total / limit), currentPage: page, limit } });
    } catch (err) {
      console.error('FETCH_ORDERS_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getOrderById: async (req, res) => {
    const { id } = req.params;
    try {
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (!orders.length) return res.status(404).json({ error: 'Order not found' });

      const [items] = await db.query(`
        SELECT oi.*, p.name AS product_name, p.sku,
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [id]);

      res.json({ ...orders[0], items });
    } catch (err) {
      console.error('GET_ORDER_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  createOrder: async (req, res) => {
    let body = req.body;

    console.log('CREATE_ORDER_REQUEST:', { body: req.body, file: req.file });

    // If FormData was sent (bank_transfer receipt), fields come as strings
    if (typeof body.items === 'string') {
      try { body.items = JSON.parse(body.items); } catch { }
    }

    const customer_name = body.customer_name || body.name;
    const customer_email = body.customer_email || body.email;
    const customer_phone = body.customer_phone || body.phone || '';
    const { items, payment_method, delivery_mode, region, delivery_fee, shipping_address } = body;

    if (!customer_name) return res.status(400).json({ error: 'Missing required field: customer_name' });
    if (!customer_email) return res.status(400).json({ error: 'Missing required field: customer_email' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing or empty items list' });
    }
    if (!['cash', 'bank_transfer', 'momo'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method. Use: cash, bank_transfer, or momo' });
    }
    if (payment_method === 'cash' && delivery_mode !== 'pickup') {
      return res.status(400).json({ error: 'Cash payment is only available for pickup orders' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.unit_price) * parseInt(item.quantity)), 0);
      const fee = parseFloat(delivery_fee || 0);
      const total = subtotal + fee;
      const orderNumber = generateOrderNumber();

      let bankReceiptPath = null;
      if (payment_method === 'bank_transfer' && req.file) {
        bankReceiptPath = `/uploads/receipts/${req.file.filename}`;
      }

      const initialPaymentStatus = payment_method === 'bank_transfer' ? 'pending_verification' : 'pending';

      const userId = req.user?.id || null;
      const [orderResult] = await connection.query(`
        INSERT INTO orders (
          order_number, customer_name, customer_email, customer_phone,
          payment_method, delivery_mode, region, delivery_fee,
          subtotal, total_amount, bank_receipt_path,
          status, payment_status, shipping_address, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      `, [
        orderNumber,
        customer_name,
        customer_email,
        customer_phone || null,
        payment_method,
        delivery_mode || 'pickup',
        region || null,
        fee,
        subtotal,
        total,
        bankReceiptPath,
        initialPaymentStatus,
        shipping_address || (delivery_mode === 'delivery' && region ? region : null),
        userId
      ]);

      const orderId = orderResult.insertId;

      for (const item of items) {
        const qty = parseInt(item.quantity);
        const price = parseFloat(item.unit_price);
        const variantName = item.variant; // This came from the cart

        // 1. Determine which stock to check/decrement
        let stockAvailable = 0;
        let variantId = null;

        if (variantName) {
          // Check variant stock
          const [variants] = await connection.query(
            'SELECT id, stock_quantity FROM product_variants WHERE product_id = ? AND color_name = ?',
            [item.product_id, variantName]
          );
          if (variants.length > 0) {
            stockAvailable = variants[0].stock_quantity;
            variantId = variants[0].id;
          } else {
            // Fallback to base product if variant not found (shouldn't happen with good UI)
            const [products] = await connection.query('SELECT stock FROM products WHERE id = ?', [item.product_id]);
            stockAvailable = products[0]?.stock || 0;
          }
        } else {
          // Check base product stock
          const [products] = await connection.query('SELECT stock FROM products WHERE id = ?', [item.product_id]);
          stockAvailable = products[0]?.stock || 0;
        }

        if (stockAvailable < qty) {
          throw new Error(`Insufficient stock for item: ${item.name || 'Product ID ' + item.product_id}. Available: ${stockAvailable}`);
        }

        // 2. Insert order item
        await connection.query(`
          INSERT INTO order_items (order_id, product_id, variant_id, color, quantity, unit_price, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [orderId, item.product_id, variantId, variantName || null, qty, price, qty * price]);

        // 3. Decrement stock
        if (variantId) {
          await connection.query(
            'UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?',
            [qty, variantId]
          );
        }

        // Always decrement base product stock as it represents the "total" or "inventory count" 
        // In this system, Product.js update/create calculates total stock as sum of variants.
        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [qty, item.product_id]
        );
      }

      await connection.commit();

      // Notify admins
      const methodLabels = { cash: 'Cash', bank_transfer: 'Bank Transfer', momo: 'Mobile Money' };
      const methodLabel = methodLabels[payment_method] || payment_method;
      const deliveryLabel = delivery_mode === 'delivery' ? `Delivery → ${region || 'unspecified region'}` : 'Pickup';

      await createNotification(
        'new_order',
        `New Order: ${orderNumber}`,
        `${customer_name} placed an order via ${methodLabel} (${deliveryLabel}). Total: ₵${total.toFixed(2)}`,
        orderId,
        orderNumber
      );

      // Emit real-time update for admins
      const io = getIo();
      if (io) {
        io.emit('admin_new_order', { orderNumber, customer_name, total });
      }

      res.status(201).json({ message: 'Order placed successfully', orderId, orderNumber });
    } catch (err) {
      await connection.rollback();
      console.error('CREATE_ORDER_ERROR:', err);
      res.status(500).json({ error: err.message });
    } finally {
      connection.release();
    }
  },

  getOrderDetails: async (req, res) => {
    const { orderNumber } = req.params;
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    try {
      const [orders] = await db.query(
        'SELECT * FROM orders WHERE order_number = ? AND LOWER(customer_email) = LOWER(?)',
        [orderNumber, email.trim()]
      );
      if (!orders.length) return res.status(404).json({ error: 'Order not found' });
      const order = orders[0];
      const [items] = await db.query(`
        SELECT oi.*, p.name AS product_name, p.sku,
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);
      const { bank_receipt_path, ...safeOrder } = order;
      res.json({ ...safeOrder, bank_receipt_path: bank_receipt_path ? true : null, items });
    } catch (err) {
      console.error('GET_ORDER_DETAILS_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  updateStatus: async (req, res) => {
    const { id } = req.params;
    const { status, payment_status, estimated_delivery_date, delivery_notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'on_route', 'delivered', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    try {
      const updates = [];
      const values = [];
      if (status) { updates.push('status = ?'); values.push(status); }
      if (payment_status) { updates.push('payment_status = ?'); values.push(payment_status); }
      if (estimated_delivery_date !== undefined) { updates.push('estimated_delivery_date = ?'); values.push(estimated_delivery_date || null); }
      if (delivery_notes !== undefined) { updates.push('delivery_notes = ?'); values.push(delivery_notes || null); }
      if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

      values.push(id);
      await db.query(`UPDATE orders SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

      await db.query(
        'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
        [req.user.id, 'UPDATE_ORDER', `Order #${id} updated — status: ${status || 'N/A'}, payment: ${payment_status || 'N/A'}`]
      );

      const [orderRows] = await db.query('SELECT order_number, customer_email FROM orders WHERE id = ?', [id]);
      if (orderRows.length) {
        const io = getIo();
        if (io) {
          io.to(orderRows[0].customer_email).emit('order_update', {
            orderNumber: orderRows[0].order_number,
            status,
            payment_status
          });
        }
      }

      res.json({ message: 'Order updated successfully' });
    } catch (err) {
      console.error('UPDATE_ORDER_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  verifyBankTransfer: async (req, res) => {
    const { id } = req.params;
    try {
      await db.query(
        'UPDATE orders SET bank_receipt_verified = 1, payment_status = "verified", updated_at = NOW() WHERE id = ?',
        [id]
      );
      await db.query(
        'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
        [req.user.id, 'VERIFY_BANK_TRANSFER', `Order #${id} bank transfer receipt verified`]
      );
      const [orderRows] = await db.query('SELECT order_number, customer_email FROM orders WHERE id = ?', [id]);
      if (orderRows.length) {
        const io = getIo();
        if (io) {
          io.to(orderRows[0].customer_email).emit('order_update', {
            orderNumber: orderRows[0].order_number,
            payment_status: 'verified'
          });
        }
      }

      res.json({ message: 'Bank transfer verified' });
    } catch (err) {
      console.error('VERIFY_TRANSFER_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getMyOrders: async (req, res) => {
    try {
      const email = req.user.email;
      const [orders] = await db.query(`
        SELECT o.*,
          (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
        FROM orders o
        WHERE LOWER(o.customer_email) = LOWER(?)
        ORDER BY o.created_at DESC
      `, [email]);
      res.json(orders);
    } catch (err) {
      console.error('GET_MY_ORDERS_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  lookupOrder: async (req, res) => {
    const { orderNumber, email } = req.query;
    if (!orderNumber || !email) {
      return res.status(400).json({ error: 'Order number and email are required' });
    }
    try {
      const [rows] = await db.query(
        'SELECT * FROM orders WHERE order_number = ? AND LOWER(customer_email) = LOWER(?) AND payment_method = "bank_transfer"',
        [orderNumber.trim(), email.trim()]
      );
      if (!rows.length) {
        return res.status(404).json({ error: 'No bank transfer order found with that order number and email.' });
      }
      const order = rows[0];
      // Don't expose internal file path — just signal if one exists
      const { bank_receipt_path, ...safeOrder } = order;
      res.json({ ...safeOrder, bank_receipt_path: bank_receipt_path ? true : null });
    } catch (err) {
      console.error('LOOKUP_ORDER_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  publicCancelOrder: async (req, res) => {
    const { orderNumber } = req.params;
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      const [rows] = await connection.query(
        'SELECT * FROM orders WHERE order_number = ? AND LOWER(customer_email) = LOWER(?)',
        [orderNumber, email.trim()]
      );
      if (!rows.length) {
        throw new Error('Order not found or email does not match');
      }
      const order = rows[0];
      if (order.status !== 'pending') {
        throw new Error(`Order cannot be cancelled because it is already ${order.status}`);
      }

      // Restock items
      const [items] = await connection.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      for (const item of items) {
        if (item.variant_id) {
          await connection.query('UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.variant_id]);
        }
        await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }

      await connection.query('UPDATE orders SET status = "cancelled", updated_at = NOW() WHERE id = ?', [order.id]);
      
      await connection.commit();

      await createNotification(
        'order_cancelled',
        `Order Cancelled by Customer: ${order.order_number}`,
        `${order.customer_name} has cancelled their order. Items have been restocked.`,
        order.id,
        order.order_number
      );

      // Notify admins via socket
      const io = getIo();
      if (io) io.emit('admin_order_cancelled', { orderNumber: order.order_number });

      res.json({ message: 'Order has been cancelled successfully.' });
    } catch (err) {
      await connection.rollback();
      console.error('PUBLIC_CANCEL_ORDER_ERROR:', err);
      res.status(400).json({ error: err.message });
    } finally {
      connection.release();
    }
  },

  uploadReceipt: async (req, res) => {
    const { orderNumber } = req.params;
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required to verify order ownership' });
    if (!req.file) return res.status(400).json({ error: 'Please upload your deposit receipt' });

    try {
      const [rows] = await db.query(
        'SELECT * FROM orders WHERE order_number = ? AND LOWER(customer_email) = LOWER(?) AND payment_method = "bank_transfer"',
        [orderNumber, email.trim()]
      );
      if (!rows.length) {
        return res.status(404).json({ error: 'Order not found or email does not match' });
      }
      const order = rows[0];

      // Check 72-hour window
      const createdAt = new Date(order.created_at);
      const diffHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      if (diffHours > 72) {
        return res.status(400).json({ error: 'The 72-hour deposit window for this order has expired. Please contact us for assistance.' });
      }

      if (order.bank_receipt_path) {
        return res.status(400).json({ error: 'A receipt has already been uploaded for this order.' });
      }

      const receiptPath = `/uploads/receipts/${req.file.filename}`;
      await db.query(
        'UPDATE orders SET bank_receipt_path = ?, payment_status = "pending_verification", updated_at = NOW() WHERE id = ?',
        [receiptPath, order.id]
      );

      await createNotification(
        'receipt_uploaded',
        `Receipt Uploaded: ${order.order_number}`,
        `${order.customer_name} uploaded a bank deposit receipt for order ${order.order_number}. Ready for verification.`,
        order.id,
        order.order_number
      );

      // Notify admins via socket
      const io = getIo();
      if (io) io.emit('admin_receipt_uploaded', { orderNumber: order.order_number });

      res.json({ message: 'Receipt uploaded successfully. Our team will verify and confirm your order shortly.' });
    } catch (err) {
      console.error('UPLOAD_RECEIPT_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getDocument: async (req, res) => {
    const { id } = req.params;
    try {
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (!orders.length) return res.status(404).json({ error: 'Order not found' });

      const [items] = await db.query(`
        SELECT oi.*, p.name AS product_name, p.sku
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [id]);

      const [settings] = await db.query(
        "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('store_address','bank_name','bank_branch','bank_account_number','bank_account_name','pickup_address')"
      );
      const cfg = Object.fromEntries(settings.map(s => [s.setting_key, s.setting_value]));
      const order = orders[0];
      const docType = order.payment_method === 'cash' ? 'invoice' : 'receipt';

      res.json({ order, items, docType, storeInfo: cfg });
    } catch (err) {
      console.error('GET_DOCUMENT_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  sendReceipt: async (req, res) => {
    const { id } = req.params;
    try {
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (!orders.length) return res.status(404).json({ error: 'Order not found' });

      const [items] = await db.query(`
        SELECT oi.*, p.name AS product_name, p.sku
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [id]);

      const [settings] = await db.query(
        "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('store_address','bank_name','bank_branch','bank_account_number','bank_account_name','pickup_address')"
      );
      const cfg = Object.fromEntries(settings.map(s => [s.setting_key, s.setting_value]));
      const order = orders[0];
      const docType = order.payment_method === 'cash' ? 'Invoice' : 'Receipt';
      const receiptHtml = buildReceiptHtml(order, items, cfg, docType);
      
      // Generate PDF buffer
      const pdfBuffer = await generatePdf(receiptHtml);

      // Professional Email Body
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
          <h2 style="color: #16a34a;">Hello ${order.customer_name},</h2>
          <p>Thank you for choosing <strong>Expert Office Furnish</strong>. We appreciate your business!</p>
          <p>Please find your official <strong>${docType}</strong> attached to this email for order <strong>${order.order_number}</strong>.</p>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #eee;">
            <p style="margin: 0;"><strong>Order Number:</strong> ${order.order_number}</p>
            <p style="margin: 0;"><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            <p style="margin: 0;"><strong>Total Amount:</strong> ₵${parseFloat(order.total_amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
          </div>
          <p>If you have any questions regarding your order or the attached document, please don't hesitate to reply to this email or contact us at <a href="mailto:sales@expertofficefurnish.com" style="color: #16a34a; text-decoration: none;">sales@expertofficefurnish.com</a>.</p>
          <p>Best regards,<br><strong>The Expert Office Team</strong></p>
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
          <p style="font-size: 12px; color: #888; text-align: center;">Expert Office Furnish — High Quality Office Furniture & Design Solutions</p>
        </div>
      `;

      await sendMail({
        to: order.customer_email,
        subject: `[Expert Office Furnish] Your ${docType} — ${order.order_number}`,
        html: emailHtml,
        attachments: [
          {
            filename: `${docType}_${order.order_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      res.json({ message: `${docType} sent to ${order.customer_email}` });
    } catch (err) {
      console.error('SEND_RECEIPT_ERROR:', err);
      if (err.message === 'SMTP_NOT_CONFIGURED') {
        return res.status(400).json({ error: 'Email service is not configured (SMTP_USER missing in .env).' });
      }
      res.status(500).json({ error: err.message });
    }
  },

  previewReceipt: async (req, res) => {
    const { id } = req.params;
    try {
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (!orders.length) return res.status(404).json({ error: 'Order not found' });

      const [items] = await db.query(`
        SELECT oi.*, p.name AS product_name, p.sku
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [id]);

      const [settings] = await db.query(
        "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('store_address','bank_name','bank_branch','bank_account_number','bank_account_name','pickup_address')"
      );
      const cfg = Object.fromEntries(settings.map(s => [s.setting_key, s.setting_value]));
      const order = orders[0];
      const docType = order.payment_method === 'cash' ? 'Invoice' : 'Receipt';
      const html = buildReceiptHtml(order, items, cfg, docType);

      res.status(200).send(html);
    } catch (err) {
      console.error('PREVIEW_RECEIPT_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  downloadReceipt: async (req, res) => {
    const { id } = req.params;
    try {
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (!orders.length) return res.status(404).json({ error: 'Order not found' });

      const [items] = await db.query(`
        SELECT oi.*, p.name AS product_name, p.sku
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [id]);

      const [settings] = await db.query(
        "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('store_address','bank_name','bank_branch','bank_account_number','bank_account_name','pickup_address')"
      );
      const cfg = Object.fromEntries(settings.map(s => [s.setting_key, s.setting_value]));
      const order = orders[0];
      const docType = order.payment_method === 'cash' ? 'Invoice' : 'Receipt';
      const receiptHtml = buildReceiptHtml(order, items, cfg, docType);
      
      const pdfBuffer = await generatePdf(receiptHtml);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${docType}_${order.order_number}.pdf`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('DOWNLOAD_RECEIPT_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  updateOrder: async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const { items, customer_name, customer_email, customer_phone, delivery_mode, region, delivery_fee, shipping_address, status, payment_status } = body;

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      // 1. Restore stock for existing items before updating
      const [oldItems] = await connection.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
      for (const item of oldItems) {
        if (item.variant_id) {
          await connection.query('UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.variant_id]);
        }
        await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }

      // 2. Delete existing items
      await connection.query('DELETE FROM order_items WHERE order_id = ?', [id]);

      // 3. insert new items and deduct stock
      let subtotal = 0;
      for (const item of items) {
        const qty = parseInt(item.quantity);
        const price = parseFloat(item.unit_price);
        subtotal += (qty * price);

        let variantId = item.variant_id || null;
        if (item.color && !variantId) {
            // Find variant ID if only color name is provided
            const [variants] = await connection.query(
                'SELECT id FROM product_variants WHERE product_id = ? AND color_name = ?',
                [item.product_id, item.color]
            );
            if (variants.length > 0) variantId = variants[0].id;
        }

        // Check stock
        let stockAvailable = 0;
        if (variantId) {
            const [vs] = await connection.query('SELECT stock_quantity FROM product_variants WHERE id = ?', [variantId]);
            stockAvailable = vs[0]?.stock_quantity || 0;
        } else {
            const [ps] = await connection.query('SELECT stock FROM products WHERE id = ?', [item.product_id]);
            stockAvailable = ps[0]?.stock || 0;
        }

        if (stockAvailable < qty) {
            throw new Error(`Insufficient stock for ${item.product_name || 'Item'}. Available: ${stockAvailable}`);
        }

        // Deduct stock
        if (variantId) {
            await connection.query('UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?', [qty, variantId]);
        }
        await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [qty, item.product_id]);

        // Insert item
        await connection.query(`
          INSERT INTO order_items (order_id, product_id, variant_id, color, quantity, unit_price, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, item.product_id, variantId, item.color || null, qty, price, qty * price]);
      }

      // 4. Update order details
      const fee = parseFloat(delivery_fee || 0);
      const total = subtotal + fee;

      await connection.query(`
        UPDATE orders SET
          customer_name = ?, customer_email = ?, customer_phone = ?,
          delivery_mode = ?, region = ?, delivery_fee = ?, subtotal = ?, total_amount = ?,
          shipping_address = ?, status = ?, payment_status = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        customer_name, customer_email, customer_phone || null,
        delivery_mode || 'pickup', region || null, fee, subtotal, total,
        typeof shipping_address === 'object' ? JSON.stringify(shipping_address) : shipping_address,
        status || 'pending', payment_status || 'pending',
        id
      ]);

      await connection.commit();

      // Log activity
      await db.query(
          'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
          [req.user.id, 'UPDATE_ORDER_FULL', `Order #${id} full update by admin`]
      );

      res.json({ message: 'Order updated successfully' });
    } catch (err) {
      await connection.rollback();
      console.error('UPDATE_ORDER_FULL_ERROR:', err);
      res.status(500).json({ error: err.message });
    } finally {
      connection.release();
    }
  }
};

module.exports = OrderController;
