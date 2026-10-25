'use client';

import { useRef, useState } from 'react';
import { Icon } from './icons';
import { Spinner, cx } from './ui';
import { useToast } from './toast';

/** ضغط الصورة في المتصفح قبل الرفع (أقصى بعد 1600px، WEBP/JPEG) */
async function compress(file, max = 1600, quality = 0.82) {
  if (file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
  if (!blob) return file;
  return new File([blob], 'image.webp', { type: 'image/webp' });
}

export async function uploadImage(file) {
  const small = await compress(file);
  const fd = new FormData();
  fd.append('file', small);
  const res = await fetch('/api/media', { method: 'POST', body: fd, credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'فشل رفع الصورة');
  return data.url;
}

/** زر رفع صورة (أو عدة صور) من الجهاز أو الكاميرا */
export default function ImageUpload({ onUploaded, multiple = false, label = 'رفع صورة', className }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function onChange(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        if (!f.type.startsWith('image/')) throw new Error('اختر ملف صورة');
        const url = await uploadImage(f);
        onUploaded(url);
      }
      toast.success(files.length > 1 ? `تم رفع ${files.length} صور` : 'تم رفع الصورة');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} hidden onChange={onChange} />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className={cx('btn btn-soft border border-dashed border-navy/20', className)}
      >
        {busy ? <Spinner className="size-4" /> : <Icon name="upload" className="size-4" />}
        {busy ? 'جاري الرفع...' : label}
      </button>
    </>
  );
}
