// أدوات مشتركة لمسارات الـAPI: مصادقة، صلاحيات، معالجة أخطاء
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ZodError } from 'zod';
import { prisma } from './prisma';
import { SESSION_COOKIE, verifySession } from './session';
import { can } from './permissions';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const ok = (data, status = 200) => NextResponse.json({ success: true, ...data }, { status });

const fail = (status, error, details) =>
  NextResponse.json({ success: false, error, ...(details ? { details } : {}) }, { status });

const FIELD_LABELS = {
  name: 'الاسم',
  phone: 'رقم الهاتف',
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  sku: 'رمز المنتج SKU',
  barcode: 'الباركود',
  customerId: 'الزبون',
  productId: 'المنتج',
  deviceCompany: 'الشركة',
  deviceModel: 'موديل الجهاز',
  issue: 'العطل',
  planName: 'اسم الباقة',
  speed: 'السرعة',
  price: 'السعر',
  startDate: 'تاريخ البداية',
  endDate: 'تاريخ الانتهاء',
  content: 'محتوى الرسالة',
  items: 'المنتجات',
  quantity: 'الكمية',
};

function zodToResponse(err) {
  const details = err.issues.map((i) => ({
    field: i.path.join('.'),
    message: i.message,
  }));
  const first = err.issues[0];
  const label = FIELD_LABELS[first?.path?.[0]] || first?.path?.join('.') || '';
  const message = label ? `${label}: ${first.message}` : first?.message || 'بيانات غير صالحة';
  return fail(400, message, details);
}

function prismaToResponse(err) {
  switch (err.code) {
    case 'P2002': {
      const target = [].concat(err.meta?.target || []).join(', ');
      const label = FIELD_LABELS[target] || target;
      return fail(409, label ? `القيمة مستخدمة مسبقاً: ${label}` : 'القيمة مستخدمة مسبقاً');
    }
    case 'P2025':
      return fail(404, 'السجل المطلوب غير موجود');
    case 'P2003':
      return fail(409, 'لا يمكن تنفيذ العملية لوجود سجلات مرتبطة');
    default:
      return null;
  }
}

/**
 * يلف معالج المسار: يتحقق من الجلسة والصلاحية ويعالج الأخطاء.
 * options.permission = ['resource', 'action'] أو null للمسارات العامة.
 */
export function route(handler, options = {}) {
  return async (req, ctx) => {
    try {
      let user = null;
      if (options.permission !== null) {
        user = await requireUser();
        if (options.permission) {
          const [resource, action] = options.permission;
          if (!can(user.role, resource, action)) {
            throw new ApiError(403, 'ليست لديك صلاحية لتنفيذ هذه العملية');
          }
        }
      }
      const params = ctx?.params ? await ctx.params : {};
      return await handler(req, { params, user });
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, err.message, err.details);
      if (err instanceof ZodError) return zodToResponse(err);
      if (err?.code && typeof err.code === 'string' && err.code.startsWith('P')) {
        const res = prismaToResponse(err);
        if (res) return res;
      }
      if (err instanceof SyntaxError) return fail(400, 'صيغة الطلب غير صحيحة (JSON)');
      console.error('[API ERROR]', err);
      return fail(500, 'حدث خطأ غير متوقع في الخادم، حاول مرة أخرى');
    }
  };
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token);
  if (!payload?.sub) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, isActive: true, phone: true },
  });
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, 'يجب تسجيل الدخول أولاً');
  return user;
}

export function assertCan(user, resource, action) {
  if (!can(user.role, resource, action)) {
    throw new ApiError(403, 'ليست لديك صلاحية لتنفيذ هذه العملية');
  }
}

export async function readJson(req) {
  const text = await req.text();
  if (!text) return {};
  return JSON.parse(text);
}

export function searchParams(req) {
  return new URL(req.url).searchParams;
}

export function pagination(sp, defaults = { take: 50 }) {
  const take = Math.min(Math.max(parseInt(sp.get('take') || defaults.take, 10) || defaults.take, 1), 200);
  const page = Math.max(parseInt(sp.get('page') || '1', 10) || 1, 1);
  return { take, skip: (page - 1) * take, page };
}
