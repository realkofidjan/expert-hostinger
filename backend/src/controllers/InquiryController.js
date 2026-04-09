const db = require('../config/db');

const InquiryController = {
    // Get all inquiries (general contact)
    getAll: async (req, res) => {
        try {
            const page   = Math.max(1, parseInt(req.query.page)  || 1);
            const limit  = Math.min(100, parseInt(req.query.limit) || 20);
            const offset = (page - 1) * limit;
            const q      = req.query.q || '';
            const status = req.query.status || '';

            const conditions = [];
            const params = [];
            if (q) { conditions.push('(name LIKE ? OR email LIKE ? OR message LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
            if (status) { conditions.push('status = ?'); params.push(status); }
            const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

            const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM inquiries ${where}`, params);
            const [rows] = await db.query(
                `SELECT * FROM inquiries ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );
            res.json({ inquiries: rows, pagination: { total, pages: Math.ceil(total / limit), currentPage: page, limit } });
        } catch (err) {
            console.error('FETCH_INQUIRIES_ERROR:', err);
            res.status(500).json({ error: err.message });
        }
    },

    // Update inquiry status
    updateStatus: async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['unread', 'read', 'responded', 'closed'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }

        try {
            await db.query(
                'UPDATE inquiries SET status = ? WHERE id = ?',
                [status, id]
            );
            
            // Log action if user is present
            if (req.user) {
              await db.query(
                  'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
                  [req.user.id, 'UPDATE_INQUIRY_STATUS', `Updated inquiry ID: ${id} to ${status}`]
              );
            }

            res.json({ message: 'Inquiry status updated successfully' });
        } catch (err) {
            console.error('UPDATE_INQUIRY_ERROR:', err);
            res.status(500).json({ error: err.message });
        }
    },

    // Create a new general inquiry (contact form)
    create: async (req, res) => {
        const { name, email, phone, message, subject = 'Contact Form Inquiry', product_id = null } = req.body;
        const userId = req.user ? req.user.id : null;
        try {
            const [result] = await db.query(
                'INSERT INTO inquiries (name, email, phone, subject, message, product_id, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [name, email, phone, subject, message, product_id, 'unread', userId]
            );
            res.status(201).json({ message: 'Inquiry submitted successfully', inquiryId: result.insertId });
        } catch (err) {
            console.error('CREATE_INQUIRY_ERROR:', err);
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = InquiryController;
