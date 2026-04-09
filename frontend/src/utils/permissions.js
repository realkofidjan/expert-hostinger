// Role-based permissions for the admin panel.
// admin    → full access
// sub-admin → content + operations, no users/settings/discounts/reset
// staff    → orders + inquiries + view-only catalog

const ROLE_PERMISSIONS = {
  admin: {
    manageCategories: true,
    manageBrands: true,
    manageProducts: true,
    manageDiscounts: true,
    manageOrders: true,
    manageInquiries: true,
    manageContent: true,   // blogs + projects
    manageLogs: true,
    manageUsers: true,
    manageSettings: true,
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
    resetDatabase: false,
  },
};

export const getPermissions = (role) => {
  const r = (role || '').toLowerCase();
  return ROLE_PERMISSIONS[r] || {};
};

export const useRole = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
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
