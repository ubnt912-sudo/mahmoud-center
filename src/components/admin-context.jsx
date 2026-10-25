'use client';

import { createContext, useContext } from 'react';
import { can as canRole } from '@/lib/permissions';

export const AdminContext = createContext({ user: null, can: () => false, refreshBadges: () => {} });

export function useAdmin() {
  const ctx = useContext(AdminContext);
  return {
    ...ctx,
    can: (resource, action = 'read') => canRole(ctx.user?.role, resource, action),
  };
}
