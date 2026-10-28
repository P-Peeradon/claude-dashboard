import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { TIME_ZONE } from "@/i18n/config";

export type Filters = { from: Date; to: Date; branchId?: string };

export const ORDERS_PAGE_SIZE = 10;

// Sales exclude cancelled orders; the order table still lists them with a status badge.
const salesWhere = ({ from, to, branchId }: Filters): Prisma.OrderWhereInput => ({
  orderedAt: { gte: from, lt: to },
  status: { not: "CANCELLED" },
  ...(branchId ? { branchId } : {}),
});

export async function getKpis(filters: Filters) {
  const agg = await prisma.order.aggregate({
    where: salesWhere(filters),
    _sum: { totalCents: true },
    _count: true,
  });
  const totalCents = agg._sum.totalCents ?? 0;
  const orderCount = agg._count;
  return {
    totalCents,
    orderCount,
    avgOrderCents: orderCount > 0 ? Math.round(totalCents / orderCount) : 0,
  };
}

// Grouped by Singapore calendar day. "orderedAt" is a timestamp without time zone holding UTC,
// so tag it as UTC first, then convert to Singapore time.
export async function getDailySales(filters: Filters, days: string[]) {
  const branch = filters.branchId ? Prisma.sql`AND "branchId" = ${filters.branchId}` : Prisma.empty;
  const rows = await prisma.$queryRaw<{ day: string; totalCents: number }[]>`
    SELECT to_char(("orderedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TIME_ZONE}, 'YYYY-MM-DD') AS day,
           SUM("totalCents")::int AS "totalCents"
    FROM "Order"
    WHERE status <> 'CANCELLED'
      AND "orderedAt" >= ${filters.from} AND "orderedAt" < ${filters.to}
      ${branch}
    GROUP BY 1
    ORDER BY 1`;
  const byDay = new Map(rows.map((r) => [r.day, r.totalCents]));
  return days.map((day) => ({ day, totalCents: byDay.get(day) ?? 0 }));
}

export async function getSalesByPayment(filters: Filters) {
  const rows = await prisma.order.groupBy({
    by: ["paymentMethod"],
    where: salesWhere(filters),
    _sum: { totalCents: true },
  });
  return rows
    .map((r) => ({ key: r.paymentMethod, totalCents: r._sum.totalCents ?? 0 }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export async function getSalesByBranch(filters: Omit<Filters, "branchId">) {
  const [rows, branches] = await Promise.all([
    prisma.order.groupBy({ by: ["branchId"], where: salesWhere(filters), _sum: { totalCents: true } }),
    prisma.branch.findMany({ select: { id: true, code: true } }),
  ]);
  const totals = new Map(rows.map((r) => [r.branchId, r._sum.totalCents ?? 0]));
  return branches
    .map((b) => ({ key: b.code, totalCents: totals.get(b.id) ?? 0 }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export async function getOrdersPage(filters: Filters, page: number) {
  const where: Prisma.OrderWhereInput = {
    orderedAt: { gte: filters.from, lt: filters.to },
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
  };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ orderedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
      select: {
        id: true,
        orderedAt: true,
        status: true,
        paymentMethod: true,
        customerName: true,
        totalCents: true,
        branch: { select: { code: true } },
      },
    }),
  ]);
  return { orders, total, pages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)) };
}
