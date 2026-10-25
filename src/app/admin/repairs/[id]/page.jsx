'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import { fmtDate, fmtDateTime, repairNo, waPhone } from '@/lib/format';
import { REPAIR_FLOW, REPAIR_STATUS } from '@/lib/labels';
import RepairForm from '@/components/RepairForm';
import { useToast } from '@/components/toast';
import { Icon, WhatsAppIcon } from '@/components/icons';
import { Button, Card, CardHeader, ConfirmModal, ErrorBox, Input, Loading, Modal, Money, StatusBadge, Textarea, cx } from '@/components/ui';

export default function RepairDetail() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can } = useAdmin();
  const { data, loading, error, reload, setData } = useApi(`/api/repairs/${id}`);
  const [edit, setEdit] = useState(false);
  const [statusModal, setStatusModal] = useState(null);
  const [note, setNote] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const r = data.repair;
  const writable = can('repairs', 'write');
  const remaining = Math.max(0, r.cost - r.paid);
  const flowIdx = REPAIR_FLOW.indexOf(r.status);

  async function patch(body, msg) {
    setBusy(true);
    try {
      const d = await api(`/api/repairs/${id}`, { method: 'PATCH', body });
      setData({ ...data, repair: d.repair });
      toast.success(msg);
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus() {
    const ok = await patch({ status: statusModal, note: note || null }, `تم تغيير الحالة إلى: ${REPAIR_STATUS[statusModal].label}`);
    if (ok) {
      setStatusModal(null);
      setNote('');
    }
  }

  async function addPayment() {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return toast.error('أدخل مبلغاً صحيحاً');
    const ok = await patch({ paid: Math.min(r.cost, r.paid + amt), note: `دفعة: ${amt.toLocaleString('en-US')} د.ع` }, 'تم تسجيل الدفعة');
    if (ok) {
      setPayOpen(false);
      setPayAmount('');
    }
  }

  const portal = typeof window !== 'undefined' ? `${window.location.origin}/customer/${r.customer.customerToken}` : '';
  const waText = encodeURIComponent(
    `مرحباً ${r.customer.name} \nحالة جهازك ${r.deviceCompany} ${r.deviceModel} (${repairNo(r.number)}): ${REPAIR_STATUS[r.status].label}\n` +
      (r.status === 'READY' ? `الجهاز جاهز للاستلام ✅${remaining > 0 ? `\nالمبلغ المتبقي: ${Math.round(remaining).toLocaleString('en-US')} د.ع` : ''}\n` : '') +
      `تابع التفاصيل: ${portal}\nمحمود سنتر`
  );

  return (
    <div className="space-y-5">
      <div className="no-print flex items-center justify-between">
        <Link href="/admin/repairs" className="inline-flex items-center gap-1 text-sm font-bold text-navy/50 hover:text-navy">
          <Icon name="chevron" className="size-4 rotate-180" /> الصيانة
        </Link>
        <Button variant="soft" icon="printer" onClick={() => window.print()}>
          طباعة وصل
        </Button>
      </div>

      <Card className="print-area overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="text-sm font-bold text-navy/45">طلب صيانة {repairNo(r.number)}</p>
            <h1 className="text-2xl font-black">
              {r.deviceCompany} {r.deviceModel}
            </h1>
            <Link href={`/admin/customers/${r.customer.id}`} className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-brand">
              <Icon name="user" className="size-4" /> {r.customer.name} <span dir="ltr" className="text-navy/50">{r.customer.phone}</span>
            </Link>
          </div>
          <StatusBadge map={REPAIR_STATUS} value={r.status} />
        </div>

        {/* مراحل الحالة */}
        <div className="no-scrollbar overflow-x-auto border-y border-navy/5 bg-soft/50 px-5 py-4">
          <ol className="flex min-w-max items-center gap-2">
            {REPAIR_FLOW.map((s, i) => {
              const done = r.status !== 'CANCELLED' && i <= flowIdx;
              return (
                <li key={s} className="flex items-center gap-2">
                  <span
                    className={cx(
                      'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
                      done ? (i === flowIdx ? 'bg-brand text-white' : 'bg-navy text-white') : 'bg-white text-navy/40 ring-1 ring-navy/10'
                    )}
                  >
                    {done && i < flowIdx ? <Icon name="check" className="size-3.5" /> : <span>{REPAIR_STATUS[s].icon}</span>}
                    {REPAIR_STATUS[s].label}
                  </span>
                  {i < REPAIR_FLOW.length - 1 && <span className={cx('h-0.5 w-5', done && i < flowIdx ? 'bg-navy' : 'bg-navy/10')} />}
                </li>
              );
            })}
          </ol>
        </div>

        <dl className="grid gap-px bg-navy/5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['IMEI', r.imei || '—'],
            ['تاريخ الاستلام', fmtDate(r.createdAt)],
            ['التسليم المتوقع', fmtDate(r.expectedDate)],
            ['تاريخ التسليم الفعلي', fmtDate(r.deliveredAt)],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-5 py-3.5">
              <dt className="text-xs font-bold text-navy/45">{k}</dt>
              <dd className="font-bold" dir={k === 'IMEI' ? 'ltr' : undefined} style={k === 'IMEI' ? { textAlign: 'right' } : undefined}>
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
          <div>
            <p className="label">وصف العطل</p>
            <p className="rounded-xl bg-soft p-3 text-sm leading-7">{r.issue}</p>
          </div>
          <div className="no-print">
            <p className="label">ملاحظات الفني (داخلية)</p>
            <p className="rounded-xl bg-beige-50 p-3 text-sm leading-7 ring-1 ring-beige">{r.techNotes || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px border-t border-navy/5 bg-navy/5">
          <div className="bg-white px-5 py-4">
            <p className="text-xs font-bold text-navy/45">التكلفة</p>
            <Money value={r.cost} className="text-lg" />
          </div>
          <div className="bg-white px-5 py-4">
            <p className="text-xs font-bold text-navy/45">المدفوع</p>
            <Money value={r.paid} className="text-lg text-emerald-600" />
          </div>
          <div className="bg-white px-5 py-4">
            <p className="text-xs font-bold text-navy/45">المتبقي</p>
            <Money value={remaining} className={cx('text-lg', remaining > 0 && 'text-red-600')} />
          </div>
        </div>

        <div className="no-print flex flex-wrap gap-2 border-t border-navy/5 bg-soft/40 p-4">
          <a href={`https://wa.me/${waPhone(r.customer.phone)}?text=${waText}`} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white hover:brightness-95">
            <WhatsAppIcon className="size-4" /> إشعار الزبون
          </a>
          {writable && (
            <>
              {remaining > 0 && (
                <Button variant="navy" icon="wallet" onClick={() => setPayOpen(true)}>
                  تسجيل دفعة
                </Button>
              )}
              <Button variant="soft" icon="edit" onClick={() => setEdit(true)}>
                تعديل
              </Button>
              <Button variant="soft" icon="message" onClick={() => setStatusModal(r.status)}>
                إضافة ملاحظة
              </Button>
            </>
          )}
          {can('repairs', 'delete') && (
            <Button variant="danger" icon="trash" onClick={() => setDel(true)}>
              حذف
            </Button>
          )}
        </div>
      </Card>

      <div className="no-print grid gap-5 lg:grid-cols-5">
        {writable && (
          <Card className="lg:col-span-2">
            <CardHeader title="تغيير الحالة" icon="refresh" subtitle="يُسجَّل كل تغيير في السجل الزمني" />
            <div className="grid grid-cols-2 gap-2 p-4">
              {Object.entries(REPAIR_STATUS).map(([k, v]) => (
                <button
                  key={k}
                  disabled={k === r.status}
                  onClick={() => setStatusModal(k)}
                  className={cx(
                    'flex items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-bold ring-1 transition',
                    k === r.status ? 'bg-navy text-white ring-navy' : 'bg-white ring-navy/10 hover:bg-brand-50 hover:ring-brand-100',
                    k === 'CANCELLED' && k !== r.status && 'text-red-600'
                  )}
                >
                  <span>{v.icon}</span> {v.label}
                </button>
              ))}
            </div>
          </Card>
        )}

        <Card className={writable ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <CardHeader title="السجل الزمني" icon="clock" subtitle={`${r.timeline.length} حدث`} />
          <ol className="relative space-y-5 p-5 ps-10">
            <span className="absolute inset-y-6 start-[1.6rem] w-px bg-navy/10" />
            {[...r.timeline].reverse().map((t, i) => (
              <li key={t.id} className="relative">
                <span
                  className={cx(
                    'absolute -start-[1.1rem] top-1 flex size-5 items-center justify-center rounded-full text-[10px] ring-4 ring-white',
                    i === 0 ? 'bg-brand text-white' : 'bg-navy-100'
                  )}
                >
                  {i === 0 ? '●' : ''}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge map={REPAIR_STATUS} value={t.status} />
                  <span className="text-xs text-navy/45">{fmtDateTime(t.createdAt)}</span>
                  {t.user?.name && <span className="text-xs text-navy/40">— {t.user.name}</span>}
                </div>
                {t.note && <p className="mt-1.5 text-sm text-navy/70">{t.note}</p>}
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <RepairForm open={edit} onClose={() => setEdit(false)} repair={r} onSaved={() => reload()} />

      <Modal
        open={Boolean(statusModal)}
        onClose={() => setStatusModal(null)}
        size="sm"
        title={statusModal === r.status ? 'إضافة ملاحظة' : `تغيير الحالة إلى: ${statusModal ? REPAIR_STATUS[statusModal].label : ''}`}
        footer={
          <>
            <Button variant="soft" onClick={() => setStatusModal(null)}>
              إلغاء
            </Button>
            <Button
              loading={busy}
              variant={statusModal === 'CANCELLED' ? 'danger' : 'primary'}
              onClick={() =>
                statusModal === r.status
                  ? note.trim()
                    ? patch({ note }, 'تمت إضافة الملاحظة').then((ok) => ok && (setStatusModal(null), setNote('')))
                    : toast.error('اكتب الملاحظة')
                  : changeStatus()
              }
            >
              تأكيد
            </Button>
          </>
        }
      >
        <Textarea label="ملاحظة (تظهر للزبون في السجل)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: تم تبديل الشاشة بنجاح" />
      </Modal>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        size="sm"
        title="تسجيل دفعة"
        subtitle={`المتبقي: ${Math.round(remaining).toLocaleString('en-US')} د.ع`}
        footer={
          <>
            <Button variant="soft" onClick={() => setPayAmount(String(remaining))}>
              كامل المتبقي
            </Button>
            <Button loading={busy} onClick={addPayment}>
              حفظ الدفعة
            </Button>
          </>
        }
      >
        <Input label="المبلغ (د.ع)" type="number" min="1" max={remaining} inputMode="numeric" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus />
      </Modal>

      <ConfirmModal
        open={del}
        onClose={() => setDel(false)}
        danger
        loading={busy}
        title="حذف طلب الصيانة"
        text="سيتم حذف الطلب وسجله الزمني نهائياً. هل أنت متأكد؟"
        confirmText="حذف"
        onConfirm={async () => {
          setBusy(true);
          try {
            await api(`/api/repairs/${id}`, { method: 'DELETE' });
            toast.success('تم الحذف');
            router.replace('/admin/repairs');
          } catch (e) {
            toast.error(e.message);
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
