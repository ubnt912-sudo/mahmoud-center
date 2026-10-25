'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import { fmtDate, fmtDateTime, invoiceNo, orderNo, repairNo, waPhone } from '@/lib/format';
import { CUSTOMER_STATUS, INVOICE_STATUS, ISP_TYPE, MSG_TYPE, ORDER_STATUS, RATING, REPAIR_STATUS, SUB_STATUS } from '@/lib/labels';
import CustomerForm from '@/components/CustomerForm';
import MessageForm from '@/components/MessageForm';
import { useToast } from '@/components/toast';
import { Icon, WhatsAppIcon } from '@/components/icons';
import { Avatar, Badge, Button, Card, ConfirmModal, CopyButton, Empty, ErrorBox, Loading, Modal, Money, StatusBadge, Tabs, Textarea } from '@/components/ui';

export default function CustomerDetail() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can } = useAdmin();
  const { data, loading, error, reload } = useApi(`/api/customers/${id}`);
  const [tab, setTab] = useState('repairs');
  const [edit, setEdit] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const c = data.customer;

  const debt =
    c.invoices.filter((i) => i.status !== 'CANCELLED').reduce((s, i) => s + (i.total - i.paid), 0) +
    c.repairs.filter((r) => r.status !== 'CANCELLED').reduce((s, r) => s + Math.max(0, r.cost - r.paid), 0);

  async function setStatus(status, reason) {
    setBusy(true);
    try {
      await api(`/api/customers/${id}`, { method: 'PATCH', body: { status, blockReason: reason } });
      toast.success(status === 'BLOCKED' ? 'تم حظر الزبون' : 'تم إلغاء الحظر');
      setBlockOpen(false);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function runConfirm() {
    setBusy(true);
    try {
      if (confirm === 'token') {
        await api(`/api/customers/${id}/token`, { method: 'POST' });
        toast.success('تم توليد رابط جديد — الرابط القديم لم يعد يعمل');
        reload();
      } else if (confirm === 'delete') {
        await api(`/api/customers/${id}`, { method: 'DELETE' });
        toast.success('تم حذف الزبون');
        router.replace('/admin/customers');
      }
      setConfirm(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const tabs = [
    { value: 'repairs', label: 'الصيانة', count: c.repairs.length },
    { value: 'orders', label: 'الطلبات', count: c.orders.length },
    { value: 'subscriptions', label: 'الاشتراكات', count: c.subscriptions.length },
    { value: 'invoices', label: 'الفواتير', count: c.invoices.length },
    { value: 'messages', label: 'الرسائل', count: c.messages.length },
    { value: 'feedback', label: 'التقييمات', count: c.feedbacks.length },
  ];

  return (
    <div className="space-y-5">
      <Link href="/admin/customers" className="inline-flex items-center gap-1 text-sm font-bold text-navy/50 hover:text-navy">
        <Icon name="chevron" className="size-4 rotate-180" /> الزبائن
      </Link>

      <Card className="overflow-hidden">
        <div className="relative bg-navy p-5 text-white sm:p-6">
          <div className="pointer-events-none absolute -top-16 -end-10 size-48 rounded-full bg-brand/30 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-4">
            <Avatar name={c.name} className="size-14 rounded-2xl text-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black sm:text-2xl">{c.name}</h1>
                <StatusBadge map={CUSTOMER_STATUS} value={c.status} />
              </div>
              <p className="mt-0.5 text-sm text-beige/70" dir="ltr" style={{ textAlign: 'right' }}>
                {c.phone}
              </p>
              {c.address && <p className="text-xs text-beige/50">{c.address}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`tel:+${waPhone(c.phone)}`} className="btn bg-white/10 text-white hover:bg-white/20">
                <Icon name="phone" className="size-4" /> اتصال
              </a>
              <a href={data.waLink} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white hover:brightness-95">
                <WhatsAppIcon className="size-4" /> إرسال الرابط
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-navy/5 sm:grid-cols-4">
          {[
            ['أجهزة بالصيانة', c.repairs.filter((r) => !['DELIVERED', 'CANCELLED'].includes(r.status)).length],
            ['إجمالي الطلبات', c.orders.filter((o) => o.status !== 'CANCELLED').length],
            ['اشتراك فعّال', c.subscriptions.filter((s) => ['ACTIVE', 'EXPIRING_SOON'].includes(s.status)).length],
            ['المتبقي بذمته', <Money key="d" value={debt} className={debt > 0 ? 'text-red-600' : ''} />],
          ].map(([l, v]) => (
            <div key={l} className="bg-white px-5 py-4">
              <p className="text-xs font-bold text-navy/45">{l}</p>
              <p className="text-lg font-black">{v}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-navy/5 p-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-soft px-3 py-2">
            <Icon name="link" className="size-4 shrink-0 text-brand" />
            <span className="truncate text-xs font-semibold text-navy/60" dir="ltr">
              {data.customerLink}
            </span>
          </div>
          <CopyButton text={data.customerLink} label="نسخ الرابط" />
          <a href={`/customer/${c.customerToken}`} target="_blank" rel="noreferrer" className="btn btn-soft">
            <Icon name="eye" className="size-4" /> معاينة البوابة
          </a>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-navy/5 bg-soft/40 p-4">
          {can('repairs', 'write') && (
            <Link href={`/admin/repairs?new=1&customer=${c.id}`} className="btn btn-primary">
              <Icon name="wrench" className="size-4" /> صيانة جديدة
            </Link>
          )}
          {can('sales', 'write') && (
            <Link href={`/admin/sales?customer=${c.id}`} className="btn btn-navy">
              <Icon name="cart" className="size-4" /> بيع لهذا الزبون
            </Link>
          )}
          {can('subscriptions', 'write') && (
            <Link href={`/admin/subscriptions?new=1&customer=${c.id}`} className="btn btn-soft">
              <Icon name="wifi" className="size-4" /> اشتراك إنترنت
            </Link>
          )}
          {can('messages', 'write') && (
            <Button variant="soft" icon="send" onClick={() => setMsgOpen(true)}>
              رسالة
            </Button>
          )}
          {can('customers', 'write') && (
            <>
              <Button variant="soft" icon="edit" onClick={() => setEdit(true)}>
                تعديل
              </Button>
              <Button variant="soft" icon="refresh" onClick={() => setConfirm('token')}>
                رابط جديد
              </Button>
              {c.status === 'ACTIVE' ? (
                <Button variant="danger" icon="ban" onClick={() => setBlockOpen(true)}>
                  حظر
                </Button>
              ) : (
                <Button variant="soft" icon="check" loading={busy} onClick={() => setStatus('ACTIVE')}>
                  إلغاء الحظر
                </Button>
              )}
            </>
          )}
          {can('customers', 'delete') && (
            <Button variant="danger" icon="trash" onClick={() => setConfirm('delete')}>
              حذف
            </Button>
          )}
        </div>
        {c.status === 'BLOCKED' && c.blockReason && (
          <p className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-700">سبب الحظر: {c.blockReason}</p>
        )}
        {c.notes && <p className="border-t border-navy/5 px-5 py-3 text-sm text-navy/60">📝 {c.notes}</p>}
      </Card>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      <Card className="overflow-hidden">
        {tab === 'repairs' &&
          (c.repairs.length === 0 ? (
            <Empty icon="wrench" title="لا يوجد سجل صيانة" />
          ) : (
            <ul className="divide-y divide-navy/5">
              {c.repairs.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/repairs/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-soft/60">
                    <div className="min-w-0">
                      <p className="font-extrabold">
                        {r.deviceCompany} {r.deviceModel} <span className="text-xs font-bold text-navy/40">{repairNo(r.number)}</span>
                      </p>
                      <p className="truncate text-sm text-navy/55">{r.issue}</p>
                      <p className="text-xs text-navy/40">{fmtDate(r.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-end text-xs">
                        <Money value={r.cost} />
                        <p className="text-navy/45">مدفوع {Math.round(r.paid).toLocaleString('en-US')}</p>
                      </div>
                      <StatusBadge map={REPAIR_STATUS} value={r.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'orders' &&
          (c.orders.length === 0 ? (
            <Empty icon="cart" title="لا توجد طلبات" />
          ) : (
            <ul className="divide-y divide-navy/5">
              {c.orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-extrabold">{orderNo(o.number)}</p>
                    <p className="truncate text-sm text-navy/55">{o.items.map((i) => `${i.name} ×${i.quantity}`).join('، ')}</p>
                    <p className="text-xs text-navy/40">{fmtDateTime(o.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Money value={o.totalAmount} />
                    <StatusBadge map={ORDER_STATUS} value={o.status} />
                    {o.invoice && (
                      <Link href={`/admin/invoices/${o.invoice.id}`} className="btn btn-soft px-3 py-1.5 text-xs">
                        الفاتورة
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'subscriptions' &&
          (c.subscriptions.length === 0 ? (
            <Empty icon="wifi" title="لا توجد اشتراكات" />
          ) : (
            <ul className="divide-y divide-navy/5">
              {c.subscriptions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-extrabold">
                      {s.planName} <span className="text-sm font-bold text-navy/45">— {s.speed}</span>
                    </p>
                    <p className="text-sm text-navy/55">
                      {ISP_TYPE[s.type]} • {fmtDate(s.startDate)} ← {fmtDate(s.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-end text-xs">
                      <Money value={s.price} />
                      <p className="text-navy/45">مدفوع {Math.round(s.paid).toLocaleString('en-US')}</p>
                    </div>
                    <StatusBadge map={SUB_STATUS} value={s.status} />
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'invoices' &&
          (c.invoices.length === 0 ? (
            <Empty icon="receipt" title="لا توجد فواتير" />
          ) : (
            <ul className="divide-y divide-navy/5">
              {c.invoices.map((i) => (
                <li key={i.id}>
                  <Link href={`/admin/invoices/${i.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-soft/60">
                    <div>
                      <p className="font-extrabold">{invoiceNo(i.number)}</p>
                      <p className="text-xs text-navy/40">{fmtDateTime(i.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        الإجمالي <Money value={i.total} />
                      </span>
                      {i.total - i.paid > 0 && i.status !== 'CANCELLED' && (
                        <span className="text-red-600">
                          المتبقي <Money value={i.total - i.paid} />
                        </span>
                      )}
                      <StatusBadge map={INVOICE_STATUS} value={i.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'messages' &&
          (c.messages.length === 0 ? (
            <Empty icon="message" title="لا توجد رسائل" />
          ) : (
            <ul className="divide-y divide-navy/5">
              {c.messages.map((m) => (
                <li key={m.id} className="px-5 py-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone={m.sender === 'STAFF' ? 'navy' : 'orange'}>{m.sender === 'STAFF' ? 'من المحل' : 'من الزبون'}</Badge>
                    <Badge>{MSG_TYPE[m.type]}</Badge>
                    {!m.isRead && <Badge tone="red">غير مقروءة</Badge>}
                    <span className="ms-auto text-xs text-navy/40">{fmtDateTime(m.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-7">{m.content}</p>
                  {m.reply && <p className="mt-2 rounded-xl bg-soft px-3 py-2 text-sm">↩︎ {m.reply}</p>}
                </li>
              ))}
            </ul>
          ))}

        {tab === 'feedback' &&
          (c.feedbacks.length === 0 ? (
            <Empty icon="smile" title="لا توجد تقييمات" />
          ) : (
            <ul className="divide-y divide-navy/5">
              {c.feedbacks.map((f) => (
                <li key={f.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="text-3xl">{RATING[f.rating].emoji}</span>
                  <div className="flex-1">
                    <p className="font-extrabold">{RATING[f.rating].label}</p>
                    {f.comment && <p className="text-sm text-navy/60">{f.comment}</p>}
                  </div>
                  <span className="text-xs text-navy/40">{fmtDateTime(f.createdAt)}</span>
                </li>
              ))}
            </ul>
          ))}
      </Card>

      <CustomerForm open={edit} onClose={() => setEdit(false)} customer={c} onSaved={reload} />
      <MessageForm open={msgOpen} onClose={() => setMsgOpen(false)} customer={c} onSaved={reload} />

      <Modal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title="حظر الزبون"
        subtitle="لن يتمكن من فتح بوابته حتى يُلغى الحظر"
        size="sm"
        footer={
          <>
            <Button variant="soft" onClick={() => setBlockOpen(false)}>
              إلغاء
            </Button>
            <Button variant="danger" loading={busy} onClick={() => setStatus('BLOCKED', blockReason)}>
              تأكيد الحظر
            </Button>
          </>
        }
      >
        <Textarea label="سبب الحظر (اختياري)" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
      </Modal>

      <ConfirmModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={busy}
        danger={confirm === 'delete'}
        title={confirm === 'delete' ? 'حذف الزبون' : 'توليد رابط جديد'}
        confirmText={confirm === 'delete' ? 'حذف نهائي' : 'توليد'}
        text={
          confirm === 'delete'
            ? 'سيتم حذف الزبون نهائياً. لا يمكن حذف زبون لديه صيانة أو طلبات أو اشتراكات.'
            : 'سيتوقف الرابط الحالي عن العمل وسيُنشأ رابط جديد يجب إرساله للزبون.'
        }
      />
    </div>
  );
}
