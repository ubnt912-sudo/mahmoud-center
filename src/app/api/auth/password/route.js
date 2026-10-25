import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { route, ok, readJson, ApiError } from '@/lib/api';
import { changePasswordSchema } from '@/lib/validators';

export const POST = route(async (req, { user }) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(await readJson(req));
  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!(await bcrypt.compare(currentPassword, full.password))) {
    throw new ApiError(400, 'كلمة المرور الحالية غير صحيحة');
  }
  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 12) } });
  return ok({ message: 'تم تغيير كلمة المرور' });
});
