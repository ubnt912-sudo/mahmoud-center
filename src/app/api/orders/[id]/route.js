import { prisma } from '@/lib/prisma';
import { route, ok, readJson, ApiError } from '@/lib/api';
import { orderUpdateSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const include = {
  customer: { select: { id: true, name: true, phone: true, customerToken: true } },
  items: { include: { product: { select: { sku: true } } } },
  invoice: true,
  createdBy: { select: { name: true } },
};

export const GET = route(
  async (req, { params }) => {
    const order = await prisma.order.findUnique({ where: { id: params.id }, include });
    if (!order) throw new ApiError(404, 'الطلب غير موجود');
    return ok({ order });
  },
  { permission: ['sales', 'read'] }
);

// تغيير الحالة؛ الإلغاء يعيد الكميات للمخزون ويلغي الفاتورة
export const PATCH = route(
  async (req, { params, user }) => {
    const { status, note } = orderUpdateSchema.parse(await readJson(req));
    const current = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true, invoice: true } });
    if (!current) throw new ApiError(404, 'الطلب غير موجود');
    if (current.status === 'CANCELLED' && status && status !== 'CANCELLED') {
      throw new ApiError(400, 'لا يمكن إعادة تفعيل طلب ملغي، أنشئ بيعاً جديداً');
    }

    const order = await prisma.$transaction(async (tx) => {
      if (status === 'CANCELLED' && current.status !== 'CANCELLED') {
        for (const it of current.items) {
          const p = await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } });
          await tx.inventoryTransaction.create({
            data: {
              productId: it.productId,
              type: 'IN',
              quantity: it.quantity,
              balanceAfter: p.stock,
              reason: `إلغاء طلب — إرجاع للمخزون`,
              orderId: current.id,
              userId: user.id,
            },
          });
        }
        if (current.invoice) {
          await tx.invoice.update({ where: { id: current.invoice.id }, data: { status: 'CANCELLED' } });
        }
      }
      return tx.order.update({
        where: { id: params.id },
        data: { ...(status ? { status } : {}), ...(note !== undefined ? { note } : {}) },
        include,
      });
    });
    return ok({ order });
  },
  { permission: ['sales', 'write'] }
);
