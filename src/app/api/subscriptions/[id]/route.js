import { prisma } from '@/lib/prisma';
import { route, ok, readJson, ApiError } from '@/lib/api';
import { subscriptionUpdateSchema } from '@/lib/validators';
import { computeSubStatus, round2 } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export const GET = route(
  async (req, { params }) => {
    const subscription = await prisma.internetSubscription.findUnique({
      where: { id: params.id },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
    if (!subscription) throw new ApiError(404, 'الاشتراك غير موجود');
    return ok({ subscription });
  },
  { permission: ['subscriptions', 'read'] }
);

// تعديل أو تجديد (renewDays يمدّد من تاريخ الانتهاء أو من اليوم إن كان منتهياً)
export const PATCH = route(
  async (req, { params }) => {
    const { renewDays, ...d } = subscriptionUpdateSchema.parse(await readJson(req));
    const current = await prisma.internetSubscription.findUnique({ where: { id: params.id } });
    if (!current) throw new ApiError(404, 'الاشتراك غير موجود');

    const data = { ...d };
    if (data.price !== undefined) data.price = round2(data.price);
    if (data.paid !== undefined) data.paid = round2(data.paid);
    if (data.startDate === null) delete data.startDate;
    if (data.endDate === null) delete data.endDate;

    if (renewDays) {
      const now = new Date();
      const from = current.endDate > now ? current.endDate : now;
      data.startDate = current.endDate > now ? current.startDate : now;
      data.endDate = new Date(from.getTime() + renewDays * 86400000);
      if (d.paid === undefined) data.paid = 0;
      if (data.status === undefined && current.status === 'SUSPENDED') data.status = 'ACTIVE';
    }

    const start = data.startDate ?? current.startDate;
    const end = data.endDate ?? current.endDate;
    if (end <= start) throw new ApiError(400, 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');

    const requested = data.status ?? current.status;
    data.status = requested === 'SUSPENDED' ? 'SUSPENDED' : computeSubStatus(end);

    const subscription = await prisma.internetSubscription.update({
      where: { id: params.id },
      data,
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
    return ok({ subscription });
  },
  { permission: ['subscriptions', 'write'] }
);

export const DELETE = route(
  async (req, { params }) => {
    await prisma.internetSubscription.delete({ where: { id: params.id } });
    return ok({ message: 'تم حذف الاشتراك' });
  },
  { permission: ['subscriptions', 'delete'] }
);
