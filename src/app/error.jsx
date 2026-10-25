'use client';

export default function GlobalError({ error, reset }) {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center p-6 text-center">
      <p className="text-4xl">⚠️</p>
      <h1 className="mt-3 text-lg font-black">حدث خطأ غير متوقع</h1>
      <p className="mt-1 max-w-sm text-sm text-navy/55">{error?.message || 'يرجى المحاولة مرة أخرى'}</p>
      <button onClick={reset} className="btn btn-primary mt-5">
        إعادة المحاولة
      </button>
    </main>
  );
}
