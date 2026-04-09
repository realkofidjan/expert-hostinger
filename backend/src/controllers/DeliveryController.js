const db = require('../config/db');

const DeliveryController = {
  // Public: used by checkout page
  getPublic: async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT id, region_name, delivery_fee, is_free FROM delivery_regions WHERE is_active = 1 ORDER BY is_free DESC, region_name ASC'
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Admin: all regions
  getAll: async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT * FROM delivery_regions ORDER BY is_free DESC, region_name ASC'
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    const { id } = req.params;
    const { delivery_fee, is_free, is_active } = req.body;
    try {
      await db.query(
        'UPDATE delivery_regions SET delivery_fee = ?, is_free = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
        [parseFloat(delivery_fee || 0), is_free ? 1 : 0, is_active !== false ? 1 : 0, id]
      );
      res.json({ message: 'Region updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = DeliveryController;
