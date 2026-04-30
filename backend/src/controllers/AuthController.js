const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createNotification } = require('./NotificationController');
const { getIo } = require('../utils/socket');

const logPath = path.join(__dirname, '../../auth_debug.log');
const logToFile = (message) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 */
const register = async (req, res) => {
    const { full_name, email, phone, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const userExists = await User.findByEmail(email);
        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userId = await User.create({
            full_name,
            email,
            phone,
            password: hashedPassword,
            role: 'customer'
        });

        // Notify admins
        await createNotification(
            'new_user',
            `New Customer Registration`,
            `${full_name || email} just created an account`,
            null, null
        );
        const io = getIo();
        if (io) io.emit('admin:notification', { type: 'new_user', title: `New customer: ${full_name || email}` });

        res.status(201).json({ message: 'User registered successfully', userId });
    } catch (error) {
        logToFile(`REGISTER_ERROR: ${error.message}`);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 */
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        logToFile(`LOGIN_ATTEMPT: email=${email}`);
        
        if (!email || !password) {
            logToFile('LOGIN_FAIL: Missing email or password');
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        const user = await User.findByEmail(email);
        
        if (!user) {
            logToFile(`LOGIN_FAIL: User not found for email=${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status === 'suspended') {
            logToFile(`LOGIN_FAIL: User suspended email=${email}`);
            return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });
        }

        logToFile(`LOGIN_DEBUG: Found user, role=${user.role}. Comparing passwords...`);
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logToFile('LOGIN_FAIL: Password mismatch');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!process.env.JWT_SECRET) {
            logToFile('LOGIN_FAIL: Missing JWT_SECRET');
            throw new Error('JWT_SECRET is not defined in environment variables.');
        }

        logToFile('LOGIN_DEBUG: Signing token...');
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
        );

        logToFile(`LOGIN_SUCCESS: email=${email}`);
        res.json({
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        logToFile(`LOGIN_ERROR: ${error.message}\nStack: ${error.stack}`);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            details: error.message
        });
    }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 */
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        logToFile(`GET_ME_ERROR: ${error.message}`);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

/**
 * @desc    Google OAuth sign-in / sign-up
 * @route   POST /api/auth/google
 */
const googleAuth = async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'Google access token is required' });

    try {
        // Verify access token by calling Google's userinfo endpoint
        const { data: gUser } = await axios.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            { headers: { Authorization: `Bearer ${access_token}` } }
        );
        const { sub: googleId, email, name, picture } = gUser;

        if (!email) return res.status(400).json({ error: 'Could not retrieve email from Google account' });

        const db = require('../config/db');

        // Look up user by email
        let user = await User.findByEmail(email);

        if (user) {
            // User exists — update google_id + avatar if not set
            if (!user.google_id) {
                await db.query('UPDATE users SET google_id = ?, avatar = ? WHERE id = ?', [googleId, picture || null, user.id]);
            }
            if (user.status === 'suspended') {
                return res.status(403).json({ error: 'Your account has been suspended.' });
            }
        } else {
            // New user — create account (no password required for Google accounts)
            const [result] = await db.query(
                'INSERT INTO users (full_name, email, google_id, avatar, role, password) VALUES (?, ?, ?, ?, ?, ?)',
                [name || email.split('@')[0], email, googleId, picture || null, 'customer', null]
            );
            user = await User.findById(result.insertId);

            // Notify admins
            try {
                const { createNotification } = require('./NotificationController');
                const { getIo } = require('../utils/socket');
                await createNotification('new_user', 'New Customer (Google)', `${name || email} signed up via Google`, null, null);
                const io = getIo();
                if (io) io.emit('admin:notification', { type: 'new_user', title: `New Google customer: ${name || email}` });
            } catch { /* non-critical */ }
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar || picture || null,
            }
        });
    } catch (err) {
        logToFile(`GOOGLE_AUTH_ERROR: ${err.message}`);
        res.status(401).json({ error: 'Google authentication failed. Please try again.' });
    }
};

module.exports = {
    register,
    login,
    getMe,
    googleAuth
};
