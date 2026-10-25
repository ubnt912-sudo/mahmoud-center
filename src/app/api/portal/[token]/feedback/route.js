import { prisma } from '@/lib/prisma';
import { route, ok, readJson } from '@/lib/api';
import { feedbackSchema } from '@/lib/validators';
import { loadPortalCustomer } from '@/lib/portal';

// تقييم واحد كل 24 ساعة؛ التقييم خلال نفس اليوم يُحدَّث بدل التكرار
export const POST = route(
  async (req, { params }) => {
    const { id } = await loadPortalCustomer(params.token);
    const { rating, comment } = feedbackSchema.parse(await readJson(req));
    const last = await prisma.feedback.findFirst({
      where: { customerId: id, createdAt: { gte: new Date(Date.now() - 86400000) } },
      orderBy: { createdAt: 'desc' },
    });
    const feedback = last
      ? await prisma.feedback.update({ where: { id: last.id }, data: { rating, comment: comment ?? null } })
      : await prisma.feedback.create({ data: { customerId: id, rating, comment: comment ?? null } });
    return ok({ feedback: { rating: feedback.rating, comment: feedback.comment, createdAt: feedback.createdAt } });
  },
  { permission: null }
);
