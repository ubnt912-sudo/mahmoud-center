import { route, ok } from '@/lib/api';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const GET = route(async (req, { user }) => ok({ user, permissions: PERMISSIONS[user.role] || {} }));
