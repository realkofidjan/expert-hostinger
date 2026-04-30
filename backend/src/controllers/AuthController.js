const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createNotification } = require('./NotificationController');
const { getIo } = require('../utils/socket');
const { sendMail } = require('../utils/mailer');

const logPath = path.join(__dirname, '../../auth_debug.log');
const logToFile = (message) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
};

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// ─── helpers ─────────────────────────────────────────────────────────────────
const makeToken = () => crypto.randomBytes(32).toString('hex');

const verificationEmailHtml = (name, verifyUrl) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
  <style>
    body { margin: 0; padding: 0; background: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.06); }
    .header { background: #111827; padding: 36px 40px; text-align: center; }
    .header h1 { color: #fff; font-size: 13px; font-weight: 900; letter-spacing: .2em; text-transform: uppercase; margin: 0; }
    .body { padding: 40px; }
    .greeting { font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 12px; }
    .text { font-size: 15px; color: #6b7280; line-height: 1.6; margin: 0 0 32px; }
    .btn { display: inline-block; background: #16a34a; color: #fff !important; font-size: 12px; font-weight: 900; letter-spacing: .2em; text-transform: uppercase; text-decoration: none; padding: 16px 36px; border-radius: 12px; }
    .divider { border: none; border-top: 1px solid #f1f5f9; margin: 32px 0; }
    .fallback { font-size: 12px; color: #9ca3af; word-break: break-all; }
    .fallback a { color: #16a34a; }
    .footer { background: #f8fafc; padding: 24px 40px; text-align: center; }
    .footer p { font-size: 11px; color: #9ca3af; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Expert Office Furnish</h1>
    </div>
    <div class="body">
      <p class="greeting">Hi ${name},</p>
      <p class="text">
        Thanks for creating an account. To complete your registration and start shopping,
        please verify your email address by clicking the button below.
        This link expires in <strong>24 hours</strong>.
      </p>
      <a href="${verifyUrl}" class="btn">Verify Email Address</a>
      <hr class="divider" />
      <p class="fallback">
        If the button doesn't work, copy and paste this link into your browser:<br />
        <a href="${verifyUrl}">${verifyUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p style="margin-top:8px">&copy; ${new Date().getFullYear()} Expert Office Furnish &middot; Accra, Ghana</p>
    </div>
  </div>
</body>
</html>
`;

// ─── register ─────────────────────────────────────────────────────────────────
const register = async (req, res) => {
    const { full_name, email, phone, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const userExists = await User.findByEmail(email);
        if (userExists) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = makeToken();
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const db = require('../config/db');
        const [result] = await db.query(
            `INSERT INTO users (full_name, email, phone, password, role, email_verified, verification_token, verification_token_expires)
             VALUES (?, ?, ?, ?, 'customer', 0, ?, ?)`,
            [full_name, email, phone, hashedPassword, verificationToken, tokenExpiry]
        );

        // Send verification email
        const verifyUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
        const displayName = full_name || email.split('@')[0];
        try {
            await sendMail({
                to: email,
                subject: 'Verify your Expert Office account',
                html: verificationEmailHtml(displayName, verifyUrl),
                text: `Hi ${displayName},\n\nPlease verify your email by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
            });
        } catch (mailErr) {
            logToFile(`VERIFY_EMAIL_SEND_ERROR: ${mailErr.message}`);
            // Account is created even if email fails — don't block registration
        }

        // Notify admins
        try {
            await createNotification('new_user', 'New Customer Registration', `${displayName} just created an account`, null, null);
            const io = getIo();
            if (io) io.emit('admin:notification', { type: 'new_user', title: `New customer: ${displayName}` });
        } catch { /* non-critical */ }

        res.status(201).json({
            message: 'Account created! Please check your email to verify your address before signing in.',
            userId: result.insertId,
        });
    } catch (error) {
        logToFile(`REGISTER_ERROR: ${error.message}`);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// ─── verifyEmail ──────────────────────────────────────────────────────────────
const verifyEmail = async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token is required' });

    try {
        const db = require('../config/db');
        const [[user]] = await db.query(
            `SELECT * FROM users WHERE verification_token = ?
             AND (verification_token_expires IS NULL OR verification_token_expires > NOW())`,
            [token]
        );

        if (!user) {
            return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
        }

        await db.query(
            `UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?`,
            [user.id]
        );

        const jwtToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
        );

        logToFile(`VERIFY_EMAIL_SUCCESS: email=${user.email}`);
        res.json({
            message: 'Email verified successfully! Welcome to Expert Office.',
            token: jwtToken,
            user: { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role },
        });
    } catch (error) {
        logToFile(`VERIFY_EMAIL_ERROR: ${error.message}`);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// ─── resendVerification ───────────────────────────────────────────────────────
const resendVerification = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        const user = await User.findByEmail(email);

        // Always return success to prevent email enumeration
        if (!user || user.email_verified) {
            return res.json({ message: 'If that account exists and is unverified, a new link has been sent.' });
        }

        const db = require('../config/db');
        const verificationToken = makeToken();
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.query(
            `UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?`,
            [verificationToken, tokenExpiry, user.id]
        );

        const verifyUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
        const displayName = user.full_name || email.split('@')[0];
        await sendMail({
            to: email,
            subject: 'Verify your Expert Office account',
            html: verificationEmailHtml(displayName, verifyUrl),
            text: `Hi ${displayName},\n\nPlease verify your email by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
        });

        res.json({ message: 'If that account exists and is unverified, a new link has been sent.' });
    } catch (error) {
        logToFile(`RESEND_VERIFY_ERROR: ${error.message}`);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── login ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        logToFile(`LOGIN_ATTEMPT: email=${email}`);

        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });
        }

        // Block unverified accounts (Google users are always verified)
        if (!user.email_verified && !user.google_id) {
            logToFile(`LOGIN_FAIL: Unverified email=${email}`);
            return res.status(403).json({
                error: 'Please verify your email address before signing in. Check your inbox for the verification link.',
                unverified: true,
                email: user.email,
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logToFile('LOGIN_FAIL: Password mismatch');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in environment variables.');
        }

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
                role: user.role,
            },
        });
    } catch (error) {
        logToFile(`LOGIN_ERROR: ${error.message}\nStack: ${error.stack}`);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

// ─── getMe ────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        logToFile(`GET_ME_ERROR: ${error.message}`);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// ─── googleAuth ───────────────────────────────────────────────────────────────
const googleAuth = async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'Google access token is required' });

    try {
        const { data: gUser } = await axios.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            { headers: { Authorization: `Bearer ${access_token}` } }
        );
        const { sub: googleId, email, name, picture } = gUser;

        if (!email) return res.status(400).json({ error: 'Could not retrieve email from Google account' });

        const db = require('../config/db');
        let user = await User.findByEmail(email);

        if (user) {
            if (!user.google_id) {
                await db.query(
                    'UPDATE users SET google_id = ?, avatar = ?, email_verified = 1 WHERE id = ?',
                    [googleId, picture || null, user.id]
                );
            } else {
                await db.query('UPDATE users SET email_verified = 1 WHERE id = ? AND email_verified = 0', [user.id]);
            }
            if (user.status === 'suspended') {
                return res.status(403).json({ error: 'Your account has been suspended.' });
            }
        } else {
            const [result] = await db.query(
                `INSERT INTO users (full_name, email, google_id, avatar, role, password, email_verified)
                 VALUES (?, ?, ?, ?, 'customer', NULL, 1)`,
                [name || email.split('@')[0], email, googleId, picture || null]
            );
            user = await User.findById(result.insertId);

            try {
                await createNotification('new_user', 'New Customer (Google)', `${name || email} signed up via Google`, null, null);
                const io = getIo();
                if (io) io.emit('admin:notification', { type: 'new_user', title: `New Google customer: ${name || email}` });
            } catch { /* non-critical */ }
        }

        const freshUser = await User.findByEmail(email);

        const token = jwt.sign(
            { id: freshUser.id, email: freshUser.email, role: freshUser.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
        );

        res.json({
            token,
            user: {
                id: freshUser.id,
                full_name: freshUser.full_name,
                email: freshUser.email,
                phone: freshUser.phone,
                role: freshUser.role,
                avatar: freshUser.avatar || picture || null,
            },
        });
    } catch (err) {
        logToFile(`GOOGLE_AUTH_ERROR: ${err.message}`);
        res.status(401).json({ error: 'Google authentication failed. Please try again.' });
    }
};

module.exports = { register, login, getMe, googleAuth, verifyEmail, resendVerification };
