import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { route, ok, readJson } from '@/lib/api';
import { userCreateSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const select = { id: true, name: true, email: true, phone: true, role: true, isActive: true, lastLogin: true, createdAt: true };

export const GET = route(
  async () => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select });
    return ok({ users });
  },
  { permission: ['users', 'read'] }
);

export const POST = route(
  async (req) => {
    const { password, ...d } = userCreateSchema.parse(await readJson(req));
    const user = await prisma.user.create({
      data: { ...d, password: await bcrypt.hash(password, 12) },
      select,
    });
    return ok({ user }, 201);
  },
  { permission: ['users', 'write'] }
);
