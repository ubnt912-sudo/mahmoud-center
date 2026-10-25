'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import { fmtDateTime } from '@/lib/format';
import { PERMISSIONS, ROLE_LABELS } from '@/lib/permissions';
import { useToast } from '@/components/toast';
import { Avatar, Badge, Button, Card, CardHeader, ConfirmModal, ErrorBox, IconButton, Input, Loading, Modal, PageHeader, Select, Toggle } from '@/components/ui';

const RESOURCE_LABELS = {
  dashboard: 'الرئيسية',
  customers: 'الزبائن',
  repairs: 'الصيانة',
  products: 'المنتجات',
  inventory: 'المخزون',
  sales: 'المبيعات',
  invoices: 'الفواتير',
  subscriptions: 'الإنترنت',
  messages: 'الرسائل',
  feedback: 'التقييمات',
  users: 'المستخدمون',
  stats: 'الإحصائيات',
};
const ROLE_TONES = { ADMIN: 'orange', SALES: 'green', REPAIR: 'blue', INTERNET_STAFF: 'navy' };

export default function UsersPage() {
  const { user: me } = useAdmin();
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/api/users');
  const [form, setForm] = useState({ open: false, user: null });
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader
        title="المستخدمون والصلاحيات"
        subtitle="حسابات الموظفين وأدوارهم"
        icon="shield"
        actions={<Button icon="plus" onClick={() => setForm({ open: true, user: null })}>موظف جديد</Button>}
      />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? (
        <Loading />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data?.users.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={u.name} className="size-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">
                    {u.name} {u.id === me.id && <span className="text-xs text-navy/40">(أنت)</span>}
                  </p>
                  <p className="truncate text-xs text-navy/50" dir="ltr" style={{ textAlign: 'right' }}>
                    {u.email}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    {!u.isActive && <Badge tone="red">موقوف</Badge>}
                  </div>
                  <p className="mt-2 text-[11px] text-navy/40">آخر دخول: {u.lastLogin ? fmtDateTime(u.lastLogin) : 'لم يسجل الدخول بعد'}</p>
                </div>
                <div className="-me-2 -mt-1 flex">
                  <IconButton icon="edit" label="تعديل" onClick={() => setForm({ open: true, user: u })} />
                  {u.id !== me.id && <IconButton icon="trash" tone="danger" label="حذف" onClick={() => setDel(u)} />}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader title="مصفوفة الصلاحيات" icon="key" subtitle="✓✓ = مشاهدة وتعديل • ✓ = مشاهدة فقط" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>القسم</th>
                {Object.keys(PERMISSIONS).map((r) => (
                  <th key={r}>{ROLE_LABELS[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(RESOURCE_LABELS).map(([res, label]) => (
                <tr key={res}>
                  <td className="font-bold">{label}</td>
                  {Object.keys(PERMISSIONS).map((r) => {
                    const p = PERMISSIONS[r][res] || [];
                    return (
                      <td key={r} className={p.includes('write') ? 'font-black text-emerald-600' : p.includes('read') ? 'text-sky-600' : 'text-navy/20'}>
                        {p.includes('delete') ? '✓✓✓' : p.includes('write') ? '✓✓' : p.includes('read') ? '✓' : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <UserForm {...form} onClose={() => setForm({ open: false, user: null })} onSaved={reload} />
      <ConfirmModal
        open={Boolean(del)}
        onClose={() => setDel(null)}
        danger
        loading={busy}
        title="حذف الموظف"
        text={`حذف حساب "${del?.name}" نهائياً؟ يمكنك إيقاف الحساب بدلاً من حذفه.`}
        confirmText="حذف"
        onConfirm={async () => {
          setBusy(true);
          try {
            await api(`/api/users/${del.id}`, { method: 'DELETE' });
            toast.success('تم حذف الموظف');
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

function UserForm({ open, user, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setF(user ? { name: user.name, email: user.email, phone: user.phone || '', role: user.role, isActive: user.isActive, password: '' } : { name: '', email: '', phone: '', role: 'SALES', isActive: true, password: '' });
  }, [open, user]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...f, phone: f.phone || null };
      if (user) await api(`/api/users/${user.id}`, { method: 'PATCH', body });
      else await api('/api/users', { method: 'POST', body });
      toast.success(user ? 'تم حفظ التعديلات' : 'تم إنشاء حساب الموظف');
      onSaved();
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
      title={user ? 'تعديل الموظف' : 'موظف جديد'}
      subtitle={user?.email}
      footer={
        <>
          <Button variant="soft" onClick={onClose}>
            إلغاء
          </Button>
          <Button form="user-form" type="submit" icon="check" loading={saving}>
            حفظ
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input label="الاسم" required value={f.name || ''} onChange={set('name')} />
        <Input label="الهاتف" dir="ltr" value={f.phone || ''} onChange={set('phone')} />
        <Input label="البريد الإلكتروني" required type="email" dir="ltr" className="sm:col-span-2" value={f.email || ''} onChange={set('email')} />
        <Select
          label="الدور"
          required
          value={f.role || 'SALES'}
          onChange={set('role')}
          options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Input
          label={user ? 'كلمة مرور جديدة' : 'كلمة المرور'}
          type="password"
          dir="ltr"
          required={!user}
          minLength={8}
          autoComplete="new-password"
          hint={user ? 'اتركها فارغة للإبقاء على الحالية' : '8 أحرف على الأقل'}
          value={f.password || ''}
          onChange={set('password')}
        />
        <div className="sm:col-span-2">
          <Toggle checked={Boolean(f.isActive)} onChange={(v) => setF({ ...f, isActive: v })} label="الحساب فعّال" />
        </div>
      </form>
    </Modal>
  );
}
