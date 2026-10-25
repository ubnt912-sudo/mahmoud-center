'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Button, Input, Modal, Textarea } from './ui';
import { useToast } from './toast';

export default function CustomerForm({ open, onClose, customer, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', phone: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setF({ name: customer?.name || '', phone: customer?.phone || '', address: customer?.address || '', notes: customer?.notes || '' });
  }, [open, customer]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const d = customer
        ? await api(`/api/customers/${customer.id}`, { method: 'PATCH', body: f })
        : await api('/api/customers', { method: 'POST', body: f });
      toast.success(customer ? 'تم حفظ التعديلات' : 'تمت إضافة الزبون');
      onSaved?.(d);
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
      title={customer ? 'تعديل بيانات الزبون' : 'إضافة زبون جديد'}
      subtitle={customer ? customer.name : 'سيتم إنشاء رابط بوابة خاص بالزبون تلقائياً'}
      footer={
        <>
          <Button variant="soft" onClick={onClose}>
            إلغاء
          </Button>
          <Button form="customer-form" type="submit" loading={saving} icon="check">
            حفظ
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input label="اسم الزبون" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input
          label="رقم الهاتف"
          required
          dir="ltr"
          inputMode="tel"
          className="[&_input]:text-left"
          hint="مثال: 07701234567 (يُحوَّل تلقائياً لصيغة واتساب)"
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
        />
        <Input label="العنوان" className="sm:col-span-2" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        <Textarea label="ملاحظات" className="sm:col-span-2" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </form>
    </Modal>
  );
}
