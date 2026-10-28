"use server";

import { revalidatePath } from "next/cache";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { verifySession } from "@/lib/dal";
import { orderTotalCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { parseOrderForm, type FieldErrors } from "@/lib/validation";

export type OrderFormState = { ok?: boolean; errors?: FieldErrors; formError?: boolean };

const getLang = (formData: FormData): Locale => {
  const value = String(formData.get("lang") ?? "");
  return hasLocale(value) ? value : defaultLocale;
};

// "YYYY-MM-DDTHH:mm" typed in Singapore time -> the matching UTC instant.
const sgtToDate = (value: string) => new Date(`${value}:00+08:00`);

function refresh(lang: Locale) {
  revalidatePath(`/${lang}/dashboard`);
  revalidatePath(`/${lang}/orders`);
}

// Every action re-checks the session itself: the proxy is only an optimistic redirect, and
// Server Actions can be invoked directly. verifySession redirects to login when there is none.
export async function createOrder(_prev: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const lang = getLang(formData);
  await verifySession(lang);

  const parsed = parseOrderForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const { items, orderedAt, customerName, ...rest } = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: rest.branchId }, select: { id: true } });
  if (!branch) return { errors: { branchId: "required" } };

  await prisma.order.create({
    data: {
      ...rest,
      orderedAt: sgtToDate(orderedAt),
      customerName: customerName || null,
      totalCents: orderTotalCents(items), // always recomputed here, never taken from the client
      items: { create: items },
    },
  });
  refresh(lang);
  return { ok: true };
}

export async function updateOrder(_prev: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const lang = getLang(formData);
  await verifySession(lang);

  const id = String(formData.get("id") ?? "");
  const parsed = parseOrderForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const { items, orderedAt, customerName, ...rest } = parsed.data;

  const [existing, branch] = await Promise.all([
    prisma.order.findUnique({ where: { id }, select: { id: true } }),
    prisma.branch.findUnique({ where: { id: rest.branchId }, select: { id: true } }),
  ]);
  if (!existing) return { formError: true };
  if (!branch) return { errors: { branchId: "required" } };

  // Items are replaced wholesale, in one transaction so an order never ends up without them.
  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId: id } }),
    prisma.order.update({
      where: { id },
      data: {
        ...rest,
        orderedAt: sgtToDate(orderedAt),
        customerName: customerName || null,
        totalCents: orderTotalCents(items),
        items: { create: items },
      },
    }),
  ]);
  refresh(lang);
  return { ok: true };
}

export async function deleteOrder(id: string, langValue: string): Promise<{ ok: boolean }> {
  const lang = hasLocale(langValue) ? langValue : defaultLocale;
  await verifySession(lang);

  // deleteMany so an already-deleted order is a no-op instead of an error.
  await prisma.order.deleteMany({ where: { id } });
  refresh(lang);
  return { ok: true };
}
