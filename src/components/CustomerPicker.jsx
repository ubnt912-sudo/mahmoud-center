'use client';

import { useEffect, useState } from 'react';
import { api, qs } from '@/lib/client';
import { useDebounced } from '@/hooks/useApi';
import { Icon } from './icons';
import { Avatar, Input, Spinner, cx } from './ui';

/**
 * اختيار زبون موجود بالبحث، أو إدخال زبون جديد (اسم + هاتف).
 * value: { customer?: {...}, newName?: string, newPhone?: string, mode: 'existing'|'new' }
 */
export default function CustomerPicker({ value, onChange, allowNew = true, label = 'الزبون' }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 250);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const mode = value?.mode || 'existing';

  useEffect(() => {
    if (mode !== 'existing' || value?.customer || dq.trim().length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    setLoading(true);
    api(`/api/customers${qs({ q: dq, take: 8 })}`)
      .then((d) => alive && setResults(d.customers))
      .catch(() => alive && setResults([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [dq, mode, value?.customer]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label mb-0">
          {label} <span className="text-brand">*</span>
        </span>
        {allowNew && (
          <div className="flex rounded-lg bg-soft p-0.5 text-xs font-bold">
            {[
              ['existing', 'زبون موجود'],
              ['new', 'زبون جديد'],
            ].map(([m, l]) => (
              <button
                type="button"
                key={m}
                onClick={() => onChange({ mode: m })}
                className={cx('rounded-md px-2.5 py-1 transition', mode === m ? 'bg-white text-navy shadow-sm' : 'text-navy/50')}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === 'new' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="اسم الزبون" value={value?.newName || ''} onChange={(e) => onChange({ ...value, newName: e.target.value })} required />
          <Input
            placeholder="رقم الهاتف 9647xxxxxxxxx"
            dir="ltr"
            inputMode="tel"
            className="text-left"
            value={value?.newPhone || ''}
            onChange={(e) => onChange({ ...value, newPhone: e.target.value })}
            required
          />
        </div>
      ) : value?.customer ? (
        <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
          <Avatar name={value.customer.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{value.customer.name}</p>
            <p className="text-xs text-navy/50" dir="ltr">
              {value.customer.phone}
            </p>
          </div>
          <button type="button" onClick={() => onChange({ mode: 'existing' })} className="rounded-lg px-2 py-1 text-xs font-bold text-brand-700 hover:bg-white">
            تغيير
          </button>
        </div>
      ) : (
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-navy/35" />
          <input className="input ps-9" placeholder="ابحث بالاسم أو رقم الهاتف..." value={q} onChange={(e) => setQ(e.target.value)} />
          {loading && <Spinner className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-brand" />}
          {results.length > 0 && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-xl bg-white p-1 shadow-pop ring-1 ring-navy/10">
              {results.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => {
                    onChange({ mode: 'existing', customer: c });
                    setQ('');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start hover:bg-soft"
                >
                  <Avatar name={c.name} className="size-8 text-xs" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{c.name}</p>
                    <p className="text-xs text-navy/50" dir="ltr">
                      {c.phone}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {dq.trim().length >= 2 && !loading && results.length === 0 && (
            <p className="mt-1.5 text-xs text-navy/50">
              لا يوجد زبون مطابق.{' '}
              {allowNew && (
                <button type="button" className="font-bold text-brand" onClick={() => onChange({ mode: 'new', newName: /\d/.test(dq) ? '' : dq, newPhone: /\d/.test(dq) ? dq : '' })}>
                  إضافة كزبون جديد
                </button>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** تحويل قيمة المنتقي إلى حقول الطلب للـAPI */
export function pickerToPayload(v) {
  if (v?.mode === 'new') return { customerName: v.newName, customerPhone: v.newPhone };
  if (v?.customer) return { customerId: v.customer.id };
  return {};
}

export function pickerValid(v) {
  return v?.mode === 'new' ? Boolean(v.newName?.trim() && v.newPhone?.trim()) : Boolean(v?.customer);
}
