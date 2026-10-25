'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi, useDebounced } from '@/hooks/useApi';
import { api, qs } from '@/lib/client';
import { CATEGORY } from '@/lib/labels';
import ProductForm from '@/components/ProductForm';
import { useToast } from '@/components/toast';
import { Icon } from '@/components/icons';
import { Badge, Button, Card, ConfirmModal, Empty, ErrorBox, IconButton, Loading, Money, PageHeader, Pager, SearchInput, Select, Tabs } from '@/components/ui';

export default function ProductsPage() {
  const { can } = useAdmin();
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [category, setCategory] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, product: null });
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const params = { q: dq, category, page, take: 30, ...(filter === 'low' ? { low: 1 } : filter === 'offer' ? { offer: 1 } : filter === 'inactive' ? { active: 0 } : {}) };
  const { data, loading, error, reload } = useApi(`/api/products${qs(params)}`);
  useEffect(() => setPage(1), [dq, category, filter]);
  const writable = can('products', 'write');

  return (
    <div>
      <PageHeader
        title="المنتجات"
        subtitle={data ? `${data.total} منتج` : ' '}
        icon="box"
        actions={writable && <Button icon="plus" onClick={() => setForm({ open: true, product: null })}>منتج جديد</Button>}
      />
      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="ابحث بالاسم، SKU، الباركود، الشركة..." className="flex-1" />
        <Select
          className="sm:w-52"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="كل التصنيفات"
          options={Object.entries(CATEGORY).map(([value, label]) => ({ value, label }))}
        />
      </div>
      <Tabs
        className="mb-4"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: '', label: 'المتاحة' },
          { value: 'offer', label: 'العروض 🔥' },
          { value: 'low', label: 'قاربت النفاد' },
          { value: 'inactive', label: 'معطلة' },
        ]}
      />
      <ErrorBox error={error} onRetry={reload} />

      {loading && !data ? (
        <Loading />
      ) : !data?.products.length ? (
        <Card>
          <Empty icon="box" title="لا توجد منتجات" text={writable ? 'أضف أول منتج لبدء البيع' : undefined} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.products.map((p) => {
              const low = p.stock <= p.minStock;
              return (
                <Card key={p.id} className="flex gap-4 p-4">
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-soft">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <Icon name="box" className="size-8 text-navy/25" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-extrabold">{p.name}</p>
                        <p className="truncate text-xs text-navy/45">
                          <span dir="ltr">{p.sku}</span> • {CATEGORY[p.category]}
                          {p.brand ? ` • ${p.brand}` : ''}
                        </p>
                      </div>
                      {writable && (
                        <div className="-me-2 -mt-1 flex">
                          <IconButton icon="edit" label="تعديل" onClick={() => setForm({ open: true, product: p })} />
                          {can('products', 'delete') && <IconButton icon="trash" tone="danger" label="حذف" onClick={() => setDel(p)} />}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Money value={p.sellPrice} className="text-brand-700" />
                      {p.oldPrice > p.sellPrice && <span className="text-xs text-navy/40 line-through">{Math.round(p.oldPrice).toLocaleString('en-US')}</span>}
                      {p.isOffer && <Badge tone="orange">عرض</Badge>}
                      {!p.isActive && <Badge>معطل</Badge>}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <Badge tone={p.stock === 0 ? 'red' : low ? 'amber' : 'green'}>{p.stock === 0 ? 'نفد المخزون' : `المخزون: ${p.stock}`}</Badge>
                      {p.costPrice !== undefined && <span className="text-navy/40">الشراء {Math.round(p.costPrice).toLocaleString('en-US')}</span>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <Pager page={page} take={30} total={data.total} onPage={setPage} />
        </>
      )}

      <ProductForm open={form.open} product={form.product} onClose={() => setForm({ open: false, product: null })} onSaved={reload} />
      <ConfirmModal
        open={Boolean(del)}
        onClose={() => setDel(null)}
        danger
        loading={busy}
        title="حذف المنتج"
        text={`هل تريد حذف "${del?.name}"؟ إذا كان له مبيعات سابقة سيتم تعطيله بدلاً من حذفه.`}
        confirmText="حذف"
        onConfirm={async () => {
          setBusy(true);
          try {
            const d = await api(`/api/products/${del.id}`, { method: 'DELETE' });
            toast.success(d.message);
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
