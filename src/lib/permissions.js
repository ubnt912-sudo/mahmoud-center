// خريطة الصلاحيات — مشتركة بين الواجهة والخادم (بدون أي اعتماديات خادم)

export const ROLES = ['ADMIN', 'SALES', 'REPAIR', 'INTERNET_STAFF'];

export const ROLE_LABELS = {
  ADMIN: 'مدير النظام',
  SALES: 'موظف مبيعات',
  REPAIR: 'فني صيانة',
  INTERNET_STAFF: 'موظف إنترنت',
};

// read = مشاهدة، write = إضافة/تعديل، delete = حذف
const ALL = ['read', 'write', 'delete'];

export const PERMISSIONS = {
  ADMIN: {
    dashboard: ALL,
    customers: ALL,
    repairs: ALL,
    products: ALL,
    inventory: ALL,
    sales: ALL,
    invoices: ALL,
    subscriptions: ALL,
    messages: ALL,
    feedback: ALL,
    users: ALL,
    stats: ALL,
  },
  SALES: {
    dashboard: ['read'],
    customers: ['read', 'write'],
    products: ['read', 'write'],
    inventory: ['read', 'write'],
    sales: ['read', 'write'],
    invoices: ['read', 'write'],
    messages: ['read', 'write'],
    feedback: ['read'],
    repairs: ['read'],
    subscriptions: ['read'],
  },
  REPAIR: {
    dashboard: ['read'],
    customers: ['read', 'write'],
    repairs: ['read', 'write'],
    products: ['read'],
    inventory: ['read'],
    messages: ['read', 'write'],
    feedback: ['read'],
  },
  INTERNET_STAFF: {
    dashboard: ['read'],
    customers: ['read', 'write'],
    subscriptions: ['read', 'write'],
    messages: ['read', 'write'],
    feedback: ['read'],
  },
};

export function can(role, resource, action = 'read') {
  if (!role) return false;
  const perms = PERMISSIONS[role]?.[resource];
  return Array.isArray(perms) && perms.includes(action);
}
