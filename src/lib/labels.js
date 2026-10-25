// تسميات عربية وألوان للحالات (مشتركة مع الواجهة)

export const REPAIR_STATUS = {
  RECEIVED: { label: 'تم الاستلام', tone: 'slate', icon: '📥' },
  INSPECTING: { label: 'قيد الفحص', tone: 'blue', icon: '🔍' },
  WAITING_APPROVAL: { label: 'بانتظار الموافقة', tone: 'amber', icon: '⏳' },
  REPAIRING: { label: 'قيد الإصلاح', tone: 'orange', icon: '🛠️' },
  READY: { label: 'جاهز للتسليم', tone: 'green', icon: '✅' },
  DELIVERED: { label: 'تم التسليم', tone: 'navy', icon: '🤝' },
  CANCELLED: { label: 'ملغي', tone: 'red', icon: '✖️' },
};
export const REPAIR_FLOW = ['RECEIVED', 'INSPECTING', 'WAITING_APPROVAL', 'REPAIRING', 'READY', 'DELIVERED'];

export const SUB_STATUS = {
  ACTIVE: { label: 'فعّال', tone: 'green' },
  EXPIRING_SOON: { label: 'ينتهي قريباً', tone: 'amber' },
  EXPIRED: { label: 'منتهي', tone: 'red' },
  SUSPENDED: { label: 'موقوف', tone: 'slate' },
};

export const ISP_TYPE = { FTTH: 'فايبر FTTH', WIRELESS: 'لاسلكي Wireless' };

export const ORDER_STATUS = {
  NEW: { label: 'جديد', tone: 'blue' },
  REVIEWED: { label: 'تمت المراجعة', tone: 'slate' },
  PREPARING: { label: 'قيد التجهيز', tone: 'amber' },
  READY: { label: 'جاهز', tone: 'green' },
  CONTACTED: { label: 'تم التواصل', tone: 'orange' },
  COMPLETED: { label: 'مكتمل', tone: 'navy' },
  CANCELLED: { label: 'ملغي', tone: 'red' },
};

export const INVOICE_STATUS = {
  PAID: { label: 'مدفوعة', tone: 'green' },
  PARTIAL: { label: 'مدفوعة جزئياً', tone: 'amber' },
  UNPAID: { label: 'غير مدفوعة', tone: 'red' },
  CANCELLED: { label: 'ملغاة', tone: 'slate' },
};

export const CATEGORY = {
  NEW_PHONE: 'هواتف جديدة',
  USED_PHONE: 'هواتف مستعملة',
  EARBUDS: 'سماعات',
  CHARGER: 'شواحن وكيبلات',
  ACCESSORY: 'إكسسوارات',
  PARTS: 'قطع غيار',
  OTHER: 'أخرى',
};

export const MSG_TYPE = {
  REPAIR: 'صيانة',
  ORDER: 'طلب',
  PRICE: 'استفسار سعر',
  STOCK: 'توفر منتج',
  ISP: 'إنترنت',
  GENERAL: 'عام',
};

export const RATING = {
  EXCELLENT: { label: 'ممتاز', emoji: '🙂', tone: 'green' },
  NEUTRAL: { label: 'متوسط', emoji: '😐', tone: 'amber' },
  POOR: { label: 'سيئ', emoji: '🙁', tone: 'red' },
};

export const CUSTOMER_STATUS = {
  ACTIVE: { label: 'نشط', tone: 'green' },
  BLOCKED: { label: 'محظور', tone: 'red' },
};
