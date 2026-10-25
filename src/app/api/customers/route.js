import { prisma } from '@/lib/prisma';
import { route, ok, readJson, searchParams, pagination } from '@/lib/api';
import { customerCreateSchema } from '@/lib/validators';
import { portalLinks } from '@/lib/domain';

export const dynamic = 'force-dynamic';

// GET /api/customers?q=&status=&page=&take=
export const GET = route(
  async (req) => {
    const sp = searchParams(req);
    const q = sp.get('q')?.trim();
    const status = sp.get('status');
    const { take, skip, page } = pagination(sp);
    const digits = q?.replace(/\D/g, '').replace(/^0+/, '');
    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              ...(digits ? [{ phone: { contains: digits } }] : []),
            ],
          }
        : {}),
    };
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { _count: { select: { repairs: true, orders: true, subscriptions: true, messages: true } } },
      }),
      prisma.customer.count({ where }),
    ]);
    return ok({ customers, total, page, take });
  },
  { permission: ['customers', 'read'] }
);

export const POST = route(
  async (req) => {
    const data = customerCreateSchema.parse(await readJson(req));
    const customer = await prisma.customer.create({ data });
    return ok({ customer, ...portalLinks(req, customer) }, 201);
  },
  { permission: ['customers', 'write'] }
);
