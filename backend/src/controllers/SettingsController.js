const db = require('../config/db');

const PUBLIC_KEYS = [
  'paystack_enabled', 'store_address', 'pickup_address',
  'bank_name', 'bank_branch', 'bank_account_number', 'bank_account_name',
  'momo_number', 'momo_network',
  'manual_payment_instructions', 'under_construction',
  // Contact & social — used by the main website
  'company_email', 'company_phone', 'company_secondary_phone',
  'business_hours',
  'social_instagram', 'social_facebook', 'social_twitter', 'social_linkedin',
];

const SettingsController = {
    // Public — anyone can read payment mode + instructions
    getPublic: async (req, res) => {
        try {
            const placeholders = PUBLIC_KEYS.map(() => '?').join(', ');
            const [rows] = await db.query(
                `SELECT setting_key, setting_value FROM settings WHERE setting_key IN (${placeholders})`,
                PUBLIC_KEYS
            );
            const settings = {};
            rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
            // Defaults if missing
            if (!('paystack_enabled' in settings)) settings.paystack_enabled = 'true';
            res.json(settings);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Admin — read all settings
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT setting_key, setting_value, updated_at FROM settings ORDER BY setting_key');
            const settings = {};
            rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
            res.json(settings);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Admin — update one or more settings
    update: async (req, res) => {
        const updates = req.body; // { key: value, ... }
        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            return res.status(400).json({ error: 'Request body must be a key-value object' });
        }
        try {
            for (const [key, value] of Object.entries(updates)) {
                await db.query(
                    `INSERT INTO settings (setting_key, setting_value, updated_by)
                     VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
                    [key, value ?? '', req.user.id]
                );
            }
            await db.query(
                'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
                [req.user.id, 'UPDATE_SETTINGS', `Updated: ${Object.keys(updates).join(', ')}`]
            );
            res.json({ message: 'Settings saved.' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};

module.exports = SettingsController;
