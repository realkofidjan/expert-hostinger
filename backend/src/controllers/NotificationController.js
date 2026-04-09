const db = require('../config/db');

const ensureTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      order_id INT DEFAULT NULL,
      order_number VARCHAR(100) DEFAULT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const NotificationController = {
  getAll: async (req, res) => {
    try {
      await ensureTable();
      const [rows] = await db.query(
        'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
      );
      const unreadCount = rows.filter(r => !r.is_read).length;
      res.json({ notifications: rows, unreadCount });
    } catch (err) {
      console.error('GET_NOTIFICATIONS_ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  },

  markRead: async (req, res) => {
    const { id } = req.params;
    try {
      await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
      res.json({ message: 'Marked as read' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  markAllRead: async (req, res) => {
    try {
      await db.query('UPDATE notifications SET is_read = 1');
      res.json({ message: 'All marked as read' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

// Internal helper — called from OrderController, not exposed as a route
const createNotification = async (type, title, message, orderId = null, orderNumber = null) => {
  try {
    await ensureTable();
    await db.query(
      'INSERT INTO notifications (type, title, message, order_id, order_number) VALUES (?, ?, ?, ?, ?)',
      [type, title, message, orderId, orderNumber]
    );
  } catch (err) {
    console.error('CREATE_NOTIFICATION_ERROR:', err);
  }
};

module.exports = { NotificationController, createNotification };
