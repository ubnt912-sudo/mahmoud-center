import { prisma } from '@/lib/prisma';
import { route, ok, readJson, searchParams, pagination, ApiError } from '@/lib/api';
import { inventoryAdjustSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

// GET /api/inventory?productId=&type=
export const GET = route(
  async (req) => {
    const sp = searchParams(req);
    const { take, skip, page } = pagination(sp, { take: 100 });
    const where = {
      ...(sp.get('productId') ? { productId: sp.get('productId') } : {}),
      ...(['IN', 'OUT'].includes(sp.get('type')) ? { type: sp.get('type') } : {}),
    };
    const [transactions, total, products] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { product: { select: { id: true, name: true, sku: true } }, user: { select: { name: true } } },
      }),
      prisma.inventoryTransaction.count({ where }),
      prisma.product.findMany({ where: { isActive: true }, select: { stock: true, minStock: true, costPrice: true, sellPrice: true } }),
    ]);
    const summary = {
      products: products.length,
      units: products.reduce((s, p) => s + p.stock, 0),
      stockCost: products.reduce((s, p) => s + p.stock * p.costPrice, 0),
      stockValue: products.reduce((s, p) => s + p.stock * p.sellPrice, 0),
      lowStock: products.filter((p) => p.stock <= p.minStock).length,
      outOfStock: products.filter((p) => p.stock === 0).length,
    };
    return ok({ transactions, total, page, take, summary });
  },
  { permission: ['inventory', 'read'] }
);

// تسوية يدوية: إدخال بضاعة أو إخراج (تالف/مرتجع/جرد)
export const POST = route(
  async (req, { user }) => {
    const { productId, type, quantity, reason } = inventoryAdjustSchema.parse(await readJson(req));
    const result = await prisma.$transaction(async (tx) => {
      let product;
      if (type === 'OUT') {
        const r = await tx.product.updateMany({
          where: { id: productId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (r.count === 0) {
          const p = await tx.product.findUnique({ where: { id: productId } });
          if (!p) throw new ApiError(404, 'المنتج غير موجود');
          throw new ApiError(400, `الكمية المتوفرة (${p.stock}) أقل من المطلوب إخراجه`);
        }
        product = await tx.product.findUnique({ where: { id: productId } });
      } else {
        product = await tx.product.update({ where: { id: productId }, data: { stock: { increment: quantity } } });
      }
      const transaction = await tx.inventoryTransaction.create({
        data: { productId, type, quantity, balanceAfter: product.stock, reason: reason ?? (type === 'IN' ? 'إدخال بضاعة' : 'إخراج يدوي'), userId: user.id },
      });
      return { product, transaction };
    });
    return ok(result, 201);
  },
  { permission: ['inventory', 'write'] }
);
