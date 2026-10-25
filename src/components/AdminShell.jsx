'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { can } from '@/lib/permissions';
import { ROLE_LABELS } from '@/lib/permissions';
import { AdminContext } from './admin-context';
import { Icon, Logo } from './icons';
import { Avatar, Loading, cx } from './ui';
import { useToast } from './toast';

export const NAV = [
  { href: '/admin', label: 'الرئيسية', icon: 'home', resource: 'dashboard' },
  { href: '/admin/customers', label: 'الزبائن', icon: 'users', resource: 'customers' },
  { href: '/admin/repairs', label: 'الصيانة', icon: 'wrench', resource: 'repairs' },
  { href: '/admin/sales', label: 'نقطة البيع', icon: 'cart', resource: 'sales' },
  { href: '/admin/invoices', label: 'الفواتير', icon: 'receipt', resource: 'invoices' },
  { href: '/admin/products', label: 'المنتجات', icon: 'box', resource: 'products' },
  { href: '/admin/inventory', label: 'المخزون', icon: 'layers', resource: 'inventory' },
  { href: '/admin/subscriptions', label: 'الإنترنت', icon: 'wifi', resource: 'subscriptions' },
  { href: '/admin/messages', label: 'الرسائل', icon: 'message', resource: 'messages', badge: 'messages' },
  { href: '/admin/feedback', label: 'التقييمات', icon: 'smile', resource: 'feedback' },
  { href: '/admin/stats', label: 'الإحصائيات', icon: 'chart', resource: 'stats' },
  { href: '/admin/users', label: 'المستخدمون', icon: 'shield', resource: 'users' },
];

const MOBILE_PRIORITY = ['/admin', '/admin/repairs', '/admin/sales', '/admin/customers', '/admin/subscriptions', '/admin/messages', '/admin/products'];

function isActive(pathname, href) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/');
}

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch((e) => setError(e.message));
  }, []);

  const refreshBadges = useCallback(() => {
    if (!user || !can(user.role, 'messages', 'read')) return;
    api('/api/messages?filter=unread&take=1')
      .then((d) => setUnread(d.unread || 0))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    refreshBadges();
    const t = setInterval(refreshBadges, 60000);
    return () => clearInterval(t);
  }, [refreshBadges]);

  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    if (sp.get('denied')) toast.error('ليست لديك صلاحية للوصول إلى تلك الصفحة');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/login');
    router.refresh();
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="card max-w-sm p-6 text-center">
          <p className="font-bold text-red-600">{error}</p>
          <button className="btn btn-primary mt-4" onClick={() => location.reload()}>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }
  if (!user) return <Loading text="جاري تحميل لوحة التحكم..." />;

  const items = NAV.filter((n) => can(user.role, n.resource, 'read'));
  const mobileItems = MOBILE_PRIORITY.map((h) => items.find((i) => i.href === h)).filter(Boolean).slice(0, 4);

  const NavList = ({ onNavigate }) => (
    <nav className="flex flex-col gap-1">
      {items.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cx(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition',
              active ? 'bg-brand text-white shadow-lg shadow-brand/25' : 'text-beige/70 hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon name={n.icon} className="size-[18px]" />
            <span className="flex-1">{n.label}</span>
            {n.badge === 'messages' && unread > 0 && (
              <span className={cx('rounded-full px-2 text-[11px] font-black', active ? 'bg-white text-brand' : 'bg-brand text-white')}>{unread}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const UserBox = () => (
    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} className="bg-beige" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-white">{user.name}</p>
          <p className="truncate text-xs text-beige/60">{ROLE_LABELS[user.role]}</p>
        </div>
        <button onClick={logout} title="تسجيل الخروج" className="flex size-9 items-center justify-center rounded-xl text-beige/70 hover:bg-white/10 hover:text-white">
          <Icon name="logout" className="size-[18px]" />
        </button>
      </div>
    </div>
  );

  return (
    <AdminContext.Provider value={{ user, refreshBadges }}>
      <div className="min-h-dvh lg:ps-72">
        {/* الشريط الجانبي — كمبيوتر */}
        <aside className="no-print fixed inset-y-0 start-0 z-30 hidden w-72 flex-col bg-navy p-4 lg:flex">
          <Link href="/admin" className="mb-6 flex items-center gap-3 px-2 pt-1">
            <Logo className="size-11" />
            <div>
              <p className="text-lg font-black text-white">محمود سنتر</p>
              <p className="text-xs text-beige/50">لوحة التحكم</p>
            </div>
          </Link>
          <div className="scrollbar-thin -mx-1 flex-1 overflow-y-auto px-1">
            <NavList />
          </div>
          <div className="mt-4">
            <UserBox />
          </div>
        </aside>

        {/* الشريط العلوي — هاتف */}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 bg-navy px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white lg:hidden">
          <button onClick={() => setDrawer(true)} className="flex size-10 items-center justify-center rounded-xl bg-white/10" aria-label="القائمة">
            <Icon name="menu" />
          </button>
          <Link href="/admin" className="flex items-center gap-2">
            <Logo className="size-8" />
            <span className="font-black">محمود سنتر</span>
          </Link>
          <Link href="/admin/messages" className="relative flex size-10 items-center justify-center rounded-xl bg-white/10" aria-label="الرسائل">
            <Icon name="bell" />
            {unread > 0 && <span className="absolute top-0.5 end-0.5 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-black leading-4 ring-2 ring-navy">{unread}</span>}
          </Link>
        </header>

        {/* القائمة المنزلقة — هاتف */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="animate-fade absolute inset-0 bg-navy-900/60" onClick={() => setDrawer(false)} />
            <div className="animate-pop absolute inset-y-0 start-0 flex w-[82%] max-w-xs flex-col bg-navy p-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Logo className="size-10" />
                  <p className="font-black text-white">محمود سنتر</p>
                </div>
                <button onClick={() => setDrawer(false)} className="flex size-9 items-center justify-center rounded-xl text-beige/70 hover:bg-white/10">
                  <Icon name="x" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NavList onNavigate={() => setDrawer(false)} />
              </div>
              <div className="pb-safe mt-4">
                <UserBox />
              </div>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">{children}</main>

        {/* شريط التنقل السفلي — هاتف */}
        <nav className="no-print pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t border-navy/10 bg-white/95 px-2 pt-2 backdrop-blur lg:hidden">
          {mobileItems.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link key={n.href} href={n.href} className={cx('flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold', active ? 'text-brand' : 'text-navy/50')}>
                <Icon name={n.icon} className="size-[22px]" />
                {n.label}
              </Link>
            );
          })}
          <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold text-navy/50">
            <Icon name="menu" className="size-[22px]" />
            المزيد
          </button>
        </nav>
      </div>
    </AdminContext.Provider>
  );
}
