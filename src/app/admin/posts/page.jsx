'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import { CATEGORY } from '@/lib/labels';
import PostCard, { PostMedia } from '@/components/PostCard';
import ImageUpload from '@/components/ImageUpload';
import { useToast } from '@/components/toast';
import { Button, ConfirmModal, Empty, ErrorBox, IconButton, Input, Loading, Modal, PageHeader, Select, Tabs, Textarea, Toggle, cx } from '@/components/ui';

export default function PostsPage() {
  const { can } = useAdmin();
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/api/posts');
  const [form, setForm] = useState({ open: false, post: null });
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const writable = can('posts', 'write');

  async function toggle(p, field) {
    try {
      await api(`/api/posts/${p.id}`, { method: 'PATCH', body: { [field]: !p[field] } });
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="الإعلانات والعروض"
        subtitle="تظهر لكل الزبائن في بواباتهم فوراً"
        icon="megaphone"
        actions={writable && <Button icon="plus" onClick={() => setForm({ open: true, post: null })}>إعلان جديد</Button>}
      />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? (
        <Loading />
      ) : !data?.posts.length ? (
        <div className="card">
          <Empty icon="megaphone" title="لا توجد إعلانات بعد" text="انشر صورة عرض أو فيديو جهاز جديد، وسيظهر لكل الزبائن." action={writable && <Button icon="plus" onClick={() => setForm({ open: true, post: null })}>أول إعلان</Button>} />
        </div>
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              actions={
                writable && (
                  <>
                    <Button variant="soft" className="px-3 py-1.5 text-xs" icon="edit" onClick={() => setForm({ open: true, post: p })}>
                      تعديل
                    </Button>
                    <Button variant="ghost" className="px-3 py-1.5 text-xs" icon="pin" onClick={() => toggle(p, 'isPinned')}>
                      {p.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                    </Button>
                    <Button variant="ghost" className="px-3 py-1.5 text-xs" icon={p.isActive ? 'eye' : 'check'} onClick={() => toggle(p, 'isActive')}>
                      {p.isActive ? 'إخفاء' : 'إظهار'}
                    </Button>
                    {can('posts', 'delete') && <IconButton icon="trash" tone="danger" label="حذف" onClick={() => setDel(p)} />}
                  </>
                )
              }
            />
          ))}
        </div>
      )}

      <PostForm {...form} onClose={() => setForm({ open: false, post: null })} onSaved={reload} />
      <ConfirmModal
        open={Boolean(del)}
        onClose={() => setDel(null)}
        danger
        loading={busy}
        title="حذف الإعلان"
        text={`حذف "${del?.title}" نهائياً؟ يمكنك إخفاؤه بدلاً من حذفه.`}
        confirmText="حذف"
        onConfirm={async () => {
          setBusy(true);
          try {
            await api(`/api/posts/${del.id}`, { method: 'DELETE' });
            toast.success('تم حذف الإعلان');
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

function PostForm({ open, post, onClose, onSaved }) {
  const toast = useToast();
  const empty = { title: '', body: '', mediaType: 'IMAGE', mediaUrl: '', linkUrl: '', category: '', isPinned: false, isActive: true };
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setF(post ? { ...empty, ...Object.fromEntries(Object.entries(post).map(([k, v]) => [k, v ?? ''])) } : empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, post]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const body = {
      title: f.title,
      body: f.body || null,
      mediaType: f.mediaType,
      mediaUrl: f.mediaType === 'NONE' ? null : f.mediaUrl || null,
      linkUrl: f.linkUrl || null,
      category: f.category || null,
      isPinned: f.isPinned,
      isActive: f.isActive,
    };
    try {
      if (post) await api(`/api/posts/${post.id}`, { method: 'PATCH', body });
      else await api('/api/posts', { method: 'POST', body });
      toast.success(post ? 'تم حفظ الإعلان' : 'تم نشر الإعلان لكل الزبائن 📣');
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
      size="lg"
      title={post ? 'تعديل الإعلان' : 'إعلان جديد'}
      subtitle="يظهر في بوابة كل زبون"
      footer={
        <>
          <Button variant="soft" onClick={onClose}>
            إلغاء
          </Button>
          <Button form="post-form" type="submit" icon="megaphone" loading={saving}>
            {post ? 'حفظ' : 'نشر'}
          </Button>
        </>
      }
    >
      <form id="post-form" onSubmit={submit} className="space-y-4">
        <Input label="العنوان" required value={f.title} onChange={set('title')} placeholder="مثال: وصل iPhone 16 Pro — بأفضل سعر" />
        <Textarea label="النص" rows={3} value={f.body} onChange={set('body')} placeholder="تفاصيل العرض، السعر، المدة..." />

        <div>
          <p className="label">نوع الوسائط</p>
          <Tabs
            value={f.mediaType}
            onChange={(v) => setF({ ...f, mediaType: v, mediaUrl: v === f.mediaType ? f.mediaUrl : '' })}
            tabs={[
              { value: 'IMAGE', label: '🖼️ صورة' },
              { value: 'VIDEO', label: '🎬 فيديو' },
              { value: 'NONE', label: 'نص فقط' },
            ]}
          />
        </div>

        {f.mediaType === 'IMAGE' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <ImageUpload label="رفع صورة من الجهاز" onUploaded={(url) => setF((x) => ({ ...x, mediaUrl: url }))} />
              <span className="text-xs text-navy/45">أو الصق رابط صورة:</span>
            </div>
            <input className="input" dir="ltr" placeholder="https://..." value={f.mediaUrl} onChange={set('mediaUrl')} />
          </div>
        )}
        {f.mediaType === 'VIDEO' && (
          <Input
            label="رابط الفيديو"
            dir="ltr"
            value={f.mediaUrl}
            onChange={set('mediaUrl')}
            placeholder="https://youtube.com/... أو رابط mp4"
            hint="يوتيوب (عادي أو Shorts) يعمل داخل البوابة مباشرة. روابط تيك توك/إنستغرام تظهر كزر مشاهدة."
          />
        )}
        {f.mediaType !== 'NONE' && f.mediaUrl && (
          <div className="overflow-hidden rounded-2xl ring-1 ring-navy/10">
            <PostMedia post={{ ...f, title: f.title || 'معاينة' }} className="max-h-72" />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="القسم (اختياري)"
            value={f.category}
            onChange={set('category')}
            placeholder="عام"
            options={Object.entries(CATEGORY).map(([value, label]) => ({ value, label }))}
          />
          <Input label="رابط إضافي (اختياري)" dir="ltr" value={f.linkUrl} onChange={set('linkUrl')} placeholder="https://..." />
        </div>
        <div className={cx('flex flex-wrap gap-6')}>
          <Toggle checked={f.isPinned} onChange={(v) => setF({ ...f, isPinned: v })} label="تثبيت بالأعلى 📌" />
          <Toggle checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} label="ظاهر للزبائن" />
        </div>
      </form>
    </Modal>
  );
}
