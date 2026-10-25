'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/client';
import { Button } from '@/components/ui';
import { Icon, Logo } from '@/components/icons';

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/api/auth/login', { method: 'POST', body: form });
      const next = sp.get('next');
      router.replace(next && next.startsWith('/admin') ? next : '/admin');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-navy px-4 py-10">
      <div className="pointer-events-none absolute -top-40 -start-40 size-[30rem] rounded-full bg-brand/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -end-32 size-[28rem] rounded-full bg-beige/10 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[.06]"
        style={{ backgroundImage: 'radial-gradient(#F5E6D3 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      />

      <div className="animate-pop relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <Logo className="size-16 drop-shadow-xl" />
          <h1 className="mt-4 text-3xl font-black">محمود سنتر</h1>
          <p className="mt-1 text-sm text-beige/70">لوحة تحكم الموظفين</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-pop sm:p-8">
          <h2 className="text-lg font-black">تسجيل الدخول</h2>
          <p className="mb-6 text-sm text-navy/50">أدخل بريدك وكلمة المرور للمتابعة</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
              <Icon name="alert" className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <label className="label" htmlFor="email">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            type="email"
            dir="ltr"
            autoComplete="username"
            className="input mb-4 text-left"
            placeholder="name@mahmoudcenter.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <label className="label" htmlFor="password">
            كلمة المرور
          </label>
          <div className="relative mb-6">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              dir="ltr"
              autoComplete="current-password"
              className="input pe-3 ps-11 text-left"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute start-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-navy/40 hover:bg-navy/5"
              aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              <Icon name="eye" className="size-4" />
            </button>
          </div>

          <Button type="submit" loading={loading} className="w-full py-3 text-base">
            دخول
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-beige/50">© {new Date().getFullYear()} محمود سنتر — جميع الحقوق محفوظة</p>
      </div>
    </main>
  );
}
