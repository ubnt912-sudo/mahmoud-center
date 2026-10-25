import Link from 'next/link';
import { Logo } from '@/components/icons';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-navy p-6 text-center text-white">
      <Logo className="size-16" />
      <p className="mt-6 text-6xl font-black text-brand">404</p>
      <h1 className="mt-2 text-xl font-black">الصفحة غير موجودة</h1>
      <Link href="/" className="btn btn-primary mt-6">
        العودة للرئيسية
      </Link>
    </main>
  );
}
