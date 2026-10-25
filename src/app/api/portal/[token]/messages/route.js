import { prisma } from '@/lib/prisma';
import { route, ok, readJson, ApiError } from '@/lib/api';
import { portalMessageSchema } from '@/lib/validators';
import { loadPortalCustomer } from '@/lib/portal';

export const POST = route(
  async (req, { params }) => {
    const { id } = await loadPortalCustomer(params.token);
    const data = portalMessageSchema.parse(await readJson(req));
    const recent = await prisma.message.count({
      where: { customerId: id, sender: 'CUSTOMER', createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= 10) throw new ApiError(429, 'أرسلت رسائل كثيرة، حاول لاحقاً');
    const message = await prisma.message.create({
      data: { ...data, customerId: id, sender: 'CUSTOMER' },
      select: { id: true, type: true, sender: true, content: true, reply: true, createdAt: true },
    });
    return ok({ message }, 201);
  },
  { permission: null }
);
