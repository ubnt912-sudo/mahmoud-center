'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Icon } from './icons';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const remove = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (type, message) => {
      const id = Math.random().toString(36).slice(2);
      setItems((xs) => [...xs.slice(-3), { id, type, message }]);
      setTimeout(() => remove(id), type === 'error' ? 6000 : 3500);
    },
    [remove]
  );
  const api = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push]
  );
  const styles = {
    success: ['bg-emerald-500', 'check'],
    error: ['bg-red-500', 'alert'],
    info: ['bg-navy', 'bell'],
  };
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3">
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-pop pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-pop ring-1 ring-navy/10"
            onClick={() => remove(t.id)}
          >
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-white ${styles[t.type][0]}`}>
              <Icon name={styles[t.type][1]} className="size-4" />
            </span>
            <p className="text-sm font-bold leading-6">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) return { success: () => {}, error: () => {}, info: () => {} };
  return ctx;
}
