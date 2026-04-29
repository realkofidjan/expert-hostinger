// Role-based permissions for the admin panel.
// admin    → full access (always, not stored in DB)
// sub-admin / staff → governed by the role_permissions table (loaded from API)
//
// The module keeps a local in-memory cache that is populated the first time
// fetchRolePermissions() is called. Components should call that once on mount.

import api from '../api';

// ── Hardcoded fallbacks (used when DB table is empty / API unreachable) ─────────
const ROLE_PERMISSIONS_FALLBACK = {
  admin: {
    manageCategories: true,
    manageBrands: true,
    manageProducts: true,
    manageDiscounts: true,
    manageOrders: true,
    manageInquiries: true,
    manageContent: true,
    manageLogs: true,
    manageUsers: true,
    manageSettings: true,
    manageBackup: true,
    resetDatabase: true,
  },
  'sub-admin': {
    manageCategories: true,
    manageBrands: true,
    manageProducts: true,
    manageDiscounts: false,
    manageOrders: true,
    manageInquiries: true,
    manageContent: true,
    manageLogs: true,
    manageUsers: false,
    manageSettings: false,
    manageBackup: false,
    resetDatabase: false,
  },
  staff: {
    manageCategories: false,
    manageBrands: false,
    manageProducts: false,
    manageDiscounts: false,
    manageOrders: true,
    manageInquiries: true,
    manageContent: false,
    manageLogs: true,
    manageUsers: false,
    manageSettings: false,
    manageBackup: false,
    resetDatabase: false,
  },
};

// ── In-memory cache (populated by fetchRolePermissions) ──────────────────────
let _cachedPermissions = null; // { 'sub-admin': {...}, staff: {...} }

/**
 * Fetch live role permissions from the API (admin-only endpoint).
 * Results are cached in memory for the page lifecycle.
 * Returns the permissions matrix or null on failure.
 */
export const fetchRolePermissions = async () => {
  try {
    const res = await api.get('/admin/permissions');
    _cachedPermissions = res.data.permissions; // { 'sub-admin': {...}, staff: {...} }
    return _cachedPermissions;
  } catch {
    return null;
  }
};

/** Clear the permission cache (call after updating permissions) */
export const clearPermissionsCache = () => { _cachedPermissions = null; };

/**
 * Get the effective permission set for a role.
 * Uses API-fetched data when available, otherwise falls back to hardcoded defaults.
 * Admin always gets full access regardless.
 */
export const getPermissions = (role) => {
  const r = (role || '').toLowerCase();
  if (r === 'admin') return ROLE_PERMISSIONS_FALLBACK.admin;

  // Use cached API data if available
  if (_cachedPermissions && _cachedPermissions[r]) {
    return _cachedPermissions[r];
  }

  // Fall back to hardcoded defaults
  return ROLE_PERMISSIONS_FALLBACK[r] || {};
};

export const useRole = () => {
  const user = JSON.parse(localStorage.getItem('admin_user') || localStorage.getItem('user') || '{}');
  const role = (user.role || '').toLowerCase();
  const permissions = getPermissions(role);
  return {
    role,
    isAdmin: role === 'admin',
    isSubAdmin: role === 'sub-admin',
    isStaff: role === 'staff',
    can: (key) => !!permissions[key],
    permissions,
  };
};
