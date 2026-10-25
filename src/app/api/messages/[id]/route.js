import { prisma } from '@/lib/prisma';
import { route, ok, readJson, ApiError } from '@/lib/api';
import { messageUpdateSchema } from '@/lib/validators';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const PATCH = route(
  async (req, { params, user }) => {
    const { reply, isRead } = messageUpdateSchema.parse(await readJson(req));
    if (reply !== undefined && !can(user.role, 'messages', 'write')) {
      throw new ApiError(403, 'ليست لديك صلاحية للرد');
    }
    const data = {};
    if (isRead !== undefined) data.isRead = isRead;
    if (reply !== undefined) {
      data.reply = reply;
      data.repliedAt = reply ? new Date() : null;
      data.repliedById = reply ? user.id : null;
      data.isRead = true;
    }
    const message = await prisma.message.update({
      where: { id: params.id },
      data,
      include: { customer: { select: { id: true, name: true, phone: true } }, repliedBy: { select: { name: true } } },
    });
    return ok({ message });
  },
  { permission: ['messages', 'read'] }
);

export const DELETE = route(
  async (req, { params }) => {
    await prisma.message.delete({ where: { id: params.id } });
    return ok({ message: 'تم حذف الرسالة' });
  },
  { permission: ['messages', 'delete'] }
);
