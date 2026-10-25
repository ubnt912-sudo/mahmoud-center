import { prisma } from '@/lib/prisma';
import { route, ok, searchParams } from '@/lib/api';
import { can } from '@/lib/permissions';
import { refreshSubscriptionStatuses } from '@/lib/domain';

export const dynamic = 'force-dynamic';

const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const monthKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
};

// GET /api/stats?scope=dashboard|full — البيانات تُفلتر حسب صلاحيات الدور
export const GET = route(
  async (req, { user }) => {
    const scope = searchParams(req).get('scope') === 'full' && can(user.role, 'stats', 'read') ? 'full' : 'dashboard';
    const r = user.role;
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const start14 = new Date(startToday.getTime() - 13 * 86400000);
    const out = { role: r };
    const jobs = [];

    if (can(r, 'customers', 'read')) {
      jobs.push(
        Promise.all([
          prisma.customer.count(),
          prisma.customer.count({ where: { createdAt: { gte: startMonth } } }),
        ]).then(([total, newThisMonth]) => (out.customers = { total, newThisMonth }))
      );
    }

    if (can(r, 'sales', 'read')) {
      jobs.push(
        prisma.order
          .findMany({
            where: { status: { not: 'CANCELLED' }, createdAt: { gte: start14 } },
            select: { totalAmount: true, createdAt: true },
          })
          .then((orders) => {
            const series = [];
            for (let i = 0; i < 14; i++) {
              const d = new Date(start14.getTime() + i * 86400000);
              series.push({ date: dayKey(d), total: 0, count: 0 });
            }
            const idx = Object.fromEntries(series.map((s, i) => [s.date, i]));
            for (const o of orders) {
              const i = idx[dayKey(o.createdAt)];
              if (i !== undefined) {
                series[i].total += o.totalAmount;
                series[i].count += 1;
              }
            }
            const today = series[series.length - 1];
            out.sales = { today: today.total, todayCount: today.count, series };
          }),
        prisma.order
          .aggregate({ where: { status: { not: 'CANCELLED' }, createdAt: { gte: startMonth } }, _sum: { totalAmount: true }, _count: true })
          .then((a) => (out.salesMonth = { total: a._sum.totalAmount || 0, count: a._count })),
        prisma.invoice
          .aggregate({ where: { status: { in: ['UNPAID', 'PARTIAL'] } }, _sum: { total: true, paid: true }, _count: true })
          .then((a) => (out.receivables = { amount: (a._sum.total || 0) - (a._sum.paid || 0), count: a._count }))
      );
    }

    if (can(r, 'repairs', 'read')) {
      jobs.push(
        prisma.repair.groupBy({ by: ['status'], _count: { _all: true } }).then((g) => {
          const by = Object.fromEntries(g.map((x) => [x.status, x._count._all]));
          out.repairs = {
            byStatus: by,
            active: ['RECEIVED', 'INSPECTING', 'WAITING_APPROVAL', 'REPAIRING', 'READY'].reduce((s, k) => s + (by[k] || 0), 0),
            ready: by.READY || 0,
            waiting: by.WAITING_APPROVAL || 0,
          };
        }),
        prisma.repair
          .findMany({
            where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } },
            orderBy: { createdAt: 'desc' },
            take: 6,
            include: { customer: { select: { name: true, phone: true } } },
          })
          .then((x) => (out.recentRepairs = x)),
        prisma.repair
          .count({ where: { status: { notIn: ['DELIVERED', 'CANCELLED', 'READY'] }, expectedDate: { lt: startToday } } })
          .then((n) => (out.overdueRepairs = n))
      );
    }

    if (can(r, 'subscriptions', 'read')) {
      jobs.push(
        refreshSubscriptionStatuses().then(() =>
          Promise.all([
            prisma.internetSubscription.groupBy({ by: ['status'], _count: { _all: true } }),
            prisma.internetSubscription.findMany({
              where: { status: { in: ['EXPIRING_SOON', 'EXPIRED'] } },
              orderBy: { endDate: 'asc' },
              take: 6,
              include: { customer: { select: { name: true, phone: true } } },
            }),
          ]).then(([g, list]) => {
            out.subscriptions = { byStatus: Object.fromEntries(g.map((x) => [x.status, x._count._all])) };
            out.expiringSubs = list;
          })
        )
      );
    }

    if (can(r, 'inventory', 'read')) {
      jobs.push(
        prisma.product
          .findMany({ where: { isActive: true }, select: { id: true, name: true, sku: true, stock: true, minStock: true } })
          .then((ps) => {
            const low = ps.filter((p) => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock);
            out.lowStock = { count: low.length, items: low.slice(0, 6) };
          })
      );
    }

    if (can(r, 'messages', 'read')) {
      jobs.push(prisma.message.count({ where: { isRead: false, sender: 'CUSTOMER' } }).then((n) => (out.unreadMessages = n)));
    }

    if (can(r, 'feedback', 'read')) {
      jobs.push(
        prisma.feedback.groupBy({ by: ['rating'], _count: { _all: true } }).then((g) => {
          const c = { EXCELLENT: 0, NEUTRAL: 0, POOR: 0 };
          g.forEach((x) => (c[x.rating] = x._count._all));
          out.feedback = c;
        })
      );
    }

    await Promise.all(jobs);

    if (scope === 'full') {
      const start12 = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const [items, repairsPaid, subsPaid, invoicesAgg, staff] = await Promise.all([
        prisma.orderItem.findMany({
          where: { order: { status: { not: 'CANCELLED' }, createdAt: { gte: start12 } } },
          select: {
            quantity: true,
            price: true,
            costPrice: true,
            name: true,
            productId: true,
            product: { select: { category: true } },
            order: { select: { createdAt: true, discount: true, id: true } },
          },
        }),
        prisma.repair.findMany({ where: { createdAt: { gte: start12 }, status: { not: 'CANCELLED' } }, select: { paid: true, cost: true, createdAt: true } }),
        prisma.internetSubscription.findMany({ where: { startDate: { gte: start12 } }, select: { paid: true, startDate: true, type: true } }),
        prisma.order.findMany({ where: { status: { not: 'CANCELLED' }, createdAt: { gte: start12 } }, select: { id: true, discount: true, createdById: true, totalAmount: true } }),
        prisma.user.findMany({ select: { id: true, name: true } }),
      ]);

      const months = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        months.push({ month: monthKey(d), sales: 0, profit: 0, repairs: 0, internet: 0 });
      }
      const mi = Object.fromEntries(months.map((m, i) => [m.month, i]));
      const products = new Map();
      const categories = {};
      for (const it of items) {
        const k = mi[monthKey(it.order.createdAt)];
        const line = it.price * it.quantity;
        if (k !== undefined) {
          months[k].sales += line;
          months[k].profit += (it.price - it.costPrice) * it.quantity;
        }
        const p = products.get(it.productId) || { name: it.name, qty: 0, revenue: 0 };
        p.qty += it.quantity;
        p.revenue += line;
        products.set(it.productId, p);
        const cat = it.product?.category || 'OTHER';
        categories[cat] = (categories[cat] || 0) + line;
      }
      // خصم الخصومات من المبيعات والربح
      const discountByOrder = new Map(invoicesAgg.map((o) => [o.id, o.discount]));
      const seen = new Set();
      for (const it of items) {
        if (seen.has(it.order.id)) continue;
        seen.add(it.order.id);
        const k = mi[monthKey(it.order.createdAt)];
        const disc = discountByOrder.get(it.order.id) || 0;
        if (k !== undefined) {
          months[k].sales -= disc;
          months[k].profit -= disc;
        }
      }
      for (const rp of repairsPaid) {
        const k = mi[monthKey(rp.createdAt)];
        if (k !== undefined) months[k].repairs += rp.paid;
      }
      const ispTypes = { FTTH: 0, WIRELESS: 0 };
      for (const s of subsPaid) {
        const k = mi[monthKey(s.startDate)];
        if (k !== undefined) months[k].internet += s.paid;
        ispTypes[s.type] += 1;
      }
      const names = new Map(staff.map((u) => [u.id, u.name]));
      const byStaff = {};
      for (const o of invoicesAgg) {
        const n = names.get(o.createdById) || 'غير معروف';
        byStaff[n] = byStaff[n] || { name: n, total: 0, count: 0 };
        byStaff[n].total += o.totalAmount;
        byStaff[n].count += 1;
      }
      out.full = {
        months,
        topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
        categories,
        ispTypes,
        staff: Object.values(byStaff).sort((a, b) => b.total - a.total),
        totals: months.reduce(
          (t, m) => ({ sales: t.sales + m.sales, profit: t.profit + m.profit, repairs: t.repairs + m.repairs, internet: t.internet + m.internet }),
          { sales: 0, profit: 0, repairs: 0, internet: 0 }
        ),
      };
    }

    return ok({ stats: out, scope });
  },
  { permission: ['dashboard', 'read'] }
);
