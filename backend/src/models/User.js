const db = require('../config/db');

const User = {
    /**
     * @desc    Find a user by email
     * @param   {string} email
     * @returns {object|null}
     */
    findByEmail: async (email) => {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    },

    /**
     * @desc    Create a new user
     * @param   {object} userData
     * @returns {number} insertId
     */
    create: async (userData) => {
        const { full_name, email, phone, password, role = 'customer' } = userData;
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            [full_name, email, phone, password, role]
        );
        return result.insertId;
    },

    /**
     * @desc    Get all administrative users
     */
    findAll: async () => {
        const [rows] = await db.query('SELECT id, full_name, email, phone, role, status, created_at FROM users ORDER BY created_at DESC');
        return rows;
    },

    /**
     * @desc    Update user details
     */
    update: async (id, userData) => {
        const { full_name, email, phone, role, status } = userData;
        const [result] = await db.query(
            'UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, status = ? WHERE id = ?',
            [full_name, email, phone, role, status, id]
        );
        return result.affectedRows > 0;
    },

    /**
     * @desc    Find a user by ID
     * @param   {number|string} id
     * @returns {object|null}
     */
    findById: async (id) => {
        const [rows] = await db.query(
            'SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }
};

module.exports = User;
