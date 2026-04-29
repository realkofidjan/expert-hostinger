const db = require('../config/db');

const ALL_PERMISSIONS = [
  { key: 'manageProducts',   label: 'Products',           desc: 'Create, edit, delete products & bulk import' },
  { key: 'manageCategories', label: 'Categories & Brands', desc: 'Manage product categories, subcategories, and brands' },
  { key: 'manageOrders',     label: 'Orders',              desc: 'Update order status and verify bank transfers' },
  { key: 'manageInquiries',  label: 'Inquiries',           desc: 'View and respond to customer inquiries' },
  { key: 'manageContent',    label: 'Content',             desc: 'Manage blog posts and projects' },
  { key: 'manageDiscounts',  label: 'Discounts & Sales',   desc: 'Create and manage discount codes and sales' },
  { key: 'manageLogs',       label: 'Logs & Analytics',    desc: 'View activity logs, finance dashboard' },
  { key: 'manageUsers',      label: 'Users',               desc: 'View, edit, and delete user accounts' },
  { key: 'manageSettings',   label: 'Settings',            desc: 'Change site settings and payment configuration' },
  { key: 'manageBackup',     label: 'Backup & Restore',    desc: 'Export and restore database backups' },
  { key: 'resetDatabase',    label: 'Reset Database',      desc: 'Permanently erase all operational data (Danger Zone)' },
];

const DEFAULTS = {
  'sub-admin': {
    manageProducts: true,
    manageCategories: true,
    manageOrders: true,
    manageInquiries: true,
    manageContent: true,
    manageDiscounts: false,
    manageLogs: true,
    manageUsers: false,
    manageSettings: false,
    manageBackup: false,
    resetDatabase: false,
  },
  staff: {
    manageProducts: false,
    manageCategories: false,
    manageOrders: true,
    manageInquiries: true,
    manageContent: false,
    manageDiscounts: false,
    manageLogs: true,
    manageUsers: false,
    manageSettings: false,
    manageBackup: false,
    resetDatabase: false,
  },
};

/**
 * @route GET /api/admin/permissions
 * Returns the full permission matrix for all non-admin roles
 */
const getPermissions = async (req, res) => {
  // Start with a fully-defaulted matrix so we always return something valid
  const matrix = { 'sub-admin': {}, staff: {} };
  for (const role of ['sub-admin', 'staff']) {
    for (const perm of ALL_PERMISSIONS) {
      matrix[role][perm.key] = DEFAULTS[role]?.[perm.key] ?? false;
    }
  }

  try {
    const [rows] = await db.query(
      'SELECT role, permission_key, enabled FROM role_permissions'
    );
    // Overlay DB values on top of defaults
    for (const row of rows) {
      if (matrix[row.role] !== undefined) {
        matrix[row.role][row.permission_key] = !!row.enabled;
      }
    }
  } catch (error) {
    // Table might not exist yet (migration pending) — return defaults with a warning
    console.warn('GET_PERMISSIONS_WARNING (returning defaults):', error.message);
  }

  res.json({ permissions: matrix, definitions: ALL_PERMISSIONS });
};

/**
 * @route PUT /api/admin/permissions
 * Update permissions for a specific role
 */
const updatePermissions = async (req, res) => {
  try {
    const { role, permissions } = req.body;

    if (!role || !permissions) {
      return res.status(400).json({ error: 'role and permissions are required' });
    }
    if (role === 'admin') {
      return res.status(400).json({ error: 'Admin permissions cannot be modified' });
    }
    if (!['sub-admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    for (const [key, enabled] of Object.entries(permissions)) {
      await db.query(
        `INSERT INTO role_permissions (role, permission_key, enabled)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
        [role, key, enabled ? 1 : 0]
      );
    }

    await db.query(
      'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
      [req.user.id, 'UPDATE_PERMISSIONS', `Updated permissions for role: ${role}`]
    );

    res.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('UPDATE_PERMISSIONS_ERROR:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = { getPermissions, updatePermissions, ALL_PERMISSIONS, DEFAULTS };
