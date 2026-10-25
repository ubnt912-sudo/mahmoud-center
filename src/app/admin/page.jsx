'use client';

import Link from 'next/link';
import { useAdmin } from '@/components/admin-context';
import { useApi } from '@/hooks/useApi';
import { BarChart } from '@/components/charts';
import { Badge, Card, CardHeader, Empty, ErrorBox, Loading, StatCard, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/icons';
import { fmtDate, fmtMoney, daysLeft, repairNo } from '@/lib/format';
import { REPAIR_STATUS, SUB_STATUS } from '@/lib/labels';

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'صباح الخير' : 'مساء الخير';
};

export default function Dashboard() {
  const { user, can } = useAdmin();
  const { data, loading, error, reload } = useApi('/api/stats?scope=dashboard');
  const s = data?.stats;

  const quick = [
    { href: '/admin/repairs?new=1', label: 'صيانة جديدة', icon: 'wrench', res: ['repairs', 'write'] },
    { href: '/admin/sales', label: 'بيع جديد', icon: 'cart', res: ['sales', 'write'] },
    { href: '/admin/customers?new=1', label: 'زبون جديد', icon: 'users', res: ['customers', 'write'] },
    { href: '/admin/subscriptions?new=1', label: 'اشتراك جديد', icon: 'wifi', res: ['subscriptions', 'write'] },
  ].filter((q) => can(...q.res));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-navy p-5 text-white shadow-card sm:p-7">
        <div className="pointer-events-none absolute -top-20 -end-20 size-64 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-beige/70">{greet()} 👋</p>
            <h1 className="text-2xl font-black sm:text-3xl">{user?.name}</h1>
            <p className="mt-1 text-sm text-beige/60">{new Date().toLocaleDateString('ar-IQ-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          {quick.length > 0 && (
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              {quick.map((q) => (
                <Link key={q.href} href={q.href} className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold ring-1 ring-white/10 transition hover:bg-brand">
                  <Icon name={q.icon} className="size-4" />
                  {q.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <ErrorBox error={error} onRetry={reload} />
      {loading && !s ? (
        <Loading />
      ) : s ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {s.sales && <StatCard label="مبيعات اليوم" value={fmtMoney(s.sales.today)} hint={`${s.sales.todayCount} عملية بيع`} icon="cart" tone="brand" href="/admin/sales" />}
            {s.salesMonth && <StatCard label="مبيعات الشهر" value={fmtMoney(s.salesMonth.total)} hint={`${s.salesMonth.count} طلب`} icon="chart" tone="navy" />}
            {s.repairs && <StatCard label="أجهزة في الصيانة" value={s.repairs.active} hint={`${s.repairs.ready} جاهز للتسليم`} icon="wrench" tone="sky" href="/admin/repairs" />}
            {s.subscriptions && (
              <StatCard
                label="اشتراكات تنتهي قريباً"
                value={s.subscriptions.byStatus.EXPIRING_SOON || 0}
                hint={`${s.subscriptions.byStatus.EXPIRED || 0} منتهي`}
                icon="wifi"
                tone="amber"
                href="/admin/subscriptions?status=EXPIRING_SOON"
              />
            )}
            {s.customers && <StatCard label="الزبائن" value={s.customers.total} hint={`${s.customers.newThisMonth} جديد هذا الشهر`} icon="users" tone="green" href="/admin/customers" />}
            {s.receivables && <StatCard label="ديون مستحقة" value={fmtMoney(s.receivables.amount)} hint={`${s.receivables.count} فاتورة`} icon="wallet" tone="red" href="/admin/invoices?status=UNPAID" />}
            {s.lowStock && <StatCard label="منتجات قاربت النفاد" value={s.lowStock.count} icon="alert" tone="amber" href="/admin/inventory" />}
            {s.unreadMessages !== undefined && <StatCard label="رسائل غير مقروءة" value={s.unreadMessages} icon="message" tone="brand" href="/admin/messages" />}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {s.sales && (
              <Card className="xl:col-span-2">
                <CardHeader title="المبيعات — آخر 14 يوم" subtitle="إجمالي قيمة الطلبات يومياً" icon="chart" />
                <div className="p-5">
                  <BarChart
                    height={220}
                    data={s.sales.series.map((d) => ({
                      label: d.date,
                      short: d.date.slice(8),
                      value: d.total,
                      tooltip: `${fmtDate(d.date)} — ${fmtMoney(d.total)} (${d.count})`,
                    }))}
                  />
                </div>
              </Card>
            )}

            {s.repairs && (
              <Card>
                <CardHeader title="حالة الصيانة" icon="wrench" action={<Link href="/admin/repairs" className="text-xs font-bold text-brand">عرض الكل</Link>} />
                <div className="space-y-2 p-5">
                  {Object.entries(REPAIR_STATUS).map(([k, v]) => {
                    const n = s.repairs.byStatus[k] || 0;
                    const total = Object.values(s.repairs.byStatus).reduce((a, b) => a + b, 0) || 1;
                    return (
                      <Link key={k} href={`/admin/repairs?status=${k}`} className="block rounded-xl px-2 py-1.5 hover:bg-soft">
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-bold">
                            {v.icon} {v.label}
                          </span>
                          <span className="font-black">{n}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-soft">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${(n / total) * 100}%` }} />
                        </div>
                      </Link>
                    );
                  })}
                  {s.overdueRepairs > 0 && (
                    <p className="mt-2 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                      <Icon name="clock" className="size-4" /> {s.overdueRepairs} جهاز تجاوز موعد التسليم المتوقع
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {s.recentRepairs && (
              <Card>
                <CardHeader title="أجهزة قيد العمل" icon="wrench" />
                {s.recentRepairs.length === 0 ? (
                  <Empty icon="wrench" title="لا توجد أجهزة حالياً" />
                ) : (
                  <ul className="divide-y divide-navy/5">
                    {s.recentRepairs.map((r) => (
                      <li key={r.id}>
                        <Link href={`/admin/repairs/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-soft/70">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold">
                              {r.deviceCompany} {r.deviceModel}
                            </p>
                            <p className="truncate text-xs text-navy/50">
                              {repairNo(r.number)} • {r.customer.name}
                            </p>
                          </div>
                          <StatusBadge map={REPAIR_STATUS} value={r.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {s.expiringSubs && (
              <Card>
                <CardHeader title="اشتراكات تحتاج تجديد" icon="wifi" />
                {s.expiringSubs.length === 0 ? (
                  <Empty icon="wifi" title="لا توجد اشتراكات قريبة الانتهاء" />
                ) : (
                  <ul className="divide-y divide-navy/5">
                    {s.expiringSubs.map((x) => {
                      const d = daysLeft(x.endDate);
                      return (
                        <li key={x.id} className="flex items-center justify-between gap-3 px-5 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold">{x.customer.name}</p>
                            <p className="truncate text-xs text-navy/50">
                              {x.planName} • {d >= 0 ? `باقي ${d} يوم` : `منتهي منذ ${-d} يوم`}
                            </p>
                          </div>
                          <StatusBadge map={SUB_STATUS} value={x.status} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            )}

            {s.lowStock && (
              <Card>
                <CardHeader title="تنبيهات المخزون" icon="layers" action={<Link href="/admin/inventory" className="text-xs font-bold text-brand">المخزون</Link>} />
                {s.lowStock.items.length === 0 ? (
                  <Empty icon="check" title="المخزون بحالة جيدة" />
                ) : (
                  <ul className="divide-y divide-navy/5">
                    {s.lowStock.items.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold">{p.name}</p>
                          <p className="text-xs text-navy/50" dir="ltr">
                            {p.sku}
                          </p>
                        </div>
                        <Badge tone={p.stock === 0 ? 'red' : 'amber'}>
                          {p.stock === 0 ? 'نفد' : `متبقي ${p.stock}`}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {s.feedback && !s.lowStock && (
              <Card>
                <CardHeader title="رضا الزبائن" icon="smile" />
                <div className="grid grid-cols-3 gap-3 p-5 text-center">
                  {[
                    ['🙂', 'ممتاز', s.feedback.EXCELLENT],
                    ['😐', 'متوسط', s.feedback.NEUTRAL],
                    ['🙁', 'سيئ', s.feedback.POOR],
                  ].map(([e, l, n]) => (
                    <div key={l} className="rounded-2xl bg-soft p-3">
                      <div className="text-3xl">{e}</div>
                      <p className="mt-1 text-xs font-bold text-navy/50">{l}</p>
                      <p className="text-lg font-black">{n}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

