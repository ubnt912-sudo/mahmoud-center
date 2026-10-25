import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { can } from '@/lib/permissions';

// مسارات API لا تحتاج تسجيل دخول
const PUBLIC_API = ['/api/auth/login', '/api/auth/logout', '/api/portal/', '/api/health'];

// ربط صفحات الإدارة بالصلاحية المطلوبة
const PAGE_RESOURCES = [
  ['/admin/customers', 'customers'],
  ['/admin/repairs', 'repairs'],
  ['/admin/products', 'products'],
  ['/admin/inventory', 'inventory'],
  ['/admin/sales', 'sales'],
  ['/admin/invoices', 'invoices'],
  ['/admin/subscriptions', 'subscriptions'],
  ['/admin/messages', 'messages'],
  ['/admin/feedback', 'feedback'],
  ['/admin/users', 'users'],
  ['/admin/stats', 'stats'],
];

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');

  if (isApi && PUBLIC_API.some((p) => pathname === p || (p.endsWith('/') && pathname.startsWith(p)))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) {
    if (isApi) {
      return NextResponse.json({ success: false, error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (!isApi) {
    const match = PAGE_RESOURCES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
    if (match && !can(session.role, match[1], 'read')) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin';
      url.search = '?denied=1';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
