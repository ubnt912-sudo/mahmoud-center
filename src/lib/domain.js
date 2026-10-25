// منطق الأعمال المشترك على الخادم
import { prisma } from './prisma';
import { ApiError } from './api';
import { waPhone } from './format';

export const EXPIRING_DAYS = 5;

/** يحدّث حالات اشتراكات الإنترنت تلقائياً حسب تاريخ الانتهاء (الموقوفة لا تتغير). */
export async function refreshSubscriptionStatuses(db = prisma) {
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRING_DAYS * 86400000);
  await db.$transaction([
    db.internetSubscription.updateMany({
      where: { status: { not: 'SUSPENDED' }, endDate: { lt: now } },
      data: { status: 'EXPIRED' },
    }),
    db.internetSubscription.updateMany({
      where: { status: { not: 'SUSPENDED' }, endDate: { gte: now, lte: soon } },
      data: { status: 'EXPIRING_SOON' },
    }),
    db.internetSubscription.updateMany({
      where: { status: { notIn: ['SUSPENDED', 'ACTIVE'] }, endDate: { gt: soon } },
      data: { status: 'ACTIVE' },
    }),
  ]);
}

export function computeSubStatus(endDate, current) {
  if (current === 'SUSPENDED') return 'SUSPENDED';
  const now = Date.now();
  const end = new Date(endDate).getTime();
  if (end < now) return 'EXPIRED';
  if (end <= now + EXPIRING_DAYS * 86400000) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

export function invoiceStatus(total, paid) {
  if (paid <= 0 && total > 0) return 'UNPAID';
  if (paid + 0.0001 >= total) return 'PAID';
  return 'PARTIAL';
}

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** يجد زبوناً بالرقم أو ينشئه (يُستخدم في الصيانة السريعة ونقطة البيع). */
export async function findOrCreateCustomer(tx, { customerId, customerName, customerPhone }) {
  if (customerId) {
    const c = await tx.customer.findUnique({ where: { id: customerId } });
    if (!c) throw new ApiError(404, 'الزبون غير موجود');
    return c;
  }
  if (!customerName || !customerPhone) throw new ApiError(400, 'اختر زبوناً أو أدخل الاسم ورقم الهاتف');
  const existing = await tx.customer.findFirst({ where: { phone: { in: [customerPhone, '0' + customerPhone.slice(3)] } } });
  if (existing) return existing;
  return tx.customer.create({ data: { name: customerName, phone: customerPhone } });
}

export function baseUrl(req) {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env && !env.includes('localhost')) return env.replace(/\/$/, '');
  try {
    const h = req?.headers;
    const host = h?.get('x-forwarded-host') || h?.get('host');
    const proto = h?.get('x-forwarded-proto') || 'https';
    if (host) return `${host.startsWith('localhost') ? 'http' : proto}://${host}`;
  } catch {}
  return (env || 'http://localhost:3000').replace(/\/$/, '');
}

export function portalLinks(req, customer) {
  const link = `${baseUrl(req)}/customer/${customer.customerToken}`;
  const text = encodeURIComponent(
    `أهلاً ${customer.name}\nهذا رابطك الخاص في محمود سنتر لمتابعة الصيانة والاشتراكات والفواتير:\n${link}`
  );
  return { customerLink: link, waLink: `https://wa.me/${waPhone(customer.phone)}?text=${text}` };
}
