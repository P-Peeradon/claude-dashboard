import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const ORDERS_PAGE_SIZE = 10;

const orderRowSelect = {
  id: true,
  orderedAt: true,
  status: true,
  paymentMethod: true,
  customerName: true,
  totalCents: true,
  branch: { select: { code: true } },
} satisfies Prisma.OrderSelect;

// Latest first, one page at a time. Shared by the dashboard table and the orders list.
export async function listOrders(where: Prisma.OrderWhereInput, page: number) {
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ orderedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
      select: orderRowSelect,
    }),
  ]);
  return { orders, total, pages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)) };
}

export type OrdersFilters = {
  q?: string;
  status?: "PAID" | "PENDING" | "CANCELLED";
  branchId?: string;
};

export function listOrdersFiltered({ q, status, branchId }: OrdersFilters, page: number) {
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(branchId ? { branchId } : {}),
    ...(q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" } },
            { items: { some: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  return listOrders(where, page);
}

export function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      branchId: true,
      orderedAt: true,
      status: true,
      paymentMethod: true,
      customerName: true,
      items: {
        select: { id: true, name: true, quantity: true, unitPriceCents: true },
        orderBy: { id: "asc" },
      },
    },
  });
}
