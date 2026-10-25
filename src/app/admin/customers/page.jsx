'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi, useDebounced } from '@/hooks/useApi';
import { qs } from '@/lib/client';
import { fmtDate } from '@/lib/format';
import { CUSTOMER_STATUS } from '@/lib/labels';
import CustomerForm from '@/components/CustomerForm';
import { Avatar, Button, Card, CopyButton, Empty, ErrorBox, Loading, Modal, PageHeader, Pager, SearchInput, StatusBadge, Tabs } from '@/components/ui';
import { WhatsAppIcon } from '@/components/icons';

export default function CustomersPage() {
  const { can } = useAdmin();
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [created, setCreated] = useState(null);
  const { data, loading, error, reload } = useApi(`/api/customers${qs({ q: dq, status, page, take: 25 })}`);

  useEffect(() => setPage(1), [dq, status]);
  useEffect(() => {
    if (sp.get('new') && can('customers', 'write')) {
      setFormOpen(true);
      router.replace('/admin/customers');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  return (
    <div>
      <PageHeader
        title="الزبائن"
        subtitle={data ? `${data.total} زبون` : ' '}
        icon="users"
        actions={can('customers', 'write') && <Button icon="plus" onClick={() => setFormOpen(true)}>زبون جديد</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="ابحث بالاسم أو رقم الهاتف..." className="flex-1" />
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[
            { value: '', label: 'الكل' },
            { value: 'ACTIVE', label: 'نشط' },
            { value: 'BLOCKED', label: 'محظور' },
          ]}
        />
      </div>

      <ErrorBox error={error} onRetry={reload} />
      <Card className="mt-3 overflow-hidden">
        {loading && !data ? (
          <Loading />
        ) : !data?.customers.length ? (
          <Empty icon="users" title={dq ? 'لا توجد نتائج' : 'لا يوجد زبائن بعد'} text={dq ? 'جرّب البحث بكلمة أخرى' : 'ابدأ بإضافة أول زبون'} />
        ) : (
          <>
            {/* جدول — كمبيوتر */}
            <div className="table-wrap hidden md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>الزبون</th>
                    <th>الهاتف</th>
                    <th>الصيانة</th>
                    <th>الطلبات</th>
                    <th>الاشتراكات</th>
                    <th>الحالة</th>
                    <th>آخر زيارة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((c) => (
                    <tr key={c.id} className="cursor-pointer" onClick={() => router.push(`/admin/customers/${c.id}`)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} />
                          <span className="font-extrabold">{c.name}</span>
                        </div>
                      </td>
                      <td dir="ltr" className="text-end">
                        {c.phone}
                      </td>
                      <td>{c._count.repairs}</td>
                      <td>{c._count.orders}</td>
                      <td>{c._count.subscriptions}</td>
                      <td>
                        <StatusBadge map={CUSTOMER_STATUS} value={c.status} />
                      </td>
                      <td className="text-navy/50">{fmtDate(c.lastVisit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* بطاقات — هاتف */}
            <ul className="divide-y divide-navy/5 md:hidden">
              {data.customers.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-soft">
                    <Avatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{c.name}</p>
                      <p className="text-xs text-navy/50" dir="ltr" style={{ textAlign: 'right' }}>
                        {c.phone}
                      </p>
                    </div>
                    <div className="text-end text-[11px] text-navy/45">
                      <p>🔧 {c._count.repairs} • 🛒 {c._count.orders}</p>
                      {c.status === 'BLOCKED' && <StatusBadge map={CUSTOMER_STATUS} value={c.status} />}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pager page={page} take={25} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <CustomerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(d) => {
          reload();
          setCreated(d);
        }}
      />

      <Modal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        title="تم إنشاء الزبون ✅"
        subtitle={created?.customer?.name}
        size="sm"
        footer={
          <>
            <Button variant="soft" onClick={() => router.push(`/admin/customers/${created.customer.id}`)}>
              فتح ملف الزبون
            </Button>
            <a href={created?.waLink} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white hover:brightness-95">
              <WhatsAppIcon className="size-4" /> إرسال الرابط واتساب
            </a>
          </>
        }
      >
        <p className="mb-2 text-sm text-navy/60">رابط البوابة الخاص بالزبون:</p>
        <div className="mb-3 break-all rounded-xl bg-soft p-3 text-left text-xs font-semibold" dir="ltr">
          {created?.customerLink}
        </div>
        {created && <CopyButton text={created.customerLink} label="نسخ الرابط" />}
      </Modal>
    </div>
  );
}
