'use client';

import { useState } from 'react';
import { cx } from './ui';

const compact = (v) => {
  const n = Math.abs(v);
  if (n >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(Math.round(v));
};

/** مخطط أعمدة بسيط ومتجاوب (SVG). data: [{label, value}] */
export function BarChart({ data = [], height = 200, color = '#F97316', format = compact, highlightLast = true }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length || 1;
  const gap = n > 20 ? 2 : 6;
  return (
    <div className="relative" style={{ height }}>
      <div className="absolute inset-0 flex flex-col justify-between pb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-[10px] font-semibold text-navy/35">{format((max * (3 - i)) / 3)}</span>
            <div className="h-px flex-1 border-t border-dashed border-navy/10" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-end ps-11 pb-6" style={{ gap }}>
        {data.map((d, i) => {
          const h = (d.value / max) * 100;
          const isLast = highlightLast && i === data.length - 1;
          return (
            <div
              key={i}
              className="relative flex h-full flex-1 items-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onTouchStart={() => setHover(i)}
            >
              <div
                className={cx('w-full rounded-t-md transition-all', hover === i ? 'opacity-100' : isLast ? 'opacity-100' : 'opacity-70')}
                style={{ height: `${Math.max(h, d.value > 0 ? 2 : 0)}%`, background: isLast || hover === i ? color : '#1B263B' }}
              />
              {hover === i && (
                <div className="absolute bottom-full start-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy px-2 py-1 text-[11px] font-bold text-white shadow-lg rtl:translate-x-1/2">
                  {d.tooltip || `${d.label}: ${format(d.value)}`}
                </div>
              )}
              <span className="absolute -bottom-5 inset-x-0 truncate text-center text-[10px] font-semibold text-navy/40">{d.short ?? d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** شريط توزيع أفقي. items: [{label, value, color}] */
export function SplitBar({ items = [] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-soft">
        {items.map((i) => (
          <div key={i.label} style={{ width: `${(i.value / total) * 100}%`, background: i.color }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: i.color }} />
            <span className="truncate font-semibold text-navy/60">{i.label}</span>
            <span className="ms-auto font-black">{i.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
