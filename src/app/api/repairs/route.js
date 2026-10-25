import { prisma } from '@/lib/prisma';
import { route, ok, readJson, searchParams, pagination } from '@/lib/api';
import { repairCreateSchema, REPAIR_STATUSES } from '@/lib/validators';
import { findOrCreateCustomer, round2 } from '@/lib/domain';

export const dynamic = 'force-dynamic';

// GET /api/repairs?q=&status=&active=1
export const GET = route(
  async (req) => {
    const sp = searchParams(req);
    const q = sp.get('q')?.trim();
    const status = sp.get('status');
    const { take, skip, page } = pagination(sp);
    const num = q && /^\d+$/.test(q.replace(/^R-?/i, '')) ? parseInt(q.replace(/^R-?/i, ''), 10) : null;
    const where = {
      ...(status && REPAIR_STATUSES.includes(status) ? { status } : {}),
      ...(sp.get('active') === '1' ? { status: { notIn: ['DELIVERED', 'CANCELLED'] } } : {}),
      ...(q
        ? {
            OR: [
              { deviceModel: { contains: q, mode: 'insensitive' } },
              { deviceCompany: { contains: q, mode: 'insensitive' } },
              { imei: { contains: q } },
              { customer: { name: { contains: q, mode: 'insensitive' } } },
              { customer: { phone: { contains: q.replace(/\D/g, '').replace(/^0+/, '') || q } } },
              ...(num && num < 2147483647 ? [{ number: num }] : []),
            ],
          }
        : {}),
    };
    const [repairs, total, counts] = await Promise.all([
      prisma.repair.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.repair.count({ where }),
      prisma.repair.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const statusCounts = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
    return ok({ repairs, total, page, take, statusCounts });
  },
  { permission: ['repairs', 'read'] }
);

export const POST = route(
  async (req, { user }) => {
    const d = repairCreateSchema.parse(await readJson(req));
    const repair = await prisma.$transaction(async (tx) => {
      const customer = await findOrCreateCustomer(tx, d);
      return tx.repair.create({
        data: {
          customerId: customer.id,
          deviceCompany: d.deviceCompany,
          deviceModel: d.deviceModel,
          imei: d.imei ?? null,
          issue: d.issue,
          techNotes: d.techNotes ?? null,
          cost: round2(d.cost),
          paid: round2(d.paid),
          expectedDate: d.expectedDate ?? null,
          status: 'RECEIVED',
          timeline: { create: { status: 'RECEIVED', note: 'تم استلام الجهاز', userId: user.id } },
        },
        include: { customer: { select: { id: true, name: true, phone: true, customerToken: true } } },
      });
    });
    return ok({ repair }, 201);
  },
  { permission: ['repairs', 'write'] }
);
