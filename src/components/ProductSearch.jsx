'use client';

import { useEffect, useState } from 'react';
import { api, qs } from '@/lib/client';
import { useDebounced } from '@/hooks/useApi';
import { Icon } from './icons';
import { Spinner } from './ui';

/** بحث عن منتج واختياره */
export default function ProductSearch({ onPick, placeholder = 'ابحث عن منتج بالاسم أو SKU أو الباركود...' }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 200);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dq.trim().length < 1) return setItems([]);
    let alive = true;
    setLoading(true);
    api(`/api/products${qs({ q: dq, take: 8 })}`)
      .then((d) => alive && setItems(d.products))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [dq]);

  return (
    <div className="relative">
      <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-navy/35" />
      <input className="input ps-9" value={q} placeholder={placeholder} onChange={(e) => setQ(e.target.value)} />
      {loading && <Spinner className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-brand" />}
      {items.length > 0 && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-xl bg-white p-1 shadow-pop ring-1 ring-navy/10">
          {items.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => {
                onPick(p);
                setQ('');
                setItems([]);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start hover:bg-soft"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{p.name}</span>
                <span className="block text-xs text-navy/45" dir="ltr" style={{ textAlign: 'right' }}>
                  {p.sku}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-navy/50">المخزون {p.stock}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
