import { prisma } from '@/lib/prisma';
import { route, ok, readJson, searchParams, pagination, ApiError } from '@/lib/api';
import { orderCreateSchema, ORDER_STATUSES } from '@/lib/validators';
import { findOrCreateCustomer, invoiceStatus, round2 } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export const GET = route(
  async (req) => {
    const sp = searchParams(req);
    const q = sp.get('q')?.trim();
    const status = sp.get('status');
    const { take, skip, page } = pagination(sp);
    const num = q && /^\d+$/.test(q.replace(/^ORD-?/i, '')) ? parseInt(q.replace(/^ORD-?/i, ''), 10) : null;
    const where = {
      ...(status && ORDER_STATUSES.includes(status) ? { status } : {}),
      ...(q
        ? {
            OR: [
              { customer: { name: { contains: q, mode: 'insensitive' } } },
              { customer: { phone: { contains: q.replace(/\D/g, '').replace(/^0+/, '') || q } } },
              ...(num && num < 2147483647 ? [{ number: num }] : []),
            ],
          }
        : {}),
    };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          invoice: { select: { id: true, number: true, paid: true, total: true, status: true } },
          _count: { select: { items: true } },
          createdBy: { select: { name: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return ok({ orders, total, page, take });
  },
  { permission: ['sales', 'read'] }
);

/**
 * نقطة البيع: إنشاء طلب + فاتورة + خصم المخزون في معاملة واحدة.
 * يتم التحقق من المخزون بشكل ذري لمنع البيع بأكثر من المتوفر.
 */
export const POST = route(
  async (req, { user }) => {
    const d = orderCreateSchema.parse(await readJson(req));

    // دمج الأسطر المكررة لنفس المنتج
    const merged = new Map();
    for (const it of d.items) {
      const prev = merged.get(it.productId);
      merged.set(it.productId, { ...it, quantity: (prev?.quantity || 0) + it.quantity });
    }
    const items = [...merged.values()];

    const result = await prisma.$transaction(
      async (tx) => {
        const customer = await findOrCreateCustomer(tx, d);
        if (customer.status === 'BLOCKED') throw new ApiError(400, 'هذا الزبون محظور');

        const products = await tx.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
        const byId = new Map(products.map((p) => [p.id, p]));

        const lines = items.map((it) => {
          const p = byId.get(it.productId);
          if (!p || !p.isActive) throw new ApiError(400, 'أحد المنتجات غير متوفر أو معطل');
          return { product: p, quantity: it.quantity, price: round2(it.price ?? p.sellPrice) };
        });

        const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
        const discount = round2(Math.min(d.discount, subtotal));
        const total = round2(subtotal - discount);
        const paid = round2(Math.min(d.paid, total));

        // خصم المخزون ذرياً
        for (const l of lines) {
          const r = await tx.product.updateMany({
            where: { id: l.product.id, stock: { gte: l.quantity } },
            data: { stock: { decrement: l.quantity } },
          });
          if (r.count === 0) {
            const fresh = await tx.product.findUnique({ where: { id: l.product.id }, select: { stock: true } });
            throw new ApiError(400, `الكمية غير كافية للمنتج "${l.product.name}" — المتوفر: ${fresh?.stock ?? 0}`);
          }
        }

        const order = await tx.order.create({
          data: {
            customerId: customer.id,
            subtotal,
            discount,
            totalAmount: total,
            status: 'COMPLETED',
            note: d.note ?? null,
            createdById: user.id,
            items: {
              create: lines.map((l) => ({
                productId: l.product.id,
                name: l.product.name,
                quantity: l.quantity,
                price: l.price,
                costPrice: l.product.costPrice,
              })),
            },
          },
        });

        const invoice = await tx.invoice.create({
          data: { orderId: order.id, customerId: customer.id, total, paid, status: invoiceStatus(total, paid) },
        });

        for (const l of lines) {
          const fresh = await tx.product.findUnique({ where: { id: l.product.id }, select: { stock: true } });
          await tx.inventoryTransaction.create({
            data: {
              productId: l.product.id,
              type: 'OUT',
              quantity: l.quantity,
              balanceAfter: fresh.stock,
              reason: `بيع — فاتورة ${invoice.number}`,
              orderId: order.id,
              userId: user.id,
            },
          });
        }

        await tx.customer.update({ where: { id: customer.id }, data: { lastVisit: new Date() } });
        return { order, invoice, customer };
      },
      { timeout: 15000 }
    );

    return ok(result, 201);
  },
  { permission: ['sales', 'write'] }
);
