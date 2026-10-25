'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { CATEGORY } from '@/lib/labels';
import { Button, Input, Modal, Select, Textarea, Toggle } from './ui';
import { useToast } from './toast';

export default function ProductForm({ open, onClose, product, onSaved }) {
  const toast = useToast();
  const empty = {
    sku: '',
    barcode: '',
    name: '',
    category: 'ACCESSORY',
    brand: '',
    model: '',
    description: '',
    images: '',
    costPrice: '',
    sellPrice: '',
    oldPrice: '',
    stock: '',
    minStock: '5',
    isOffer: false,
    isActive: true,
  };
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(
      product
        ? {
            ...empty,
            ...Object.fromEntries(Object.entries(product).map(([k, v]) => [k, v ?? ''])),
            images: (product.images || []).join('\n'),
            isOffer: product.isOffer,
            isActive: product.isActive,
          }
        : { ...empty, sku: `MC-${Date.now().toString(36).toUpperCase().slice(-6)}` }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const margin = Number(f.sellPrice) - Number(f.costPrice);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const body = {
      sku: f.sku,
      barcode: f.barcode || null,
      name: f.name,
      category: f.category,
      brand: f.brand || null,
      model: f.model || null,
      description: f.description || null,
      images: f.images,
      costPrice: Number(f.costPrice || 0),
      sellPrice: Number(f.sellPrice || 0),
      oldPrice: f.oldPrice === '' ? null : Number(f.oldPrice),
      minStock: Number(f.minStock || 0),
      isOffer: f.isOffer,
      isActive: f.isActive,
      ...(product ? {} : { stock: Number(f.stock || 0) }),
    };
    try {
      const d = product
        ? await api(`/api/products/${product.id}`, { method: 'PATCH', body })
        : await api('/api/products', { method: 'POST', body });
      toast.success(product ? 'تم حفظ المنتج' : 'تمت إضافة المنتج');
      onSaved?.(d.product);
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
      title={product ? 'تعديل المنتج' : 'منتج جديد'}
      subtitle={product?.name}
      footer={
        <>
          <Button variant="soft" onClick={onClose}>
            إلغاء
          </Button>
          <Button form="product-form" type="submit" icon="check" loading={saving}>
            حفظ
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input label="اسم المنتج" required className="sm:col-span-2" value={f.name} onChange={set('name')} />
        <Input label="SKU" required dir="ltr" value={f.sku} onChange={set('sku')} />
        <Input label="الباركود" dir="ltr" value={f.barcode} onChange={set('barcode')} placeholder="اختياري" />
        <Select
          label="التصنيف"
          required
          value={f.category}
          onChange={set('category')}
          options={Object.entries(CATEGORY).map(([value, label]) => ({ value, label }))}
        />
        <Input label="الشركة" value={f.brand} onChange={set('brand')} />
        <Input label="الموديل" value={f.model} onChange={set('model')} />
        <Input label="الحد الأدنى للمخزون" type="number" min="0" value={f.minStock} onChange={set('minStock')} />
        <Input label="سعر الشراء (د.ع)" required type="number" min="0" inputMode="numeric" value={f.costPrice} onChange={set('costPrice')} />
        <Input
          label="سعر البيع (د.ع)"
          required
          type="number"
          min="0"
          inputMode="numeric"
          value={f.sellPrice}
          onChange={set('sellPrice')}
          hint={f.sellPrice && f.costPrice ? `الربح بالقطعة: ${Math.round(margin).toLocaleString('en-US')} د.ع` : undefined}
        />
        <Input label="السعر القديم (قبل العرض)" type="number" min="0" value={f.oldPrice} onChange={set('oldPrice')} placeholder="اختياري" />
        {!product ? (
          <Input label="الكمية الافتتاحية" type="number" min="0" value={f.stock} onChange={set('stock')} hint="تُسجَّل كحركة إدخال في المخزون" />
        ) : (
          <div className="rounded-xl bg-soft p-3 text-sm">
            <p className="font-bold">الكمية الحالية: {product.stock}</p>
            <p className="text-xs text-navy/50">لتعديل الكمية استخدم صفحة المخزون (إدخال/إخراج)</p>
          </div>
        )}
        <Textarea label="الوصف" className="sm:col-span-2" value={f.description} onChange={set('description')} />
        <Textarea
          label="روابط الصور"
          className="sm:col-span-2"
          rows={2}
          dir="ltr"
          hint="رابط في كل سطر (https://...)"
          value={f.images}
          onChange={set('images')}
        />
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <Toggle checked={f.isOffer} onChange={(v) => setF({ ...f, isOffer: v })} label="ضمن العروض 🔥" />
          <Toggle checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} label="متاح للبيع" />
        </div>
      </form>
    </Modal>
  );
}
