import { prisma } from '@/lib/prisma';
import { route, ok, readJson, ApiError } from '@/lib/api';
import { invoicePaymentSchema } from '@/lib/validators';
import { invoiceStatus, round2 } from '@/lib/domain';

export const dynamic = 'force-dynamic';

const include = {
  customer: { select: { id: true, name: true, phone: true, address: true } },
  order: { include: { items: true, createdBy: { select: { name: true } } } },
};

export const GET = route(
  async (req, { params }) => {
    const invoice = await prisma.invoice.findUnique({ where: { id: params.id }, include });
    if (!invoice) throw new ApiError(404, 'الفاتورة غير موجودة');
    return ok({ invoice });
  },
  { permission: ['invoices', 'read'] }
);

// تسجيل دفعة على الفاتورة
export const PATCH = route(
  async (req, { params }) => {
    const { amount } = invoicePaymentSchema.parse(await readJson(req));
    const inv = await prisma.invoice.findUnique({ where: { id: params.id } });
    if (!inv) throw new ApiError(404, 'الفاتورة غير موجودة');
    if (inv.status === 'CANCELLED') throw new ApiError(400, 'الفاتورة ملغاة');
    const remaining = round2(inv.total - inv.paid);
    if (remaining <= 0) throw new ApiError(400, 'الفاتورة مدفوعة بالكامل');
    if (amount > remaining + 0.001) throw new ApiError(400, `المبلغ أكبر من المتبقي (${remaining})`);
    const paid = round2(inv.paid + amount);
    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: { paid, status: invoiceStatus(inv.total, paid) },
      include,
    });
    return ok({ invoice });
  },
  { permission: ['invoices', 'write'] }
);
