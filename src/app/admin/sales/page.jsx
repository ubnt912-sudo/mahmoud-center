'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi, useDebounced } from '@/hooks/useApi';
import { api, qs } from '@/lib/client';
import { fmtDateTime, invoiceNo, orderNo } from '@/lib/format';
import { CATEGORY, INVOICE_STATUS, ORDER_STATUS } from '@/lib/labels';
import CustomerPicker, { pickerToPayload, pickerValid } from '@/components/CustomerPicker';
import { useToast } from '@/components/toast';
import { Icon } from '@/components/icons';
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, Input, Loading, Modal, Money, PageHeader, Pager, SearchInput, StatusBadge, Tabs, cx } from '@/components/ui';

export default function SalesPage() {
  const { can } = useAdmin();
  const [tab, setTab] = useState(can('sales', 'write') ? 'pos' : 'orders');
  return (
    <div>
      <PageHeader
        title="المبيعات"
        subtitle="نقطة البيع وسجل الطلبات"
        icon="cart"
        actions={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[...(can('sales', 'write') ? [{ value: 'pos', label: 'نقطة البيع' }] : []), { value: 'orders', label: 'سجل الطلبات' }]}
          />
        }
      />
      {tab === 'pos' ? <POS onDone={() => {}} /> : <Orders />}
    </div>
  );
}

