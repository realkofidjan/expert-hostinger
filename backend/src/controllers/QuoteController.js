const db = require('../config/db');
const { createNotification } = require('./NotificationController');
const { getIo } = require('../utils/socket');

const QuoteController = {
    // Get all quotes (with items count)
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT q.*, 
                (SELECT COUNT(*) FROM quote_items WHERE quote_id = q.id) as items_count
                FROM quotes q
                ORDER BY q.created_at DESC
            `);

            // For each quote, fetch its items with product details
            const quotesWithItems = await Promise.all(rows.map(async (quote) => {
                const [items] = await db.query(`
                    SELECT qi.*, p.name, p.price, pi.image_url as image
                    FROM quote_items qi
                    JOIN products p ON qi.product_id = p.id
                    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
                    WHERE qi.quote_id = ?
                `, [quote.id]);
                return { ...quote, items };
            }));

            res.json(quotesWithItems);
        } catch (err) {
            console.error('FETCH_QUOTES_ERROR:', err);
            res.status(500).json({ error: err.message });
        }
    },

    // Update quote status
    updateStatus: async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['pending', 'reviewed', 'contacted', 'approved', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }

        try {
            await db.query(
                'UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?',
                [status, id]
            );
            
            if (req.user) {
              await db.query(
                  'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
                  [req.user.id, 'UPDATE_QUOTE_STATUS', `Updated quote ID: ${id} to ${status}`]
              );
            }

            res.json({ message: 'Quote status updated successfully' });
        } catch (err) {
            console.error('UPDATE_QUOTE_ERROR:', err);
            res.status(500).json({ error: err.message });
        }
    },

    // Get quotes for the logged-in user
    getMyQuotes: async (req, res) => {
        try {
            const email = req.user.email;
            const [rows] = await db.query(`
                SELECT q.* FROM quotes q
                WHERE q.customer_email = ? 
                   OR q.user_id = ?
                ORDER BY q.created_at DESC
            `, [email, req.user.id]);

            const quotesWithItems = await Promise.all(rows.map(async (quote) => {
                const [items] = await db.query(`
                    SELECT qi.*, p.name, p.price, pi.image_url as image
                    FROM quote_items qi
                    JOIN products p ON qi.product_id = p.id
                    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
                    WHERE qi.quote_id = ?
                `, [quote.id]);
                return { ...quote, items };
            }));

            res.json(quotesWithItems);
        } catch (err) {
            console.error('FETCH_MY_QUOTES_ERROR:', err);
            res.status(500).json({ error: err.message });
        }
    },

    // Customer approves a reviewed quote
    approve: async (req, res) => {
        const { id } = req.params;
        const email = req.user.email;
        try {
            const [quote] = await db.query('SELECT * FROM quotes WHERE id = ? AND (customer_email = ? OR user_id = ?)', [id, email, req.user.id]);
            if (!quote || quote.length === 0) return res.status(404).json({ error: 'Quote not found' });
            
            const currentStatus = quote[0].status;
            if (currentStatus !== 'reviewed' && currentStatus !== 'contacted') {
                return res.status(400).json({ error: 'Only reviewed or contacted quotes can be approved' });
            }

            await db.query(
                'UPDATE quotes SET status = "approved", updated_at = NOW() WHERE id = ?',
                [id]
            );

            await db.query(
                'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
                [req.user.id, 'APPROVE_QUOTE', `User approved quote ID: ${id}`]
            );

            // Notify admins
            await createNotification(
                'quote_approved',
                `Quote #${id} Approved by Customer`,
                `${req.user.email} has approved quote #${id}. Ready for processing.`,
                null, null
            );
            const io = getIo();
            if (io) io.emit('admin:notification', { type: 'quote_approved', title: `Quote #${id} approved by customer` });

            res.json({ message: 'Quote approved! It is now being processed as an order.' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Customer rejects a reviewed quote
    reject: async (req, res) => {
        const { id } = req.params;
        const email = req.user.email;
        try {
            const [quote] = await db.query('SELECT * FROM quotes WHERE id = ? AND (customer_email = ? OR user_id = ?)', [id, email, req.user.id]);
            if (!quote || quote.length === 0) return res.status(404).json({ error: 'Quote not found' });
            
            await db.query(
                'UPDATE quotes SET status = "cancelled", updated_at = NOW() WHERE id = ?',
                [id]
            );

            if (req.user) {
                await db.query(
                    'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
                    [req.user.id, 'REJECT_QUOTE', `User rejected quote ID: ${id}`]
                );
            }

            res.json({ message: 'Offer rejected.' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    // Admin updates quote with discount and delivery info
    updateQuoteDetails: async (req, res) => {
        const { id } = req.params;
        const { discount, estimated_delivery_date, status } = req.body;
        try {
            await db.query(
                'UPDATE quotes SET discount = ?, estimated_delivery_date = ?, status = ?, updated_at = NOW() WHERE id = ?',
                [discount || 0.00, estimated_delivery_date, status || 'reviewed', id]
            );
            res.json({ message: 'Quote details updated successfully' });
        } catch (err) {
            console.error('UPDATE_QUOTE_DETAILS_ERROR:', err);
            res.status(500).json({ error: err.message });
        }
    },

    // Admin confirms manual (in-store or check) payment receipt
    confirmManualPayment: async (req, res) => {
        const { id } = req.params;
        const { payment_method } = req.body; // 'in_store' | 'check'
        try {
            const [rows] = await db.query('SELECT * FROM quotes WHERE id = ?', [id]);
            if (!rows.length) return res.status(404).json({ error: 'Quote not found' });
            if (rows[0].status !== 'approved') {
                return res.status(400).json({ error: 'Only approved quotes can have payment confirmed' });
            }
            await db.query(
                'UPDATE quotes SET status = "paid", payment_method = ?, updated_at = NOW() WHERE id = ?',
                [payment_method || 'manual', id]
            );
            await db.query(
                'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
                [req.user.id, 'CONFIRM_MANUAL_PAYMENT', `Confirmed ${payment_method || 'manual'} payment for quote #${id}`]
            );
            res.json({ message: 'Payment confirmed. Order is now processing.' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Create a new quote request (form + quote_items)
    create: async (req, res) => {
        const { name, email, phone, details, items } = req.body;
        const userId = req.user ? req.user.id : null;
        
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Create Quote Master
            const [quoteResult] = await connection.query(
                'INSERT INTO quotes (customer_name, customer_email, customer_phone, details, user_id, status) VALUES (?, ?, ?, ?, ?, ?)',
                [name, email, phone, details, userId, 'pending']
            );
            const quoteId = quoteResult.insertId;

            // 2. Create Quote Items
            if (items && Array.isArray(items)) {
                for (const item of items) {
                    await connection.query(
                        'INSERT INTO quote_items (quote_id, product_id, quantity) VALUES (?, ?, ?)',
                        [quoteId, item.product_id, item.quantity]
                    );
                }
            }

            await connection.commit();

            // Notify admins
            await createNotification(
                'new_quote',
                `New Quote Request from ${name}`,
                `${name} (${email}) requested a quote with ${(items || []).length} item(s)`,
                null, null
            );
            const io = getIo();
            if (io) io.emit('admin:notification', { type: 'new_quote', title: `New quote request from ${name}` });

            res.status(201).json({ message: 'Quote request submitted successfully', quoteId });
        } catch (err) {
            await connection.rollback();
            console.error('CREATE_QUOTE_ERROR:', err);
            res.status(500).json({ error: err.message });
        } finally {
            connection.release();
        }
    }
};

module.exports = QuoteController;
