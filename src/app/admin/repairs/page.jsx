'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi, useDebounced } from '@/hooks/useApi';
import { api, qs } from '@/lib/client';
import { daysLeft, fmtDate, repairNo } from '@/lib/format';
import { REPAIR_STATUS } from '@/lib/labels';
import RepairForm from '@/components/RepairForm';
import { Button, Card, Empty, ErrorBox, Loading, Money, PageHeader, Pager, SearchInput, StatusBadge, Tabs } from '@/components/ui';

export default function RepairsPage() {
  const { can } = useAdmin();
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [status, setStatus] = useState(sp.get('status') || 'active');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [initialCustomer, setInitialCustomer] = useState(null);

  const params = { q: dq, page, take: 25, ...(status === 'active' ? { active: 1 } : status ? { status } : {}) };
  const { data, loading, error, reload } = useApi(`/api/repairs${qs(params)}`);

  useEffect(() => setPage(1), [dq, status]);
  useEffect(() => {
    if (sp.get('new') && can('repairs', 'write')) {
      const cid = sp.get('customer');
      if (cid) {
        api(`/api/customers/${cid}`)
          .then((d) => setInitialCustomer(d.customer))
          .catch(() => {})
          .finally(() => setFormOpen(true));
      } else setFormOpen(true);
      router.replace('/admin/repairs');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const counts = data?.statusCounts || {};
  const activeCount = ['RECEIVED', 'INSPECTING', 'WAITING_APPROVAL', 'REPAIRING', 'READY'].reduce((s, k) => s + (counts[k] || 0), 0);
  const tabs = [
    { value: 'active', label: 'قيد العمل', count: activeCount },
    ...Object.entries(REPAIR_STATUS).map(([k, v]) => ({ value: k, label: v.label, count: counts[k] || 0 })),
    { value: '', label: 'الكل' },
  ];

  return (
    <div>
      <PageHeader
        title="الصيانة"
        subtitle="تتبع الأجهزة من الاستلام حتى التسليم"
        icon="wrench"
        actions={can('repairs', 'write') && <Button icon="plus" onClick={() => { setInitialCustomer(null); setFormOpen(true); }}>صيانة جديدة</Button>}
      />
      <SearchInput value={q} onChange={setQ} placeholder="ابحث برقم الطلب، الزبون، الهاتف، الموديل أو IMEI..." className="mb-3" />
      <Tabs tabs={tabs} value={status} onChange={setStatus} className="mb-4" />
      <ErrorBox error={error} onRetry={reload} />

      <Card className="overflow-hidden">
        {loading && !data ? (
          <Loading />
        ) : !data?.repairs.length ? (
          <Empty icon="wrench" title="لا توجد طلبات صيانة" text={dq ? 'لا نتائج مطابقة للبحث' : undefined} />
        ) : (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>رقم</th>
                    <th>الجهاز</th>
                    <th>الزبون</th>
                    <th>العطل</th>
                    <th>التكلفة</th>
                    <th>المتبقي</th>
                    <th>موعد التسليم</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.repairs.map((r) => {
                    const late = r.expectedDate && daysLeft(r.expectedDate) < 0 && !['READY', 'DELIVERED', 'CANCELLED'].includes(r.status);
                    return (
                      <tr key={r.id} className="cursor-pointer" onClick={() => router.push(`/admin/repairs/${r.id}`)}>
                        <td className="font-bold text-navy/50">{repairNo(r.number)}</td>
                        <td className="font-extrabold">
                          {r.deviceCompany} {r.deviceModel}
                        </td>
                        <td>
                          <p className="font-bold">{r.customer.name}</p>
                          <p className="text-xs text-navy/45" dir="ltr" style={{ textAlign: 'right' }}>
                            {r.customer.phone}
                          </p>
                        </td>
                        <td className="max-w-[16rem] truncate text-navy/60">{r.issue}</td>
                        <td>
                          <Money value={r.cost} />
                        </td>
                        <td>{r.cost - r.paid > 0 ? <Money value={r.cost - r.paid} className="text-red-600" /> : <span className="text-emerald-600">✓</span>}</td>
                        <td className={late ? 'font-bold text-red-600' : 'text-navy/55'}>{fmtDate(r.expectedDate)}</td>
                        <td>
                          <StatusBadge map={REPAIR_STATUS} value={r.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-navy/5 md:hidden">
              {data.repairs.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/repairs/${r.id}`} className="block px-4 py-3 active:bg-soft">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-extrabold">
                          {r.deviceCompany} {r.deviceModel}
                        </p>
                        <p className="truncate text-xs text-navy/50">
                          {repairNo(r.number)} • {r.customer.name}
                        </p>
                      </div>
                      <StatusBadge map={REPAIR_STATUS} value={r.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-navy/60">{r.issue}</p>
                    <div className="mt-1 flex justify-between text-xs text-navy/50">
                      <span>
                        <Money value={r.cost} />
                      </span>
                      <span>التسليم: {fmtDate(r.expectedDate)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pager page={page} take={25} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <RepairForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialCustomer={initialCustomer}
        onSaved={(r) => router.push(`/admin/repairs/${r.id}`)}
      />
    </div>
  );
}
