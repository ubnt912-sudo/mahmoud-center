'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi, useDebounced } from '@/hooks/useApi';
import { api, qs } from '@/lib/client';
import { daysLeft, fmtDate, toInputDate } from '@/lib/format';
import { ISP_TYPE, SUB_STATUS } from '@/lib/labels';
import CustomerPicker from '@/components/CustomerPicker';
import { useToast } from '@/components/toast';
import { WhatsAppIcon } from '@/components/icons';
import { Badge, Button, Card, ConfirmModal, Empty, ErrorBox, IconButton, Input, Loading, Modal, Money, PageHeader, Pager, SearchInput, Select, StatusBadge, Tabs, Textarea, cx } from '@/components/ui';

const PLANS = [
  { type: 'FTTH', planName: 'فايبر 35 ميجا', speed: '35 Mbps', price: 30000 },
  { type: 'FTTH', planName: 'فايبر 50 ميجا', speed: '50 Mbps', price: 35000 },
  { type: 'FTTH', planName: 'فايبر 100 ميجا', speed: '100 Mbps', price: 50000 },
  { type: 'WIRELESS', planName: 'لاسلكي 10 ميجا', speed: '10 Mbps', price: 20000 },
  { type: 'WIRELESS', planName: 'لاسلكي 20 ميجا', speed: '20 Mbps', price: 25000 },
];

