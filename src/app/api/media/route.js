import { prisma } from '@/lib/prisma';
import { route, ok, ApiError } from '@/lib/api';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const MAX = 3 * 1024 * 1024; // 3MB بعد الضغط من المتصفح
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// رفع صورة (للإعلانات وصور المنتجات)
export const POST = route(async (req, { user }) => {
  if (!can(user.role, 'posts', 'write') && !can(user.role, 'products', 'write')) {
    throw new ApiError(403, 'ليست لديك صلاحية لرفع الصور');
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') throw new ApiError(400, 'اختر صورة');
  if (!TYPES.includes(file.type)) throw new ApiError(400, 'نوع الملف غير مدعوم — صور فقط (JPG, PNG, WEBP)');
  if (file.size > MAX) throw new ApiError(400, 'حجم الصورة كبير جداً (الحد 3MB)');
  const buf = Buffer.from(await file.arrayBuffer());
  const media = await prisma.media.create({ data: { mime: file.type, size: buf.length, data: buf }, select: { id: true } });
  return ok({ url: `/api/media/${media.id}` }, 201);
});
