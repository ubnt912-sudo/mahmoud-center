import { prisma } from '@/lib/prisma';
import { route, ok, readJson, searchParams, pagination } from '@/lib/api';
import { messageCreateSchema, MSG_TYPES } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export const GET = route(
  async (req) => {
    const sp = searchParams(req);
    const q = sp.get('q')?.trim();
    const { take, skip, page } = pagination(sp);
    const filter = sp.get('filter'); // unread | unreplied
    const where = {
      ...(MSG_TYPES.includes(sp.get('type')) ? { type: sp.get('type') } : {}),
      ...(sp.get('customerId') ? { customerId: sp.get('customerId') } : {}),
      ...(filter === 'unread' ? { isRead: false, sender: 'CUSTOMER' } : {}),
      ...(filter === 'unreplied' ? { reply: null, sender: 'CUSTOMER' } : {}),
      ...(q
        ? {
            OR: [
              { content: { contains: q, mode: 'insensitive' } },
              { customer: { name: { contains: q, mode: 'insensitive' } } },
              { customer: { phone: { contains: q.replace(/\D/g, '') || q } } },
            ],
          }
        : {}),
    };
    const [messages, total, unread] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          repliedBy: { select: { name: true } },
        },
      }),
      prisma.message.count({ where }),
      prisma.message.count({ where: { isRead: false, sender: 'CUSTOMER' } }),
    ]);
    return ok({ messages, total, page, take, unread });
  },
  { permission: ['messages', 'read'] }
);

// رسالة من الموظف إلى الزبون (تظهر في بوابته)
export const POST = route(
  async (req) => {
    const d = messageCreateSchema.parse(await readJson(req));
    const message = await prisma.message.create({
      data: { ...d, sender: 'STAFF', isRead: true },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
    return ok({ message }, 201);
  },
  { permission: ['messages', 'write'] }
);
