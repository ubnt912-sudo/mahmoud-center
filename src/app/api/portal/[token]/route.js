import { prisma } from '@/lib/prisma';
import { route, ok } from '@/lib/api';
import { loadPortalCustomer } from '@/lib/portal';
import { refreshSubscriptionStatuses } from '@/lib/domain';

export const dynamic = 'force-dynamic';

// بيانات الزبون فقط — بدون أي حقول داخلية (أسعار الشراء، ملاحظات الفني، الموظفين)
export const GET = route(
  async (req, { params }) => {
    const { id } = await loadPortalCustomer(params.token);
    await refreshSubscriptionStatuses();
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        name: true,
        phone: true,
        address: true,
        createdAt: true,
        repairs: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            number: true,
            deviceCompany: true,
            deviceModel: true,
            imei: true,
            issue: true,
            cost: true,
            paid: true,
            status: true,
            expectedDate: true,
            deliveredAt: true,
            createdAt: true,
            timeline: { orderBy: { createdAt: 'asc' }, select: { id: true, status: true, note: true, createdAt: true } },
          },
        },
        subscriptions: {
          orderBy: { endDate: 'desc' },
          select: { id: true, type: true, planName: true, speed: true, price: true, paid: true, startDate: true, endDate: true, status: true },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            number: true,
            totalAmount: true,
            discount: true,
            status: true,
            createdAt: true,
            items: { select: { id: true, name: true, quantity: true, price: true } },
            invoice: { select: { id: true, number: true, total: true, paid: true, status: true } },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, number: true, total: true, paid: true, status: true, createdAt: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { id: true, type: true, sender: true, content: true, reply: true, repliedAt: true, createdAt: true },
        },
        feedbacks: { orderBy: { createdAt: 'desc' }, take: 1, select: { rating: true, comment: true, createdAt: true } },
      },
    });
    await prisma.customer.update({ where: { id }, data: { lastVisit: new Date() } });
    return ok({ customer });
  },
  { permission: null }
);
