import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { route, readJson, ApiError } from '@/lib/api';
import { loginSchema } from '@/lib/validators';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

// حماية بسيطة من تخمين كلمات المرور (لكل عنوان IP)
const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX = 10;

function checkRate(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW) {
    attempts.set(ip, { first: now, count: 1 });
    return;
  }
  rec.count += 1;
  if (rec.count > MAX) throw new ApiError(429, 'محاولات كثيرة، حاول بعد 15 دقيقة');
}

export const POST = route(
  async (req) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    checkRate(ip);
    const { email, password } = loginSchema.parse(await readJson(req));

    const user = await prisma.user.findUnique({ where: { email } });
    // مقارنة حتى لو لم يوجد المستخدم لتوحيد زمن الاستجابة
    const valid = user ? await bcrypt.compare(password, user.password) : (await bcrypt.hash(password, 10), false);
    if (!user || !valid) throw new ApiError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    if (!user.isActive) throw new ApiError(403, 'هذا الحساب موقوف، راجع مدير النظام');

    attempts.delete(ip);
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const token = await signSession({ sub: user.id, role: user.role, name: user.name });
    const res = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  },
  { permission: null }
);
