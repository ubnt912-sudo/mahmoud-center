import { prisma } from '@/lib/prisma';
import { route, ok, readJson, ApiError } from '@/lib/api';
import { customerUpdateSchema } from '@/lib/validators';
import { portalLinks, refreshSubscriptionStatuses } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export const GET = route(
  async (req, { params }) => {
    await refreshSubscriptionStatuses();
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        repairs: { orderBy: { createdAt: 'desc' }, include: { timeline: { orderBy: { createdAt: 'asc' } } } },
        orders: { orderBy: { createdAt: 'desc' }, include: { items: true, invoice: true } },
        subscriptions: { orderBy: { endDate: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
        messages: { orderBy: { createdAt: 'desc' } },
        feedbacks: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) throw new ApiError(404, 'الزبون غير موجود');
    return ok({ customer, ...portalLinks(req, customer) });
  },
  { permission: ['customers', 'read'] }
);

export const PATCH = route(
  async (req, { params }) => {
    const data = customerUpdateSchema.parse(await readJson(req));
    if (data.status === 'BLOCKED') data.blockedAt = new Date();
    if (data.status === 'ACTIVE') {
      data.blockedAt = null;
      data.blockReason = null;
    }
    const customer = await prisma.customer.update({ where: { id: params.id }, data });
    return ok({ customer });
  },
  { permission: ['customers', 'write'] }
);

export const DELETE = route(
  async (req, { params }) => {
    const c = await prisma.customer.findUnique({
      where: { id: params.id },
      include: { _count: { select: { repairs: true, orders: true, subscriptions: true, invoices: true } } },
    });
    if (!c) throw new ApiError(404, 'الزبون غير موجود');
    const { repairs, orders, subscriptions, invoices } = c._count;
    if (repairs + orders + subscriptions + invoices > 0) {
      throw new ApiError(409, 'لا يمكن حذف زبون لديه سجلات (صيانة/طلبات/اشتراكات). يمكنك حظره بدلاً من ذلك.');
    }
    await prisma.customer.delete({ where: { id: params.id } });
    return ok({ message: 'تم حذف الزبون' });
  },
  { permission: ['customers', 'delete'] }
);
