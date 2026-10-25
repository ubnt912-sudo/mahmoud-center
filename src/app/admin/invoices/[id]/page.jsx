'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import { fmtDateTime, invoiceNo, orderNo, waPhone } from '@/lib/format';
import { INVOICE_STATUS } from '@/lib/labels';
import { useToast } from '@/components/toast';
import { Icon, Logo, WhatsAppIcon } from '@/components/icons';
import { Button, ErrorBox, Input, Loading, Modal, Money, StatusBadge } from '@/components/ui';

export default function InvoiceDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { can } = useAdmin();
  const { data, loading, error, reload, setData } = useApi(`/api/invoices/${id}`);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const inv = data.invoice;
  const remaining = Math.max(0, inv.total - inv.paid);
  const o = inv.order;

  async function pay() {
    setBusy(true);
    try {
      const d = await api(`/api/invoices/${id}`, { method: 'PATCH', body: { amount: Number(amount) } });
      setData({ invoice: d.invoice });
      toast.success('تم تسجيل الدفعة');
      setPayOpen(false);
      setAmount('');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const wa = encodeURIComponent(
    `مرحباً ${inv.customer.name}\nفاتورتك من محمود سنتر ${invoiceNo(inv.number)}\nالإجمالي: ${Math.round(inv.total).toLocaleString('en-US')} د.ع\nالمدفوع: ${Math.round(inv.paid).toLocaleString('en-US')} د.ع` +
      (remaining > 0 ? `\nالمتبقي: ${Math.round(remaining).toLocaleString('en-US')} د.ع` : '\nمدفوعة بالكامل ✅') +
      `\nشكراً لتعاملك معنا 🌟`
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/invoices" className="inline-flex items-center gap-1 text-sm font-bold text-navy/50 hover:text-navy">
          <Icon name="chevron" className="size-4 rotate-180" /> الفواتير
        </Link>
        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/${waPhone(inv.customer.phone)}?text=${wa}`} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white hover:brightness-95">
            <WhatsAppIcon className="size-4" /> إرسال
          </a>
          {can('invoices', 'write') && remaining > 0 && inv.status !== 'CANCELLED' && (
            <Button variant="navy" icon="wallet" onClick={() => setPayOpen(true)}>
              تسجيل دفعة
            </Button>
          )}
          <Button icon="printer" onClick={() => window.print()}>
            طباعة
          </Button>
        </div>
      </div>

      <div className="card print-area overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 bg-navy p-6 text-white">
          <div className="flex items-center gap-3">
            <Logo className="size-12" />
            <div>
              <p className="text-xl font-black">محمود سنتر</p>
              <p className="text-xs text-beige/60">موبايلات • صيانة • إنترنت</p>
            </div>
          </div>
          <div className="text-end">
            <p className="text-xs text-beige/60">فاتورة رقم</p>
            <p className="text-2xl font-black text-brand">{invoiceNo(inv.number)}</p>
            <p className="text-xs text-beige/60">{fmtDateTime(inv.createdAt)}</p>
          </div>
        </div>

        <div className="grid gap-4 border-b border-navy/5 p-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold text-navy/45">الزبون</p>
            <p className="font-extrabold">{inv.customer.name}</p>
            <p className="text-sm text-navy/55" dir="ltr" style={{ textAlign: 'right' }}>
              {inv.customer.phone}
            </p>
            {inv.customer.address && <p className="text-sm text-navy/55">{inv.customer.address}</p>}
          </div>
          <div className="sm:text-end">
            <p className="text-xs font-bold text-navy/45">الحالة</p>
            <StatusBadge map={INVOICE_STATUS} value={inv.status} />
            <p className="mt-1 text-xs text-navy/45">
              الطلب {orderNo(o.number)}
              {o.createdBy ? ` • البائع: ${o.createdBy.name}` : ''}
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>المجموع</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((it, i) => (
                <tr key={it.id}>
                  <td className="text-navy/40">{i + 1}</td>
                  <td className="font-bold">{it.name}</td>
                  <td>{it.quantity}</td>
                  <td>
                    <Money value={it.price} />
                  </td>
                  <td>
                    <Money value={it.price * it.quantity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end p-6">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-navy/55">المجموع</span>
              <Money value={o.subtotal} />
            </div>
            {o.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>الخصم</span>
                <span>
                  − <Money value={o.discount} />
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-navy/10 pt-2 text-base">
              <span className="font-black">الإجمالي</span>
              <Money value={inv.total} className="text-lg" />
            </div>
            <div className="flex justify-between">
              <span className="text-navy/55">المدفوع</span>
              <Money value={inv.paid} className="text-emerald-700" />
            </div>
            <div className="flex justify-between rounded-xl bg-soft px-3 py-2">
              <span className="font-bold">المتبقي</span>
              <Money value={inv.status === 'CANCELLED' ? 0 : remaining} className={remaining > 0 && inv.status !== 'CANCELLED' ? 'text-red-600' : ''} />
            </div>
          </div>
        </div>
        {o.note && <p className="border-t border-navy/5 px-6 py-3 text-sm text-navy/60">ملاحظة: {o.note}</p>}
        <p className="border-t border-navy/5 bg-beige-50 px-6 py-3 text-center text-xs font-semibold text-navy/50">شكراً لتعاملكم مع محمود سنتر 🌟</p>
      </div>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        size="sm"
        title="تسجيل دفعة"
        subtitle={`المتبقي: ${Math.round(remaining).toLocaleString('en-US')} د.ع`}
        footer={
          <>
            <Button variant="soft" onClick={() => setAmount(String(remaining))}>
              كامل المتبقي
            </Button>
            <Button loading={busy} onClick={pay}>
              حفظ
            </Button>
          </>
        }
      >
        <Input label="المبلغ (د.ع)" type="number" min="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </Modal>
    </div>
  );
}
