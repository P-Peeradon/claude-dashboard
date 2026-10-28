import { Suspense } from "react";
import { OrderForm } from "@/components/orders/order-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { verifySession } from "@/lib/dal";
import { toSgtInput } from "@/lib/date-range";
import { getBranches } from "@/lib/queries/branches";

export default function NewOrderPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-3xl" />}>
      <NewOrderContent />
    </Suspense>
  );
}

async function NewOrderContent() {
  const lang = await getLocale();
  const [dict, user, branches] = await Promise.all([getDictionary(), verifySession(lang), getBranches()]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{dict.orders.new}</h1>
      <OrderForm
        lang={lang}
        branches={branches.map((b) => ({
          id: b.id,
          label: (dict.branches as Record<string, string>)[b.code] ?? b.code,
        }))}
        defaults={{
          // Preselect the staff member's home branch when they have one.
          branchId: user.branchId ?? "",
          orderedAt: toSgtInput(),
          status: "PAID",
          paymentMethod: "CASH",
          customerName: "",
          items: [],
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
