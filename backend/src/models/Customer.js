const db = require('../config/db');

/**
 * Customer Model (Refactored to use 'users' table with role='customer')
 */
const Customer = {
    /**
     * @desc    Find or create a customer by email in the users table
     */
    findOrCreate: async (data) => {
        const { email, first_name, last_name, full_name, phone } = data;
        const finalName = full_name || `${first_name || ''} ${last_name || ''}`.trim();
        
        const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (rows.length > 0) {
            return rows[0].id;
        }

        const [result] = await db.query(
            'INSERT INTO users (full_name, email, phone, role, status) VALUES (?, ?, ?, "customer", "active")',
            [finalName, email, phone]
        );
        return result.insertId;
    },

    /**
     * @desc    Get all users with customer role
     */
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM users WHERE role = "customer" ORDER BY created_at DESC');
        return rows;
    }
};

module.exports = Customer;
