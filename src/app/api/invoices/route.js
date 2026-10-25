import { prisma } from '@/lib/prisma';
import { route, ok, searchParams, pagination } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = route(
  async (req) => {
    const sp = searchParams(req);
    const q = sp.get('q')?.trim();
    const status = sp.get('status');
    const { take, skip, page } = pagination(sp);
    const num = q && /^\d+$/.test(q.replace(/^INV-?/i, '')) ? parseInt(q.replace(/^INV-?/i, ''), 10) : null;
    const where = {
      ...(['PAID', 'PARTIAL', 'UNPAID', 'CANCELLED'].includes(status) ? { status } : {}),
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
    const [invoices, total, agg] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({ where: { status: { not: 'CANCELLED' } }, _sum: { total: true, paid: true } }),
    ]);
    const totals = {
      total: agg._sum.total || 0,
      paid: agg._sum.paid || 0,
      remaining: (agg._sum.total || 0) - (agg._sum.paid || 0),
    };
    return ok({ invoices, total, page, take, totals });
  },
  { permission: ['invoices', 'read'] }
);
