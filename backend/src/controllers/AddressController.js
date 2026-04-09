const db = require('../config/db');

const AddressController = {
  // Get all saved addresses for a user
  getMyAddresses: async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
        [req.user.id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GET_ADDRESSES_ERROR:', error);
      res.status(500).json({ error: 'Failed to fetch addresses' });
    }
  },

  // Save a new address
  saveAddress: async (req, res) => {
    try {
      const { address_line1, city, region, landmark, is_default } = req.body;
      const user_id = req.user.id;

      if (is_default) {
        await db.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [user_id]);
      }

      const [result] = await db.query(
        'INSERT INTO addresses (user_id, address_line1, city, region, delivery_instructions, is_default, country) VALUES (?, ?, ?, ?, ?, ?, "Ghana")',
        [user_id, address_line1, city, region, landmark, is_default ? 1 : 0]
      );

      res.json({ message: 'Address saved successfully', id: result.insertId });
    } catch (error) {
      console.error('SAVE_ADDRESS_ERROR:', error);
      res.status(500).json({ error: 'Failed to save address' });
    }
  },

  // Update an address
  updateAddress: async (req, res) => {
    try {
      const { id } = req.params;
      const { address_line1, city, region, landmark, is_default } = req.body;
      const user_id = req.user.id;

      if (is_default) {
        await db.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [user_id]);
      }

      await db.query(
        'UPDATE addresses SET address_line1 = ?, city = ?, region = ?, delivery_instructions = ?, is_default = ? WHERE id = ? AND user_id = ?',
        [address_line1, city, region, landmark, is_default ? 1 : 0, id, user_id]
      );

      res.json({ message: 'Address updated successfully' });
    } catch (error) {
      console.error('UPDATE_ADDRESS_ERROR:', error);
      res.status(500).json({ error: 'Failed to update address' });
    }
  },

  // Delete an address
  deleteAddress: async (req, res) => {
    try {
      await db.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      res.json({ message: 'Address deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete address' });
    }
  }
};

module.exports = AddressController;