function POS() {
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 200);
  const [category, setCategory] = useState('');
  const { data, loading, error, reload } = useApi(`/api/products${qs({ q: dq, category, take: 60 })}`);
  const [cart, setCart] = useState([]);
  const [picker, setPicker] = useState({ mode: 'existing' });
  const [discount, setDiscount] = useState('');
  const [paid, setPaid] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const cid = sp.get('customer');
    if (cid) {
      api(`/api/customers/${cid}`)
        .then((d) => setPicker({ mode: 'existing', customer: d.customer }))
        .catch(() => {});
      router.replace('/admin/sales');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.quantity, 0), [cart]);
  const disc = Math.min(Number(discount) || 0, subtotal);
  const total = subtotal - disc;
  const paidNum = paid === '' ? total : Math.min(Number(paid) || 0, total);
  const remaining = total - paidNum;
  const count = cart.reduce((s, l) => s + l.quantity, 0);

  function add(p) {
    if (p.stock <= 0) return toast.error('هذا المنتج نفد من المخزون');
    setCart((c) => {
      const ex = c.find((l) => l.id === p.id);
      if (ex) {
        if (ex.quantity >= p.stock) {
          toast.error(`المتوفر فقط ${p.stock}`);
          return c;
        }
        return c.map((l) => (l.id === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...c, { id: p.id, name: p.name, price: p.sellPrice, stock: p.stock, quantity: 1 }];
    });
  }
  const setQty = (id, qn) =>
    setCart((c) => c.map((l) => (l.id === id ? { ...l, quantity: Math.max(1, Math.min(l.stock, qn || 1)) } : l)));
  const setPrice = (id, pr) => setCart((c) => c.map((l) => (l.id === id ? { ...l, price: Math.max(0, Number(pr) || 0) } : l)));
  const removeLine = (id) => setCart((c) => c.filter((l) => l.id !== id));

  async function checkout() {
    if (!cart.length) return toast.error('السلة فارغة');
    if (!pickerValid(picker)) return toast.error('اختر الزبون أو أدخل بيانات زبون جديد');
    setBusy(true);
    try {
      const d = await api('/api/orders', {
        method: 'POST',
        body: {
          ...pickerToPayload(picker),
          items: cart.map((l) => ({ productId: l.id, quantity: l.quantity, price: l.price })),
          discount: disc,
          paid: paidNum,
          note: note || null,
        },
      });
      setDone(d);
      setCart([]);
      setDiscount('');
      setPaid('');
      setNote('');
      setPicker({ mode: 'existing' });
      setCartOpen(false);
      reload();
      toast.success('تمت عملية البيع بنجاح');
    } catch (e) {
      toast.error(e.message);
      reload();
    } finally {
      setBusy(false);
    }
  }

  const CartPanel = (
    <div className="flex h-full flex-col">
      <div className="space-y-4 p-4">
        <CustomerPicker value={picker} onChange={setPicker} />
      </div>
      <div className="flex-1 overflow-y-auto border-y border-navy/5">
        {cart.length === 0 ? (
          <Empty icon="cart" title="السلة فارغة" text="اضغط على المنتج لإضافته" />
        ) : (
          <ul className="divide-y divide-navy/5">
            {cart.map((l) => (
              <li key={l.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-extrabold leading-6">{l.name}</p>
                  <button onClick={() => removeLine(l.id)} className="text-navy/30 hover:text-red-500" aria-label="حذف">
                    <Icon name="x" className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center rounded-xl bg-soft">
                    <button className="flex size-8 items-center justify-center" onClick={() => setQty(l.id, l.quantity + 1)} aria-label="زيادة">
                      <Icon name="plus" className="size-4" />
                    </button>
                    <input
                      className="w-10 bg-transparent text-center text-sm font-black outline-none"
                      value={l.quantity}
                      inputMode="numeric"
                      onChange={(e) => setQty(l.id, parseInt(e.target.value, 10))}
                    />
                    <button className="flex size-8 items-center justify-center" onClick={() => setQty(l.id, l.quantity - 1)} aria-label="إنقاص">
                      <Icon name="minus" className="size-4" />
                    </button>
                  </div>
                  <input
                    className="input w-28 py-1.5 text-center text-sm"
                    type="number"
                    min="0"
                    value={l.price}
                    onChange={(e) => setPrice(l.id, e.target.value)}
                    title="سعر القطعة"
                  />
                  <Money value={l.price * l.quantity} className="w-24 text-end text-sm" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="الخصم" type="number" min="0" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
          <Input label="المدفوع" type="number" min="0" inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder={String(Math.round(total))} />
        </div>
        <Input placeholder="ملاحظة على الفاتورة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="space-y-1.5 rounded-2xl bg-soft p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-navy/55">المجموع ({count} قطعة)</span>
            <Money value={subtotal} />
          </div>
          {disc > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>الخصم</span>
              <span>− <Money value={disc} /></span>
            </div>
          )}
          <div className="flex justify-between border-t border-navy/10 pt-1.5 text-base">
            <span className="font-black">الإجمالي</span>
            <Money value={total} className="text-lg text-brand-700" />
          </div>
          {remaining > 0 && (
            <div className="flex justify-between text-red-600">
              <span className="font-bold">المتبقي (دين)</span>
              <Money value={remaining} />
            </div>
          )}
        </div>
        <Button className="w-full py-3 text-base" icon="check" loading={busy} disabled={!cart.length} onClick={checkout}>
          إتمام البيع وإصدار الفاتورة
        </Button>
      </div>
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
      <div>
        <SearchInput value={q} onChange={setQ} placeholder="ابحث أو امسح الباركود..." className="mb-3" autoFocus />
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
          {[['', 'الكل'], ...Object.entries(CATEGORY)].map(([k, v]) => (
            <button
              key={k}
              onClick={() => setCategory(k)}
              className={cx(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 transition',
                category === k ? 'bg-navy text-white ring-navy' : 'bg-white text-navy/60 ring-navy/10 hover:text-navy'
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <ErrorBox error={error} onRetry={reload} />
        {loading && !data ? (
          <Loading />
        ) : !data?.products.length ? (
          <Card>
            <Empty icon="box" title="لا توجد منتجات" />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {data.products.map((p) => {
              const inCart = cart.find((l) => l.id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => add(p)}
                  disabled={p.stock <= 0}
                  className={cx(
                    'card relative flex flex-col p-3 text-start transition active:scale-[.98]',
                    p.stock <= 0 ? 'opacity-50' : 'hover:-translate-y-0.5 hover:shadow-pop',
                    inCart && 'ring-2 ring-brand'
                  )}
                >
                  {inCart && (
                    <span className="absolute -top-2 -start-2 flex size-6 items-center justify-center rounded-full bg-brand text-xs font-black text-white shadow">
                      {inCart.quantity}
                    </span>
                  )}
                  <div className="mb-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-soft">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <Icon name="box" className="size-8 text-navy/20" />
                    )}
                  </div>
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-extrabold leading-5">{p.name}</p>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <Money value={p.sellPrice} className="text-sm text-brand-700" />
                    <span className={cx('text-[11px] font-bold', p.stock <= p.minStock ? 'text-red-500' : 'text-navy/40')}>{p.stock}</span>
                  </div>
                  {p.isOffer && <Badge tone="orange" className="absolute top-2 end-2">عرض</Badge>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* السلة — كمبيوتر */}
      <Card className="sticky top-6 hidden h-[calc(100dvh-7rem)] overflow-hidden lg:block">
        <CardHeader title="سلة البيع" icon="cart" subtitle={`${count} قطعة`} />
        <div className="h-[calc(100%-4.5rem)]">{CartPanel}</div>
      </Card>

      {/* زر السلة — هاتف */}
      <button
        onClick={() => setCartOpen(true)}
        className="fixed inset-x-4 bottom-24 z-20 flex items-center justify-between rounded-2xl bg-navy px-5 py-3.5 text-white shadow-pop lg:hidden"
      >
        <span className="flex items-center gap-2 font-bold">
          <Icon name="cart" /> السلة ({count})
        </span>
        <span className="font-black">{Math.round(total).toLocaleString('en-US')} د.ع</span>
      </button>
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="سلة البيع" subtitle={`${count} قطعة`}>
        <div className="-mx-5 -my-4">{CartPanel}</div>
      </Modal>

      <Modal
        open={Boolean(done)}
        onClose={() => setDone(null)}
        size="sm"
        title="تمت عملية البيع ✅"
        subtitle={done ? `${invoiceNo(done.invoice.number)} — ${done.customer.name}` : ''}
        footer={
          <>
            <Button variant="soft" onClick={() => setDone(null)}>
              بيع جديد
            </Button>
            <Link href={`/admin/invoices/${done?.invoice.id}`} className="btn btn-primary">
              <Icon name="printer" className="size-4" /> عرض وطباعة الفاتورة
            </Link>
          </>
        }
      >
        {done && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-navy/55">الإجمالي</span>
              <Money value={done.invoice.total} />
            </div>
            <div className="flex justify-between">
              <span className="text-navy/55">المدفوع</span>
              <Money value={done.invoice.paid} className="text-emerald-600" />
            </div>
            {done.invoice.total - done.invoice.paid > 0 && (
              <div className="flex justify-between">
                <span className="text-navy/55">المتبقي</span>
                <Money value={done.invoice.total - done.invoice.paid} className="text-red-600" />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Orders() {
  const { can } = useAdmin();
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(`/api/orders${qs({ q: dq, status, page, take: 25 })}`);
  const [cancel, setCancel] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setPage(1), [dq, status]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="رقم الطلب، اسم الزبون أو الهاتف..." className="flex-1" />
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[
            { value: '', label: 'الكل' },
            { value: 'COMPLETED', label: 'مكتمل' },
            { value: 'CANCELLED', label: 'ملغي' },
          ]}
        />
      </div>
      <ErrorBox error={error} onRetry={reload} />
      <Card className="overflow-hidden">
        {loading && !data ? (
          <Loading />
        ) : !data?.orders.length ? (
          <Empty icon="cart" title="لا توجد طلبات" />
        ) : (
          <>
            <ul className="divide-y divide-navy/5">
              {data.orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="font-extrabold">
                      {orderNo(o.number)} <span className="font-bold text-navy/50">— {o.customer.name}</span>
                    </p>
                    <p className="text-xs text-navy/45">
                      {fmtDateTime(o.createdAt)} • {o._count.items} صنف{o.createdBy ? ` • ${o.createdBy.name}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Money value={o.totalAmount} />
                    <StatusBadge map={ORDER_STATUS} value={o.status} />
                    {o.invoice && <StatusBadge map={INVOICE_STATUS} value={o.invoice.status} />}
                    {o.invoice && (
                      <Link href={`/admin/invoices/${o.invoice.id}`} className="btn btn-soft px-3 py-1.5 text-xs">
                        الفاتورة
                      </Link>
                    )}
                    {can('sales', 'write') && o.status !== 'CANCELLED' && (
                      <button onClick={() => setCancel(o)} className="btn btn-danger px-3 py-1.5 text-xs">
                        إلغاء
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Pager page={page} take={25} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(cancel)}
        onClose={() => setCancel(null)}
        size="sm"
        title="إلغاء الطلب"
        footer={
          <>
            <Button variant="soft" onClick={() => setCancel(null)}>
              تراجع
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/api/orders/${cancel.id}`, { method: 'PATCH', body: { status: 'CANCELLED' } });
                  toast.success('تم إلغاء الطلب وإرجاع الكميات للمخزون');
                  setCancel(null);
                  reload();
                } catch (e) {
                  toast.error(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              تأكيد الإلغاء
            </Button>
          </>
        }
      >
        <p className="text-sm leading-7 text-navy/70">
          سيتم إلغاء الطلب {cancel && orderNo(cancel.number)} وإلغاء فاتورته وإرجاع جميع الكميات إلى المخزون.
        </p>
      </Modal>
    </div>
  );
}
