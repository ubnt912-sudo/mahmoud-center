import { Suspense } from 'react';
import AdminShell from '@/components/AdminShell';

export const metadata = { title: 'لوحة التحكم' };

export default function AdminLayout({ children }) {
  return (
    <Suspense>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
