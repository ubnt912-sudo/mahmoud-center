import { prisma } from '@/lib/prisma';
import { route, ok, readJson, ApiError } from '@/lib/api';
import { repairUpdateSchema } from '@/lib/validators';
import { round2 } from '@/lib/domain';

export const dynamic = 'force-dynamic';

const include = {
  customer: { select: { id: true, name: true, phone: true, customerToken: true } },
  timeline: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true } } } },
};

export const GET = route(
  async (req, { params }) => {
    const repair = await prisma.repair.findUnique({ where: { id: params.id }, include });
    if (!repair) throw new ApiError(404, 'طلب الصيانة غير موجود');
    return ok({ repair });
  },
  { permission: ['repairs', 'read'] }
);

export const PATCH = route(
  async (req, { params, user }) => {
    const { status, note, ...fields } = repairUpdateSchema.parse(await readJson(req));
    const current = await prisma.repair.findUnique({ where: { id: params.id } });
    if (!current) throw new ApiError(404, 'طلب الصيانة غير موجود');

    const data = { ...fields };
    if (data.cost !== undefined) data.cost = round2(data.cost);
    if (data.paid !== undefined) data.paid = round2(data.paid);
    const statusChanged = status && status !== current.status;
    if (statusChanged) {
      data.status = status;
      data.deliveredAt = status === 'DELIVERED' ? new Date() : null;
    }

    const repair = await prisma.$transaction(async (tx) => {
      const updated = await tx.repair.update({ where: { id: params.id }, data });
      if (statusChanged || note) {
        await tx.repairTimeline.create({
          data: { repairId: params.id, status: statusChanged ? status : current.status, note: note ?? null, userId: user.id },
        });
      }
      return tx.repair.findUnique({ where: { id: updated.id }, include });
    });
    return ok({ repair });
  },
  { permission: ['repairs', 'write'] }
);

export const DELETE = route(
  async (req, { params }) => {
    await prisma.repair.delete({ where: { id: params.id } });
    return ok({ message: 'تم حذف طلب الصيانة' });
  },
  { permission: ['repairs', 'delete'] }
);
