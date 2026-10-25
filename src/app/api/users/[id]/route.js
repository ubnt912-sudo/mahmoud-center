import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { route, ok, readJson, ApiError } from '@/lib/api';
import { userUpdateSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const select = { id: true, name: true, email: true, phone: true, role: true, isActive: true, lastLogin: true, createdAt: true };

async function ensureAnotherAdmin(excludeId) {
  const admins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true, id: { not: excludeId } } });
  if (admins === 0) throw new ApiError(400, 'يجب أن يبقى مدير نظام واحد فعّال على الأقل');
}

export const PATCH = route(
  async (req, { params, user: me }) => {
    const { password, ...d } = userUpdateSchema.parse(await readJson(req));
    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) throw new ApiError(404, 'المستخدم غير موجود');

    const losingAdmin = target.role === 'ADMIN' && ((d.role && d.role !== 'ADMIN') || d.isActive === false);
    if (losingAdmin) await ensureAnotherAdmin(target.id);
    if (target.id === me.id && d.isActive === false) throw new ApiError(400, 'لا يمكنك إيقاف حسابك الحالي');

    const data = { ...d };
    if (password) data.password = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({ where: { id: params.id }, data, select });
    return ok({ user });
  },
  { permission: ['users', 'write'] }
);

export const DELETE = route(
  async (req, { params, user: me }) => {
    if (params.id === me.id) throw new ApiError(400, 'لا يمكنك حذف حسابك الحالي');
    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) throw new ApiError(404, 'المستخدم غير موجود');
    if (target.role === 'ADMIN') await ensureAnotherAdmin(target.id);
    await prisma.user.delete({ where: { id: params.id } });
    return ok({ message: 'تم حذف المستخدم' });
  },
  { permission: ['users', 'delete'] }
);
