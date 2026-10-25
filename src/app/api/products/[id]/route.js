import { prisma } from '@/lib/prisma';
import { route, ok, readJson, ApiError } from '@/lib/api';
import { productUpdateSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export const GET = route(
  async (req, { params }) => {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 50, include: { user: { select: { name: true } } } },
      },
    });
    if (!product) throw new ApiError(404, 'المنتج غير موجود');
    return ok({ product });
  },
  { permission: ['products', 'read'] }
);

// ملاحظة: الكمية لا تُعدَّل من هنا — تُعدَّل عبر حركات المخزون فقط للحفاظ على السجل
export const PATCH = route(
  async (req, { params }) => {
    const data = productUpdateSchema.parse(await readJson(req));
    const product = await prisma.product.update({ where: { id: params.id }, data });
    return ok({ product });
  },
  { permission: ['products', 'write'] }
);

// إذا كان للمنتج مبيعات سابقة يتم تعطيله بدل حذفه
export const DELETE = route(
  async (req, { params }) => {
    const used = await prisma.orderItem.count({ where: { productId: params.id } });
    if (used > 0) {
      await prisma.product.update({ where: { id: params.id }, data: { isActive: false } });
      return ok({ archived: true, message: 'المنتج له مبيعات سابقة، تم تعطيله بدلاً من حذفه' });
    }
    await prisma.product.delete({ where: { id: params.id } });
    return ok({ message: 'تم حذف المنتج' });
  },
  { permission: ['products', 'delete'] }
);
