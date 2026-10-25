import { prisma } from '@/lib/prisma';
import { route, ok, searchParams, pagination } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = route(
  async (req) => {
    const sp = searchParams(req);
    const { take, skip, page } = pagination(sp);
    const rating = sp.get('rating');
    const where = ['EXCELLENT', 'NEUTRAL', 'POOR'].includes(rating) ? { rating } : {};
    const [feedbacks, total, groups] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.feedback.count({ where }),
      prisma.feedback.groupBy({ by: ['rating'], _count: { _all: true } }),
    ]);
    const counts = { EXCELLENT: 0, NEUTRAL: 0, POOR: 0 };
    groups.forEach((g) => (counts[g.rating] = g._count._all));
    const all = counts.EXCELLENT + counts.NEUTRAL + counts.POOR;
    const satisfaction = all ? Math.round(((counts.EXCELLENT + counts.NEUTRAL * 0.5) / all) * 100) : 0;
    return ok({ feedbacks, total, page, take, counts, satisfaction });
  },
  { permission: ['feedback', 'read'] }
);
