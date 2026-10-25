import { prisma } from '@/lib/prisma';
import { route, ok, readJson } from '@/lib/api';
import { postUpdateSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export const PATCH = route(
  async (req, { params }) => {
    const d = postUpdateSchema.parse(await readJson(req));
    if (d.mediaType === 'NONE') d.mediaUrl = null;
    const post = await prisma.post.update({ where: { id: params.id }, data: d });
    return ok({ post });
  },
  { permission: ['posts', 'write'] }
);

export const DELETE = route(
  async (req, { params }) => {
    const post = await prisma.post.delete({ where: { id: params.id } });
    // حذف الصورة المرفوعة المرتبطة إن وجدت
    const m = post.mediaUrl?.match(/^\/api\/media\/([0-9a-f-]{36})$/i);
    if (m) await prisma.media.delete({ where: { id: m[1] } }).catch(() => {});
    return ok({ message: 'تم حذف الإعلان' });
  },
  { permission: ['posts', 'delete'] }
);
