import { prisma } from '@/lib/prisma';
import { route, ok } from '@/lib/api';
import { loadPortalCustomer } from '@/lib/portal';

export const dynamic = 'force-dynamic';

// الإعلانات والمنتجات المعروضة لكل الزبائن (بدون أسعار الشراء)
export const GET = route(
  async (req, { params }) => {
    await loadPortalCustomer(params.token);
    const [posts, products] = await Promise.all([
      prisma.post.findMany({
        where: { isActive: true },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 30,
        select: { id: true, title: true, body: true, mediaType: true, mediaUrl: true, linkUrl: true, category: true, isPinned: true, createdAt: true },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: [{ isOffer: 'desc' }, { createdAt: 'desc' }],
        take: 300,
        select: { id: true, name: true, category: true, brand: true, model: true, description: true, images: true, sellPrice: true, oldPrice: true, stock: true, isOffer: true },
      }),
    ]);
    return ok({ posts, products: products.map(({ stock, ...p }) => ({ ...p, available: stock > 0 })) });
  },
  { permission: null }
);
