import { prisma } from '@/lib/prisma';
import { route, ok, readJson, searchParams, pagination } from '@/lib/api';
import { productCreateSchema, CATEGORIES } from '@/lib/validators';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET /api/products?q=&category=&low=1&offer=1&active=1|0|all
export const GET = route(
  async (req, { user }) => {
    const sp = searchParams(req);
    const q = sp.get('q')?.trim();
    const category = sp.get('category');
    const active = sp.get('active') ?? '1';
    const { take, skip, page } = pagination(sp, { take: 100 });
    const where = {
      ...(active === 'all' ? {} : { isActive: active !== '0' }),
      ...(category && CATEGORIES.includes(category) ? { category } : {}),
      ...(sp.get('offer') === '1' ? { isOffer: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { barcode: q },
              { brand: { contains: q, mode: 'insensitive' } },
              { model: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    let products;
    let total;
    if (sp.get('low') === '1') {
      // المنتجات التي وصلت للحد الأدنى أو أقل (مقارنة بين عمودين)
      const all = await prisma.product.findMany({ where, orderBy: { stock: 'asc' } });
      const low = all.filter((p) => p.stock <= p.minStock);
      total = low.length;
      products = low.slice(skip, skip + take);
    } else {
      [products, total] = await Promise.all([
        prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
        prisma.product.count({ where }),
      ]);
    }
    // إخفاء سعر الشراء عمّن لا يملك صلاحية تعديل المنتجات
    if (!can(user.role, 'products', 'write')) products = products.map(({ costPrice, ...p }) => p);
    return ok({ products, total, page, take });
  },
  { permission: ['products', 'read'] }
);

export const POST = route(
  async (req, { user }) => {
    const { stock, ...data } = productCreateSchema.parse(await readJson(req));
    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({ data: { ...data, images: data.images || [], stock } });
      if (stock > 0) {
        await tx.inventoryTransaction.create({
          data: { productId: p.id, type: 'IN', quantity: stock, balanceAfter: stock, reason: 'رصيد افتتاحي', userId: user.id },
        });
      }
      return p;
    });
    return ok({ product }, 201);
  },
  { permission: ['products', 'write'] }
);
