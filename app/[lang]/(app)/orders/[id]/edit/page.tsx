import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { OrderForm } from "@/components/orders/order-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { verifySession } from "@/lib/dal";
import { toSgtInput } from "@/lib/date-range";
import { centsToInput } from "@/lib/money";
import { getBranches } from "@/lib/queries/branches";
import { getOrderById } from "@/lib/queries/orders";

export default function EditOrderPage(props: PageProps<"/[lang]/orders/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-3xl" />}>
      <EditOrderContent params={props.params} />
    </Suspense>
  );
}

async function EditOrderContent({ params }: { params: PageProps<"/[lang]/orders/[id]/edit">["params"] }) {
  const lang = await getLocale();
  const [dict, { id }] = await Promise.all([getDictionary(), params]);
  await verifySession(lang);

  const [order, branches] = await Promise.all([getOrderById(id), getBranches()]);
  if (!order) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{dict.orders.edit}</h1>
        <DeleteOrderButton
          id={order.id}
          lang={lang}
          redirectTo={`/${lang}/orders`}
          labels={{
            delete: dict.common.delete,
            cancel: dict.common.cancel,
            title: dict.orders.deleteTitle,
            description: dict.orders.deleteConfirm,
            done: dict.orders.deleted,
            error: dict.errors.generic,
          }}
        />
      </div>
      <OrderForm
        lang={lang}
        orderId={order.id}
        branches={branches.map((b) => ({
          id: b.id,
          label: (dict.branches as Record<string, string>)[b.code] ?? b.code,
        }))}
        defaults={{
          branchId: order.branchId,
          orderedAt: toSgtInput(order.orderedAt),
          status: order.status,
          paymentMethod: order.paymentMethod,
          customerName: order.customerName ?? "",
          items: order.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: centsToInput(i.unitPriceCents),
          })),
        }}
        labels={{
          orders: dict.orders,
          status: dict.status,
          payment: dict.payment,
          errors: dict.errors,
          common: { save: dict.common.save, cancel: dict.common.cancel },
        }}
      />
    </div>
  );
}
