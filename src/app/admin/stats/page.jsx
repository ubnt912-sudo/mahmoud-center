'use client';

import { useApi } from '@/hooks/useApi';
import { fmtMoney } from '@/lib/format';
import { CATEGORY, REPAIR_STATUS } from '@/lib/labels';
import { BarChart, SplitBar } from '@/components/charts';
import { Card, CardHeader, Empty, ErrorBox, Loading, Money, PageHeader, StatCard } from '@/components/ui';

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const mLabel = (k) => MONTHS[parseInt(k.slice(5), 10) - 1];
const COLORS = ['#F97316', '#1B263B', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#94A3B8'];

export default function StatsPage() {
  const { data, loading, error, reload } = useApi('/api/stats?scope=full');
  const s = data?.stats;
  const f = s?.full;

  return (
    <div className="space-y-5">
      <PageHeader title="الإحصائيات" subtitle="آخر 12 شهراً" icon="chart" />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !s ? (
        <Loading />
      ) : f ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="المبيعات" value={fmtMoney(f.totals.sales)} icon="cart" tone="brand" />
            <StatCard label="صافي ربح المبيعات" value={fmtMoney(f.totals.profit)} icon="wallet" tone="green" />
            <StatCard label="مقبوضات الصيانة" value={fmtMoney(f.totals.repairs)} icon="wrench" tone="sky" />
            <StatCard label="مقبوضات الإنترنت" value={fmtMoney(f.totals.internet)} icon="wifi" tone="navy" />
          </div>

          <Card>
            <CardHeader title="المبيعات الشهرية" icon="chart" subtitle="بعد الخصومات" />
            <div className="p-5">
              <BarChart height={240} data={f.months.map((m) => ({ label: mLabel(m.month), short: mLabel(m.month).slice(0, 3), value: Math.max(0, m.sales), tooltip: `${mLabel(m.month)}: ${fmtMoney(m.sales)}` }))} />
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="الأرباح الشهرية" icon="wallet" />
              <div className="p-5">
                <BarChart height={200} color="#10B981" data={f.months.map((m) => ({ label: mLabel(m.month), short: mLabel(m.month).slice(0, 3), value: Math.max(0, m.profit), tooltip: `${mLabel(m.month)}: ${fmtMoney(m.profit)}` }))} />
              </div>
            </Card>
            <Card>
              <CardHeader title="مقبوضات الصيانة والإنترنت" icon="wrench" />
              <div className="p-5">
                <BarChart
                  height={200}
                  color="#0EA5E9"
                  data={f.months.map((m) => ({ label: mLabel(m.month), short: mLabel(m.month).slice(0, 3), value: m.repairs + m.internet, tooltip: `صيانة ${fmtMoney(m.repairs)} • إنترنت ${fmtMoney(m.internet)}` }))}
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="الأكثر مبيعاً" icon="box" />
              {f.topProducts.length === 0 ? (
                <Empty icon="box" title="لا توجد مبيعات بعد" />
              ) : (
                <ul className="divide-y divide-navy/5">
                  {f.topProducts.map((p, i) => (
                    <li key={p.name + i} className="flex items-center gap-3 px-5 py-3">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-soft text-xs font-black">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                      <span className="text-xs text-navy/45">{p.qty} قطعة</span>
                      <Money value={p.revenue} className="text-sm" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <div className="space-y-5">
              <Card>
                <CardHeader title="المبيعات حسب التصنيف" icon="tag" />
                <div className="p-5">
                  <SplitBar items={Object.entries(f.categories).map(([k, v], i) => ({ label: CATEGORY[k] || k, value: Math.round(v / 1000), color: COLORS[i % COLORS.length] }))} />
                  <p className="mt-2 text-[11px] text-navy/40">القيم بالألف دينار</p>
                </div>
              </Card>
              {s.repairs && (
                <Card>
                  <CardHeader title="طلبات الصيانة" icon="wrench" />
                  <div className="p-5">
                    <SplitBar items={Object.entries(REPAIR_STATUS).map(([k, v], i) => ({ label: v.label, value: s.repairs.byStatus[k] || 0, color: COLORS[i % COLORS.length] }))} />
                  </div>
                </Card>
              )}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="المبيعات حسب الموظف" icon="users" />
              {f.staff.length === 0 ? (
                <Empty icon="users" title="لا توجد بيانات" />
              ) : (
                <ul className="divide-y divide-navy/5">
                  {f.staff.map((x) => (
                    <li key={x.name} className="flex items-center justify-between px-5 py-3">
                      <span className="font-bold">{x.name}</span>
                      <span className="text-xs text-navy/45">{x.count} طلب</span>
                      <Money value={x.total} className="text-sm" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardHeader title="اشتراكات جديدة حسب النوع" icon="wifi" />
              <div className="p-5">
                <SplitBar
                  items={[
                    { label: 'FTTH', value: f.ispTypes.FTTH, color: '#1B263B' },
                    { label: 'لاسلكي', value: f.ispTypes.WIRELESS, color: '#F97316' },
                  ]}
                />
                {s.feedback && (
                  <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                    {[
                      ['🙂', s.feedback.EXCELLENT],
                      ['😐', s.feedback.NEUTRAL],
                      ['🙁', s.feedback.POOR],
                    ].map(([e, n]) => (
                      <div key={e} className="rounded-xl bg-soft py-2">
                        <span className="text-2xl">{e}</span>
                        <p className="font-black">{n}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
