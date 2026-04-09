const db = require('../config/db');

let _enabled = false;
let _lastCheck = 0;
const TTL = 5000; // re-check DB every 5 seconds

const refresh = async () => {
  try {
    const [rows] = await db.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'under_construction' LIMIT 1"
    );
    _enabled = rows[0]?.setting_value === 'true';
    _lastCheck = Date.now();
  } catch { /* keep last known value */ }
};

// Prime the cache once at startup
setTimeout(refresh, 1000);

const underConstruction = async (req, res, next) => {
  // Always pass through: admin API, auth, static assets, settings (so frontend can read the flag)
  if (
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/auth') ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/assets') ||
    req.path === '/api/settings'
  ) {
    return next();
  }

  if (Date.now() - _lastCheck > TTL) await refresh();

  if (_enabled) {
    // For API calls return JSON; for page requests let SPA handle it
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({ error: 'Site is under construction', under_construction: true });
    }
  }

  next();
};

module.exports = underConstruction;
