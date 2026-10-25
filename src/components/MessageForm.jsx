'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { MSG_TYPE } from '@/lib/labels';
import CustomerPicker from './CustomerPicker';
import { Button, Modal, Select, Textarea } from './ui';
import { useToast } from './toast';

/** إرسال رسالة من المحل إلى الزبون (تظهر في بوابته) */
export default function MessageForm({ open, onClose, customer, onSaved }) {
  const toast = useToast();
  const [picker, setPicker] = useState({ mode: 'existing' });
  const [f, setF] = useState({ type: 'GENERAL', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setF({ type: 'GENERAL', content: '' });
      setPicker(customer ? { mode: 'existing', customer } : { mode: 'existing' });
    }
  }, [open, customer]);

  async function submit(e) {
    e.preventDefault();
    const customerId = customer?.id || picker.customer?.id;
    if (!customerId) return toast.error('اختر الزبون');
    setSaving(true);
    try {
      await api('/api/messages', { method: 'POST', body: { ...f, customerId } });
      toast.success('تم إرسال الرسالة إلى بوابة الزبون');
      onSaved?.();
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
      title="رسالة إلى الزبون"
      subtitle="ستظهر الرسالة في بوابة الزبون الخاصة"
      footer={
        <>
          <Button variant="soft" onClick={onClose}>
            إلغاء
          </Button>
          <Button form="msg-form" type="submit" icon="send" loading={saving}>
            إرسال
          </Button>
        </>
      }
    >
      <form id="msg-form" onSubmit={submit} className="space-y-4">
        {!customer && <CustomerPicker value={picker} onChange={setPicker} allowNew={false} />}
        <Select
          label="نوع الرسالة"
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value })}
          options={Object.entries(MSG_TYPE).map(([value, label]) => ({ value, label }))}
        />
        <Textarea label="نص الرسالة" required rows={4} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
      </form>
    </Modal>
  );
}
