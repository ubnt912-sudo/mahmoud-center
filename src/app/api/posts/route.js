import { prisma } from '@/lib/prisma';
import { route, ok, readJson } from '@/lib/api';
import { postSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export const GET = route(
  async () => {
    const posts = await prisma.post.findMany({ orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }], take: 200 });
    return ok({ posts });
  },
  { permission: ['posts', 'read'] }
);

export const POST = route(
  async (req) => {
    const d = postSchema.parse(await readJson(req));
    if (d.mediaType === 'NONE') d.mediaUrl = null;
    const post = await prisma.post.create({ data: d });
    return ok({ post }, 201);
  },
  { permission: ['posts', 'write'] }
);
