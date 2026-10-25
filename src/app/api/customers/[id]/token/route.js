import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { route, ok } from '@/lib/api';
import { portalLinks } from '@/lib/domain';

// إعادة توليد رابط بوابة الزبون (يُبطل الرابط القديم)
export const POST = route(
  async (req, { params }) => {
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: { customerToken: randomUUID() },
    });
    return ok({ customer, ...portalLinks(req, customer) });
  },
  { permission: ['customers', 'write'] }
);
