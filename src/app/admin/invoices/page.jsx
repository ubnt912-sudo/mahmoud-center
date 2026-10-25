'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useApi, useDebounced } from '@/hooks/useApi';
import { qs } from '@/lib/client';
import { fmtDateTime, fmtMoney, invoiceNo } from '@/lib/format';
import { INVOICE_STATUS } from '@/lib/labels';
import { Card, Empty, ErrorBox, Loading, Money, PageHeader, Pager, SearchInput, StatCard, StatusBadge, Tabs } from '@/components/ui';

export default function InvoicesPage() {
  const sp = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [status, setStatus] = useState(sp.get('status') || '');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(`/api/invoices${qs({ q: dq, status, page, take: 25 })}`);
  useEffect(() => setPage(1), [dq, status]);

  return (
    <div>
      <PageHeader title="الفواتير" subtitle="جميع فواتير المبيعات والمدفوعات" icon="receipt" />
      {data?.totals && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="إجمالي الفواتير" value={fmtMoney(data.totals.total)} icon="receipt" tone="navy" />
          <StatCard label="المقبوض" value={fmtMoney(data.totals.paid)} icon="wallet" tone="green" />
          <StatCard label="الديون المتبقية" value={fmtMoney(data.totals.remaining)} icon="alert" tone="red" onClick={() => setStatus('UNPAID')} />
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="رقم الفاتورة INV-…، الزبون أو الهاتف" className="flex-1" />
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[{ value: '', label: 'الكل' }, ...Object.entries(INVOICE_STATUS).map(([value, v]) => ({ value, label: v.label }))]}
        />
      </div>
      <ErrorBox error={error} onRetry={reload} />
      <Card className="overflow-hidden">
        {loading && !data ? (
          <Loading />
        ) : !data?.invoices.length ? (
          <Empty icon="receipt" title="لا توجد فواتير" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>الفاتورة</th>
                    <th>الزبون</th>
                    <th>التاريخ</th>
                    <th>الإجمالي</th>
                    <th>المدفوع</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <Link href={`/admin/invoices/${i.id}`} className="font-extrabold text-brand-700 hover:underline">
                          {invoiceNo(i.number)}
                        </Link>
                      </td>
                      <td className="font-bold">{i.customer.name}</td>
                      <td className="text-navy/55">{fmtDateTime(i.createdAt)}</td>
                      <td>
                        <Money value={i.total} />
                      </td>
                      <td>
                        <Money value={i.paid} className="text-emerald-700" />
                      </td>
                      <td>{i.status !== 'CANCELLED' && i.total - i.paid > 0 ? <Money value={i.total - i.paid} className="text-red-600" /> : '—'}</td>
                      <td>
                        <StatusBadge map={INVOICE_STATUS} value={i.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} take={25} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
