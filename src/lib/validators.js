import { z } from 'zod';

const req = (msg = 'هذا الحقل مطلوب') => z.string({ required_error: msg, invalid_type_error: msg }).trim().min(1, msg);
const optStr = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (typeof v === 'string' ? v.trim() || null : v ?? undefined));
const money = z.coerce
  .number({ invalid_type_error: 'يجب أن يكون رقماً' })
  .min(0, 'لا يمكن أن يكون سالباً')
  .max(1_000_000_000, 'القيمة كبيرة جداً');
const optDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'تاريخ غير صالح' });
      return z.NEVER;
    }
    return d;
  });
const reqDate = z.union([z.string(), z.date()]).transform((v, ctx) => {
  const d = new Date(v);
  if (!v || isNaN(d.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'تاريخ غير صالح' });
    return z.NEVER;
  }
  return d;
});

export const phoneSchema = z
  .string({ required_error: 'رقم الهاتف مطلوب' })
  .transform((v) => v.replace(/[\s\-()]/g, '').replace(/^\+/, '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
  .refine((v) => /^\d{7,15}$/.test(v), 'رقم الهاتف غير صالح (7 إلى 15 رقماً)');

// ───────── Auth / Users
export const loginSchema = z.object({
  email: z.string({ required_error: 'البريد مطلوب' }).trim().toLowerCase().email('بريد إلكتروني غير صالح'),
  password: req('كلمة المرور مطلوبة'),
});

const ROLE = z.enum(['ADMIN', 'SALES', 'REPAIR', 'INTERNET_STAFF'], { errorMap: () => ({ message: 'دور غير صالح' }) });
const password = z
  .string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .max(100, 'كلمة المرور طويلة جداً');

export const userCreateSchema = z.object({
  name: req('الاسم مطلوب'),
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح'),
  password,
  phone: optStr,
  role: ROLE,
  isActive: z.boolean().optional(),
});

export const userUpdateSchema = z.object({
  name: req().optional(),
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح').optional(),
  password: z.union([password, z.literal('')]).optional(),
  phone: optStr,
  role: ROLE.optional(),
  isActive: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: req('كلمة المرور الحالية مطلوبة'),
  newPassword: password,
});

// ───────── Customers
export const customerCreateSchema = z.object({
  name: req('اسم الزبون مطلوب'),
  phone: phoneSchema,
  address: optStr,
  notes: optStr,
});

export const customerUpdateSchema = z.object({
  name: req().optional(),
  phone: phoneSchema.optional(),
  address: optStr,
  notes: optStr,
  status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
  blockReason: optStr,
});

// ───────── Repairs
export const REPAIR_STATUSES = ['RECEIVED', 'INSPECTING', 'WAITING_APPROVAL', 'REPAIRING', 'READY', 'DELIVERED', 'CANCELLED'];

export const repairCreateSchema = z
  .object({
    customerId: z.string().uuid('الزبون غير صالح').optional(),
    customerName: optStr,
    customerPhone: z.union([phoneSchema, z.literal(''), z.null()]).optional(),
    deviceCompany: req('الشركة مطلوبة'),
    deviceModel: req('موديل الجهاز مطلوب'),
    imei: optStr,
    issue: req('وصف العطل مطلوب'),
    techNotes: optStr,
    cost: money.optional().default(0),
    paid: money.optional().default(0),
    expectedDate: optDate,
  })
  .refine((d) => d.customerId || (d.customerName && d.customerPhone), {
    message: 'اختر زبوناً موجوداً أو أدخل اسم ورقم زبون جديد',
    path: ['customerId'],
  });

export const repairUpdateSchema = z.object({
  deviceCompany: req().optional(),
  deviceModel: req().optional(),
  imei: optStr,
  issue: req().optional(),
  techNotes: optStr,
  cost: money.optional(),
  paid: money.optional(),
  expectedDate: optDate,
  status: z.enum(REPAIR_STATUSES, { errorMap: () => ({ message: 'حالة غير صالحة' }) }).optional(),
  note: optStr,
});

// ───────── Products / Inventory
export const CATEGORIES = ['NEW_PHONE', 'USED_PHONE', 'EARBUDS', 'CHARGER', 'ACCESSORY', 'PARTS', 'OTHER'];

const images = z
  .union([z.array(z.string()), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return undefined;
    const arr = Array.isArray(v) ? v : v.split(/[\n,]+/);
    return arr.map((s) => s.trim()).filter(Boolean).slice(0, 10);
  })
  .refine((arr) => !arr || arr.every((u) => /^(https?:\/\/|\/)/.test(u)), 'روابط الصور يجب أن تبدأ بـ http أو /');

export const productCreateSchema = z
  .object({
    sku: req('رمز SKU مطلوب').transform((s) => s.toUpperCase()),
    barcode: optStr,
    name: req('اسم المنتج مطلوب'),
    category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'التصنيف غير صالح' }) }),
    brand: optStr,
    model: optStr,
    description: optStr,
    images,
    costPrice: money,
    sellPrice: money,
    oldPrice: z.union([z.literal(''), z.null(), money]).optional().transform((v) => (v === '' ? null : v)),
    stock: z.coerce.number().int('الكمية يجب أن تكون عدداً صحيحاً').min(0, 'لا يمكن أن تكون سالبة').optional().default(0),
    minStock: z.coerce.number().int().min(0).optional().default(5),
    isOffer: z.boolean().optional().default(false),
    isActive: z.boolean().optional(),
  });

