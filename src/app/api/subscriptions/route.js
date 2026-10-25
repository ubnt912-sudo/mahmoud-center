import { prisma } from '@/lib/prisma';
import { route, ok, readJson, searchParams, pagination } from '@/lib/api';
import { subscriptionCreateSchema } from '@/lib/validators';
import { computeSubStatus, refreshSubscriptionStatuses, round2 } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export const GET = route(
  async (req) => {
    await refreshSubscriptionStatuses();
    const sp = searchParams(req);
    const q = sp.get('q')?.trim();
    const status = sp.get('status');
    const type = sp.get('type');
    const { take, skip, page } = pagination(sp);
    const where = {
      ...(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED'].includes(status) ? { status } : {}),
      ...(['FTTH', 'WIRELESS'].includes(type) ? { type } : {}),
      ...(q
        ? {
            OR: [
              { planName: { contains: q, mode: 'insensitive' } },
              { customer: { name: { contains: q, mode: 'insensitive' } } },
              { customer: { phone: { contains: q.replace(/\D/g, '') || q } } },
            ],
          }
        : {}),
    };
    const [subscriptions, total, counts] = await Promise.all([
      prisma.internetSubscription.findMany({
        where,
        orderBy: { endDate: 'asc' },
        take,
        skip,
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.internetSubscription.count({ where }),
      prisma.internetSubscription.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return ok({
      subscriptions,
      total,
      page,
      take,
      statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    });
  },
  { permission: ['subscriptions', 'read'] }
);

export const POST = route(
  async (req) => {
    const d = subscriptionCreateSchema.parse(await readJson(req));
    const subscription = await prisma.internetSubscription.create({
      data: {
        ...d,
        price: round2(d.price),
        paid: round2(d.paid),
        status: computeSubStatus(d.endDate, d.status),
      },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
    return ok({ subscription }, 201);
  },
  { permission: ['subscriptions', 'write'] }
);
