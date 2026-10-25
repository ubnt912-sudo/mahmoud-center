import { prisma } from './prisma';
import { ApiError } from './api';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadPortalCustomer(token) {
  if (!token || !UUID.test(token)) throw new ApiError(404, 'الرابط غير صالح');
  const c = await prisma.customer.findUnique({ where: { customerToken: token }, select: { id: true, status: true, blockReason: true } });
  if (!c) throw new ApiError(404, 'الرابط غير صالح أو منتهي');
  if (c.status === 'BLOCKED') throw new ApiError(403, 'هذا الحساب موقوف، يرجى مراجعة المحل');
  return c;
}
