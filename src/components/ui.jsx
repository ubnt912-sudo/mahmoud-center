'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

export const cx = (...c) => c.filter(Boolean).join(' ');

// ───────── أزرار وحقول

export function Button({ variant = 'primary', icon, loading, className, children, ...props }) {
  return (
    <button className={cx('btn', `btn-${variant}`, className)} disabled={loading || props.disabled} {...props}>
      {loading ? <Spinner className="size-4" /> : icon ? <Icon name={icon} className="size-4" /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, className, tone = 'ghost', ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cx(
        'inline-flex size-9 items-center justify-center rounded-xl transition active:scale-95',
        tone === 'ghost' && 'text-navy/60 hover:bg-navy/5 hover:text-navy',
        tone === 'danger' && 'text-red-500 hover:bg-red-50',
        tone === 'brand' && 'text-brand hover:bg-brand-50',
        className
      )}
      {...props}
    >
      <Icon name={icon} className="size-[18px]" />
    </button>
  );
}

export function Field({ label, hint, error, required, className, children }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="label">
          {label}
          {required && <span className="ms-0.5 text-brand">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-navy/45">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ label, hint, required, className, ...props }) {
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      <input className="input" required={required} {...props} />
    </Field>
  );
}

export function Textarea({ label, hint, required, className, rows = 3, ...props }) {
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      <textarea className="input resize-y" rows={rows} required={required} {...props} />
    </Field>
  );
}

export function Select({ label, hint, required, className, options = [], placeholder, ...props }) {
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      <select className="input appearance-none bg-[length:16px] pe-3" required={required} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 select-none">
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onChange(!checked)}
        onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 rounded-full transition', checked ? 'bg-brand' : 'bg-navy/15')}
      >
        <span
          className={cx(
            'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
            checked ? 'start-[1.375rem]' : 'start-0.5'
          )}
        />
      </span>
      {label && <span className="text-sm font-semibold">{label}</span>}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = 'بحث...', className, autoFocus }) {
  return (
    <div className={cx('relative', className)}>
      <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-navy/35" />
      <input
        className="input ps-9"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
      />
    </div>
  );
}

// ───────── عرض

export function Card({ className, children, ...props }) {
  return (
    <div className={cx('card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-navy/5 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
            <Icon name={icon} className="size-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-extrabold">{title}</h3>
          {subtitle && <p className="truncate text-xs text-navy/50">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  orange: 'bg-brand-50 text-brand-700 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  navy: 'bg-navy-100 text-navy ring-navy/10',
};

export function Badge({ tone = 'slate', children, className, dot }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset',
        TONES[tone] || TONES.slate,
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ map, value }) {
  const s = map[value] || { label: value, tone: 'slate' };
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function StatCard({ label, value, icon, tone = 'brand', hint, href, onClick }) {
  const toneCls = {
    brand: 'bg-brand-50 text-brand',
    navy: 'bg-navy-100 text-navy',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
  }[tone];
  const Tag = href ? 'a' : onClick ? 'button' : 'div';
  return (
    <Tag
      href={href}
      onClick={onClick}
      className={cx('card group flex items-center gap-4 p-4 text-start sm:p-5', (href || onClick) && 'transition hover:-translate-y-0.5 hover:shadow-pop')}
    >
      <span className={cx('flex size-12 shrink-0 items-center justify-center rounded-2xl', toneCls)}>
        <Icon name={icon} className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-navy/50">{label}</p>
        <p className="truncate text-lg font-black tracking-tight sm:text-xl 2xl:text-2xl" title={typeof value === 'string' ? value : undefined}>
          {value}
        </p>
        {hint && <p className="truncate text-xs text-navy/45">{hint}</p>}
      </div>
    </Tag>
  );
}

export function PageHeader({ title, subtitle, actions, icon }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="hidden size-11 items-center justify-center rounded-2xl bg-navy text-beige shadow-sm sm:flex">
            <Icon name={icon} className="size-5" />
          </span>
        )}
        <div>
          <h1 className="text-xl font-black sm:text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-navy/50">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ icon = 'box', title = 'لا توجد بيانات', text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-beige-50 text-brand ring-1 ring-beige">
        <Icon name={icon} className="size-7" />
      </span>
      <p className="font-extrabold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-navy/50">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className = 'size-6' }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Loading({ text = 'جاري التحميل...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-navy/50">
      <Spinner className="size-5 text-brand" />
      <span className="text-sm font-semibold">{text}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
      <span className="flex items-center gap-2">
        <Icon name="alert" className="size-4" />
        {error}
      </span>
      {onRetry && (
        <button className="font-bold underline" onClick={onRetry}>
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-card ring-1 ring-navy/5', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            'flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition',
            value === t.value ? 'bg-navy text-white shadow-sm' : 'text-navy/60 hover:bg-navy/5 hover:text-navy'
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cx('rounded-full px-1.5 text-[11px]', value === t.value ? 'bg-white/20' : 'bg-navy/5')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Pager({ page, take, total, onPage }) {
  const pages = Math.max(1, Math.ceil((total || 0) / take));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-navy/50">
        صفحة {page} من {pages} — {total} سجل
      </span>
      <div className="flex gap-1">
        <Button variant="soft" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          السابق
        </Button>
        <Button variant="soft" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          التالي
        </Button>
      </div>
    </div>
  );
}

// ───────── نافذة منبثقة

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="animate-fade absolute inset-0 bg-navy-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        className={cx(
          'animate-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop sm:rounded-3xl',
          width
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-navy/5 px-5 py-4">
          <div>
            <h2 className="text-lg font-black">{title}</h2>
            {subtitle && <p className="text-sm text-navy/50">{subtitle}</p>}
          </div>
          <IconButton icon="x" label="إغلاق" onClick={onClose} />
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="pb-safe flex flex-wrap justify-end gap-2 border-t border-navy/5 bg-soft/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title = 'تأكيد', text, confirmText = 'تأكيد', danger, loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="soft" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-7 text-navy/70">{text}</p>
    </Modal>
  );
}

// ───────── أدوات صغيرة

export function CopyButton({ text, label = 'نسخ', onCopied }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="soft"
      icon={done ? 'check' : 'copy'}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const t = document.createElement('textarea');
          t.value = text;
          document.body.appendChild(t);
          t.select();
          document.execCommand('copy');
          t.remove();
        }
        setDone(true);
        onCopied?.();
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? 'تم النسخ' : label}
    </Button>
  );
}

export function Money({ value, className }) {
  const v = Math.round(Number(value) || 0).toLocaleString('en-US');
  return (
    <span className={cx('whitespace-nowrap font-bold tabular-nums', className)}>
      {v} <span className="text-[0.8em] font-semibold text-navy/45">د.ع</span>
    </span>
  );
}

export function Avatar({ name = '', className }) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (
    <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-xl bg-beige text-sm font-black text-navy', className)}>
      {letters || '؟'}
    </span>
  );
}
