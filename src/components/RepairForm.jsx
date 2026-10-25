'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { toInputDate } from '@/lib/format';
import CustomerPicker, { pickerToPayload, pickerValid } from './CustomerPicker';
import { Button, Input, Modal, Textarea } from './ui';
import { useToast } from './toast';

const COMPANIES = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Honor', 'Oppo', 'Realme', 'Infinix', 'Tecno', 'Vivo', 'Nokia', 'Google'];

export default function RepairForm({ open, onClose, repair, initialCustomer, onSaved }) {
  const toast = useToast();
  const [picker, setPicker] = useState({ mode: 'existing' });
  const empty = { deviceCompany: '', deviceModel: '', imei: '', issue: '', techNotes: '', cost: '', paid: '', expectedDate: '' };
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (repair) {
      setF({
        deviceCompany: repair.deviceCompany,
        deviceModel: repair.deviceModel,
        imei: repair.imei || '',
        issue: repair.issue,
        techNotes: repair.techNotes || '',
        cost: repair.cost,
        paid: repair.paid,
        expectedDate: toInputDate(repair.expectedDate),
      });
    } else {
      setF(empty);
      setPicker(initialCustomer ? { mode: 'existing', customer: initialCustomer } : { mode: 'existing' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, repair, initialCustomer]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!repair && !pickerValid(picker)) return toast.error('اختر زبوناً أو أدخل بيانات زبون جديد');
    setSaving(true);
    const body = {
      ...f,
      cost: f.cost === '' ? 0 : Number(f.cost),
      paid: f.paid === '' ? 0 : Number(f.paid),
      expectedDate: f.expectedDate || null,
    };
    try {
      const d = repair
        ? await api(`/api/repairs/${repair.id}`, { method: 'PATCH', body })
        : await api('/api/repairs', { method: 'POST', body: { ...body, ...pickerToPayload(picker) } });
      toast.success(repair ? 'تم حفظ التعديلات' : 'تم إنشاء طلب الصيانة');
      onSaved?.(d.repair);
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
      title={repair ? 'تعديل طلب الصيانة' : 'طلب صيانة جديد'}
      subtitle={repair ? `${repair.deviceCompany} ${repair.deviceModel}` : 'سيتم تسجيل الحالة "تم الاستلام" تلقائياً'}
      footer={
        <>
          <Button variant="soft" onClick={onClose}>
            إلغاء
          </Button>
          <Button form="repair-form" type="submit" icon="check" loading={saving}>
            حفظ
          </Button>
        </>
      }
    >
      <form id="repair-form" onSubmit={submit} className="space-y-4">
        {!repair && <CustomerPicker value={picker} onChange={setPicker} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input label="الشركة" required list="companies" value={f.deviceCompany} onChange={set('deviceCompany')} placeholder="Apple / Samsung ..." />
            <datalist id="companies">
              {COMPANIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <Input label="موديل الجهاز" required value={f.deviceModel} onChange={set('deviceModel')} placeholder="iPhone 13 Pro" />
          <Input label="IMEI" dir="ltr" inputMode="numeric" value={f.imei} onChange={set('imei')} placeholder="اختياري" />
          <Input label="التاريخ المتوقع للتسليم" type="date" value={f.expectedDate} onChange={set('expectedDate')} />
          <Textarea label="وصف العطل" required className="sm:col-span-2" value={f.issue} onChange={set('issue')} />
          <Textarea label="ملاحظات الفني" hint="داخلية — لا تظهر للزبون" className="sm:col-span-2" rows={2} value={f.techNotes} onChange={set('techNotes')} />
          <Input label="تكلفة الصيانة (د.ع)" type="number" min="0" inputMode="numeric" value={f.cost} onChange={set('cost')} />
          <Input label="المبلغ المدفوع (د.ع)" type="number" min="0" inputMode="numeric" value={f.paid} onChange={set('paid')} />
        </div>
      </form>
    </Modal>
  );
}