export const productUpdateSchema = z.object({
  sku: req().transform((s) => s.toUpperCase()).optional(),
  barcode: optStr,
  name: req().optional(),
  category: z.enum(CATEGORIES).optional(),
  brand: optStr,
  model: optStr,
  description: optStr,
  images,
  costPrice: money.optional(),
  sellPrice: money.optional(),
  oldPrice: z.union([z.literal(''), z.null(), money]).optional().transform((v) => (v === '' ? null : v)),
  minStock: z.coerce.number().int().min(0).optional(),
  isOffer: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const inventoryAdjustSchema = z.object({
  productId: z.string().uuid('المنتج غير صالح'),
  type: z.enum(['IN', 'OUT'], { errorMap: () => ({ message: 'نوع الحركة غير صالح' }) }),
  quantity: z.coerce.number().int('الكمية يجب أن تكون عدداً صحيحاً').min(1, 'الكمية يجب أن تكون 1 على الأقل').max(100000),
  reason: optStr,
});

// ───────── Orders / POS
export const orderCreateSchema = z.object({
  customerId: z.string().uuid('اختر الزبون').optional(),
  customerName: optStr,
  customerPhone: z.union([phoneSchema, z.literal(''), z.null()]).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('منتج غير صالح'),
        quantity: z.coerce.number().int().min(1, 'الكمية يجب أن تكون 1 على الأقل').max(10000),
        price: money.optional(),
      })
    )
    .min(1, 'أضف منتجاً واحداً على الأقل'),
  discount: money.optional().default(0),
  paid: money.optional().default(0),
  note: optStr,
});

export const ORDER_STATUSES = ['NEW', 'REVIEWED', 'PREPARING', 'READY', 'CONTACTED', 'COMPLETED', 'CANCELLED'];
export const orderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES, { errorMap: () => ({ message: 'حالة غير صالحة' }) }).optional(),
  note: optStr,
});

export const invoicePaymentSchema = z.object({
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر').max(1_000_000_000),
});

// ───────── Subscriptions
export const subscriptionCreateSchema = z
  .object({
    customerId: z.string().uuid('اختر الزبون'),
    type: z.enum(['FTTH', 'WIRELESS'], { errorMap: () => ({ message: 'نوع الخدمة غير صالح' }) }),
    planName: req('اسم الباقة مطلوب'),
    speed: req('السرعة مطلوبة'),
    price: money,
    paid: money.optional().default(0),
    startDate: reqDate,
    endDate: reqDate,
    notes: optStr,
    status: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED']).optional(),
  })
  .refine((d) => d.endDate > d.startDate, { message: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية', path: ['endDate'] });

export const subscriptionUpdateSchema = z.object({
  type: z.enum(['FTTH', 'WIRELESS']).optional(),
  planName: req().optional(),
  speed: req().optional(),
  price: money.optional(),
  paid: money.optional(),
  startDate: optDate,
  endDate: optDate,
  notes: optStr,
  status: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED']).optional(),
  renewDays: z.coerce.number().int().min(1).max(3660).optional(),
});

// ───────── Messages / Feedback
export const MSG_TYPES = ['REPAIR', 'ORDER', 'PRICE', 'STOCK', 'ISP', 'GENERAL'];

export const messageCreateSchema = z.object({
  customerId: z.string().uuid('اختر الزبون'),
  type: z.enum(MSG_TYPES).default('GENERAL'),
  content: req('محتوى الرسالة مطلوب').pipe(z.string().max(2000, 'الرسالة طويلة جداً')),
  referenceId: optStr,
});

export const messageUpdateSchema = z.object({
  reply: optStr,
  isRead: z.boolean().optional(),
});

export const portalMessageSchema = z.object({
  type: z.enum(MSG_TYPES).default('GENERAL'),
  content: req('اكتب رسالتك').pipe(z.string().max(1000, 'الرسالة طويلة جداً')),
  referenceId: optStr,
});

export const feedbackSchema = z.object({
  rating: z.enum(['EXCELLENT', 'NEUTRAL', 'POOR'], { errorMap: () => ({ message: 'اختر تقييماً' }) }),
  comment: optStr.pipe(z.string().max(500, 'التعليق طويل جداً').nullable().optional()),
});
