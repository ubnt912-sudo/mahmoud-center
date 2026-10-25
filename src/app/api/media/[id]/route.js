import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// عرض صورة مرفوعة (عام — تُستخدم في بوابة الزبائن)
export async function GET(req, ctx) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response('Not found', { status: 404 });
  const media = await prisma.media.findUnique({ where: { id } }).catch(() => null);
  if (!media) return new Response('Not found', { status: 404 });
  return new Response(media.data, {
    headers: {
      'Content-Type': media.mime,
      'Content-Length': String(media.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