export default function SubscriptionsPage() {
  const { can } = useAdmin();
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [status, setStatus] = useState(sp.get('status') || '');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(`/api/subscriptions${qs({ q: dq, status, type, page, take: 25 })}`);
  const [form, setForm] = useState({ open: false, sub: null, customer: null });
  const [renew, setRenew] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const writable = can('subscriptions', 'write');

  useEffect(() => setPage(1), [dq, status, type]);
  useEffect(() => {
    if (sp.get('new') && writable) {
      const cid = sp.get('customer');
      if (cid)
        api(`/api/customers/${cid}`)
          .then((d) => setForm({ open: true, sub: null, customer: d.customer }))
          .catch(() => setForm({ open: true, sub: null, customer: null }));
      else setForm({ open: true, sub: null, customer: null });
      router.replace('/admin/subscriptions');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const counts = data?.statusCounts || {};

  async function toggleSuspend(s) {
    try {
      await api(`/api/subscriptions/${s.id}`, { method: 'PATCH', body: { status: s.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' } });
      toast.success(s.status === 'SUSPENDED' ? 'تم تفعيل الاشتراك' : 'تم إيقاف الاشتراك');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="اشتراكات الإنترنت"
        subtitle="FTTH واللاسلكي — تتحدث الحالات تلقائياً حسب تاريخ الانتهاء"
        icon="wifi"
        actions={writable && <Button icon="plus" onClick={() => setForm({ open: true, sub: null, customer: null })}>اشتراك جديد</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(SUB_STATUS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setStatus(status === k ? '' : k)}
            className={cx('card p-4 text-start transition', status === k ? 'ring-2 ring-brand' : 'hover:-translate-y-0.5')}
          >
            <Badge tone={v.tone} dot>
              {v.label}
            </Badge>
            <p className="mt-2 text-2xl font-black">{counts[k] || 0}</p>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="ابحث بالزبون أو الهاتف أو الباقة..." className="flex-1" />
        <Tabs
          value={type}
          onChange={setType}
          tabs={[
            { value: '', label: 'الكل' },
            { value: 'FTTH', label: 'FTTH' },
            { value: 'WIRELESS', label: 'لاسلكي' },
          ]}
        />
      </div>
      <ErrorBox error={error} onRetry={reload} />
      <Card className="overflow-hidden">
        {loading && !data ? (
          <Loading />
        ) : !data?.subscriptions.length ? (
          <Empty icon="wifi" title="لا توجد اشتراكات" />
        ) : (
          <>
            <ul className="divide-y divide-navy/5">
              {data.subscriptions.map((s) => {
                const d = daysLeft(s.endDate);
                const wa = encodeURIComponent(
                  `مرحباً ${s.customer.name} 👋\nاشتراك الإنترنت (${s.planName}) ${d >= 0 ? `ينتهي بعد ${d} يوم بتاريخ ${fmtDate(s.endDate)}` : `انتهى بتاريخ ${fmtDate(s.endDate)}`}.\nللتجديد تواصل معنا — محمود سنتر`
                );
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <span
                      className={cx(
                        'flex size-11 shrink-0 items-center justify-center rounded-2xl text-xs font-black',
                        s.type === 'FTTH' ? 'bg-navy text-beige' : 'bg-brand-50 text-brand-700'
                      )}
                    >
                      {s.type === 'FTTH' ? 'FTTH' : 'WiFi'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">
                        {s.customer.name} <span className="text-sm font-bold text-navy/45">— {s.planName}</span>
                      </p>
                      <p className="text-xs text-navy/50">
                        {s.speed} • {fmtDate(s.startDate)} ← {fmtDate(s.endDate)}
                        {s.status !== 'SUSPENDED' && (
                          <span className={cx('ms-1 font-bold', d < 0 ? 'text-red-600' : d <= 5 ? 'text-amber-600' : 'text-emerald-600')}>
                            ({d >= 0 ? `باقي ${d} يوم` : `منتهي منذ ${-d} يوم`})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-end text-xs">
                      <Money value={s.price} />
                      {s.price - s.paid > 0 && <p className="text-red-600">متبقي {Math.round(s.price - s.paid).toLocaleString('en-US')}</p>}
                    </div>
                    <StatusBadge map={SUB_STATUS} value={s.status} />
                    <div className="flex">
                      <a href={`https://wa.me/${s.customer.phone}?text=${wa}`} target="_blank" rel="noreferrer" title="تذكير واتساب" className="flex size-9 items-center justify-center rounded-xl text-[#25D366] hover:bg-emerald-50">
                        <WhatsAppIcon className="size-[18px]" />
                      </a>
                      {writable && (
                        <>
                          <IconButton icon="refresh" tone="brand" label="تجديد" onClick={() => setRenew(s)} />
                          <IconButton icon="edit" label="تعديل" onClick={() => setForm({ open: true, sub: s, customer: s.customer })} />
                          <IconButton icon={s.status === 'SUSPENDED' ? 'check' : 'ban'} label={s.status === 'SUSPENDED' ? 'تفعيل' : 'إيقاف'} onClick={() => toggleSuspend(s)} />
                        </>
                      )}
                      {can('subscriptions', 'delete') && <IconButton icon="trash" tone="danger" label="حذف" onClick={() => setDel(s)} />}
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pager page={page} take={25} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <SubscriptionForm {...form} onClose={() => setForm({ open: false, sub: null, customer: null })} onSaved={reload} />
      <RenewModal sub={renew} onClose={() => setRenew(null)} onSaved={reload} />
      <ConfirmModal
        open={Boolean(del)}
        onClose={() => setDel(null)}
        danger
        loading={busy}
        title="حذف الاشتراك"
        text="سيتم حذف الاشتراك نهائياً."
        confirmText="حذف"
        onConfirm={async () => {
          setBusy(true);
          try {
            await api(`/api/subscriptions/${del.id}`, { method: 'DELETE' });
            toast.success('تم الحذف');
            setDel(null);
            reload();
          } catch (e) {
            toast.error(e.message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function SubscriptionForm({ open, sub, customer, onClose, onSaved }) {
  const toast = useToast();
  const [picker, setPicker] = useState({ mode: 'existing' });
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const today = new Date();
    const end = new Date(today.getTime() + 30 * 86400000);
    setPicker(customer ? { mode: 'existing', customer } : { mode: 'existing' });
    setF(
      sub
        ? { type: sub.type, planName: sub.planName, speed: sub.speed, price: sub.price, paid: sub.paid, startDate: toInputDate(sub.startDate), endDate: toInputDate(sub.endDate), notes: sub.notes || '' }
        : { type: 'FTTH', planName: '', speed: '', price: '', paid: '', startDate: toInputDate(today), endDate: toInputDate(end), notes: '' }
    );
  }, [open, sub, customer]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const customerId = picker.customer?.id;
    if (!sub && !customerId) return toast.error('اختر الزبون');
    setSaving(true);
    const body = { ...f, price: Number(f.price || 0), paid: Number(f.paid || 0), notes: f.notes || null };
    try {
      if (sub) await api(`/api/subscriptions/${sub.id}`, { method: 'PATCH', body });
      else await api('/api/subscriptions', { method: 'POST', body: { ...body, customerId } });
      toast.success(sub ? 'تم حفظ الاشتراك' : 'تم إنشاء الاشتراك');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={sub ? 'تعديل الاشتراك' : 'اشتراك إنترنت جديد'}
      subtitle={sub?.customer?.name}
      footer={
        <>
          <Button variant="soft" onClick={onClose}>
            إلغاء
          </Button>
          <Button form="sub-form" type="submit" icon="check" loading={saving}>
            حفظ
          </Button>
        </>
      }
    >
      <form id="sub-form" onSubmit={submit} className="space-y-4">
        {!sub && <CustomerPicker value={picker} onChange={setPicker} allowNew={false} />}
        {!sub && (
          <div>
            <p className="label">باقات جاهزة</p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {PLANS.map((p) => (
                <button
                  type="button"
                  key={p.planName}
                  onClick={() => setF({ ...f, ...p })}
                  className={cx('shrink-0 rounded-xl px-3 py-2 text-xs font-bold ring-1', f.planName === p.planName ? 'bg-navy text-white ring-navy' : 'bg-white ring-navy/10')}
                >
                  {p.planName} — {p.price.toLocaleString('en-US')}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="نوع الخدمة"
            required
            value={f.type || ''}
            onChange={set('type')}
            options={Object.entries(ISP_TYPE).map(([value, label]) => ({ value, label }))}
          />
          <Input label="اسم الباقة" required value={f.planName || ''} onChange={set('planName')} />
          <Input label="السرعة" required value={f.speed || ''} onChange={set('speed')} placeholder="50 Mbps" />
          <Input label="السعر (د.ع)" required type="number" min="0" value={f.price ?? ''} onChange={set('price')} />
          <Input label="المدفوع (د.ع)" type="number" min="0" value={f.paid ?? ''} onChange={set('paid')} />
          <div />
          <Input label="تاريخ البداية" required type="date" value={f.startDate || ''} onChange={set('startDate')} />
          <Input label="تاريخ الانتهاء" required type="date" value={f.endDate || ''} onChange={set('endDate')} />
          <Textarea label="ملاحظات" className="sm:col-span-2" rows={2} value={f.notes || ''} onChange={set('notes')} />
        </div>
      </form>
    </Modal>
  );
}

function RenewModal({ sub, onClose, onSaved }) {
  const toast = useToast();
  const [days, setDays] = useState('30');
  const [paid, setPaid] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (sub) {
      setDays('30');
      setPaid(String(sub.price));
    }
  }, [sub]);
  return (
    <Modal
      open={Boolean(sub)}
      onClose={onClose}
      size="sm"
      title="تجديد الاشتراك"
      subtitle={sub ? `${sub.customer.name} — ${sub.planName}` : ''}
      footer={
        <>
          <Button variant="soft" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            loading={busy}
            icon="refresh"
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/api/subscriptions/${sub.id}`, { method: 'PATCH', body: { renewDays: Number(days), paid: Number(paid || 0) } });
                toast.success('تم تجديد الاشتراك');
                onSaved();
                onClose();
              } catch (e) {
                toast.error(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            تجديد
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {['30', '60', '90'].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={cx('flex-1 rounded-xl py-2 text-sm font-bold ring-1', days === d ? 'bg-navy text-white ring-navy' : 'ring-navy/10')}>
              {d} يوم
            </button>
          ))}
        </div>
        <Input label="عدد الأيام" type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
        <Input label="المبلغ المدفوع للتجديد (د.ع)" type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} />
        {sub && (
          <p className="rounded-xl bg-soft p-3 text-xs text-navy/60">
            {daysLeft(sub.endDate) > 0 ? 'سيُمدَّد من تاريخ الانتهاء الحالي.' : 'الاشتراك منتهٍ — سيبدأ التجديد من اليوم.'}
          </p>
        )}
      </div>
    </Modal>
  );
}
