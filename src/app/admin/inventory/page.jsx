'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi } from '@/hooks/useApi';
import { api, qs } from '@/lib/client';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import ProductSearch from '@/components/ProductSearch';
import { useToast } from '@/components/toast';
import { Icon } from '@/components/icons';
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, Input, Loading, Modal, PageHeader, Pager, StatCard, Tabs, cx } from '@/components/ui';

export default function InventoryPage() {
  const { can } = useAdmin();
  const toast = useToast();
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(`/api/inventory${qs({ type, page, take: 40 })}`);
  const low = useApi('/api/products?low=1&take=50');
  const [modal, setModal] = useState(null); // 'IN' | 'OUT'
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setPage(1), [type]);

  function open(t, p = null) {
    setModal(t);
    setProduct(p);
    setQty('');
    setReason('');
  }

  async function submit(e) {
    e.preventDefault();
    if (!product) return toast.error('اختر المنتج');
    setBusy(true);
    try {
      await api('/api/inventory', { method: 'POST', body: { productId: product.id, type: modal, quantity: Number(qty), reason: reason || null } });
      toast.success(modal === 'IN' ? 'تم إدخال الكمية للمخزون' : 'تم إخراج الكمية من المخزون');
      setModal(null);
      reload();
      low.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const s = data?.summary;
  return (
    <div className="space-y-5">
      <PageHeader
        title="المخزون"
        subtitle="حركة الدخول والخروج وتنبيهات النفاد"
        icon="layers"
        actions={
          can('inventory', 'write') && (
            <>
              <Button icon="arrowIn" onClick={() => open('IN')}>
                إدخال بضاعة
              </Button>
              <Button variant="soft" icon="arrowOut" onClick={() => open('OUT')}>
                إخراج
              </Button>
            </>
          )
        }
      />
      <ErrorBox error={error} onRetry={reload} />
      {s && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="عدد المنتجات" value={s.products} hint={`${s.units} قطعة`} icon="box" tone="navy" />
          <StatCard label="قيمة المخزون (بيع)" value={fmtMoney(s.stockValue)} hint={`الكلفة ${fmtMoney(s.stockCost)}`} icon="wallet" tone="green" />
          <StatCard label="قاربت النفاد" value={s.lowStock} icon="alert" tone="amber" />
          <StatCard label="نفدت" value={s.outOfStock} icon="ban" tone="red" />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader title="منتجات تحتاج تعبئة" icon="alert" subtitle="الكمية أقل من أو تساوي الحد الأدنى" />
          {low.loading && !low.data ? (
            <Loading />
          ) : !low.data?.products.length ? (
            <Empty icon="check" title="لا توجد نواقص" />
          ) : (
            <ul className="max-h-[32rem] divide-y divide-navy/5 overflow-y-auto">
              {low.data.products.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{p.name}</p>
                    <p className="text-xs text-navy/45">
                      الحد الأدنى {p.minStock} • <span dir="ltr">{p.sku}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock}</Badge>
                    {can('inventory', 'write') && (
                      <button onClick={() => open('IN', p)} className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand hover:bg-brand-100" title="إدخال">
                        <Icon name="plus" className="size-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden xl:col-span-3">
          <CardHeader
            title="سجل حركات المخزون"
            icon="refresh"
            action={
              <Tabs
                value={type}
                onChange={setType}
                tabs={[
                  { value: '', label: 'الكل' },
                  { value: 'IN', label: 'دخول' },
                  { value: 'OUT', label: 'خروج' },
                ]}
              />
            }
          />
          {loading && !data ? (
            <Loading />
          ) : !data?.transactions.length ? (
            <Empty icon="layers" title="لا توجد حركات" />
          ) : (
            <>
              <ul className="divide-y divide-navy/5">
                {data.transactions.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className={cx(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl',
                        t.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      )}
                    >
                      <Icon name={t.type === 'IN' ? 'arrowIn' : 'arrowOut'} className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold">{t.product.name}</p>
                      <p className="truncate text-xs text-navy/45">
                        {t.reason || '—'} • {fmtDateTime(t.createdAt)}
                        {t.user?.name ? ` • ${t.user.name}` : ''}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className={cx('font-black', t.type === 'IN' ? 'text-emerald-600' : 'text-red-600')}>
                        {t.type === 'IN' ? '+' : '−'}
                        {t.quantity}
                      </p>
                      <p className="text-[11px] text-navy/40">الرصيد {t.balanceAfter}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Pager page={page} take={40} total={data.total} onPage={setPage} />
            </>
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        size="sm"
        title={modal === 'IN' ? 'إدخال بضاعة للمخزون' : 'إخراج من المخزون'}
        subtitle={modal === 'OUT' ? 'تالف، مرتجع للمورد، أو تسوية جرد' : 'شراء بضاعة جديدة أو مرتجع من زبون'}
        footer={
          <>
            <Button variant="soft" onClick={() => setModal(null)}>
              إلغاء
            </Button>
            <Button form="inv-form" type="submit" loading={busy} variant={modal === 'OUT' ? 'navy' : 'primary'}>
              تأكيد
            </Button>
          </>
        }
      >
        <form id="inv-form" onSubmit={submit} className="space-y-4">
          {product ? (
            <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
              <div>
                <p className="text-sm font-extrabold">{product.name}</p>
                <p className="text-xs text-navy/50">المخزون الحالي: {product.stock}</p>
              </div>
              <button type="button" className="text-xs font-bold text-brand-700" onClick={() => setProduct(null)}>
                تغيير
              </button>
            </div>
          ) : (
            <ProductSearch onPick={setProduct} />
          )}
          <Input label="الكمية" type="number" min="1" required value={qty} onChange={(e) => setQty(e.target.value)} />
          <Input label="السبب / الملاحظة" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={modal === 'IN' ? 'فاتورة مورد رقم ...' : 'تالف / مرتجع ...'} />
        </form>
      </Modal>
    </div>
  );
}
