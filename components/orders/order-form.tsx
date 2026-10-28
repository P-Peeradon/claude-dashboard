"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createOrder, updateOrder, type OrderFormState } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Locale } from "@/i18n/config";
import { formatMoney } from "@/i18n/format";
import type { Dictionary } from "@/i18n/get-dictionary";
import { parseMoneyToCents } from "@/lib/money";
import { ORDER_STATUSES, PAYMENT_METHODS } from "@/lib/validation";

type Row = { key: number; name: string; quantity: string; price: string };

export type OrderFormValues = {
  branchId: string;
  orderedAt: string; // YYYY-MM-DDTHH:mm, Singapore time
  status: (typeof ORDER_STATUSES)[number];
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  customerName: string;
  items: { name: string; quantity: number; price: string }[];
};

type Props = {
  lang: Locale;
  orderId?: string;
  branches: { id: string; label: string }[];
  defaults: OrderFormValues;
  labels: Pick<Dictionary, "orders" | "status" | "payment" | "errors"> & {
    common: { save: string; cancel: string };
  };
};

export function OrderForm({ lang, orderId, branches, defaults, labels }: Props) {
  const router = useRouter();
  const [state, dispatch, pending] = useActionState<OrderFormState, FormData>(
    orderId ? updateOrder : createOrder,
    {},
  );

  const [values, setValues] = useState({
    branchId: defaults.branchId,
    orderedAt: defaults.orderedAt,
    status: defaults.status,
    paymentMethod: defaults.paymentMethod,
    customerName: defaults.customerName,
  });
  const [rows, setRows] = useState<Row[]>(() =>
    (defaults.items.length ? defaults.items : [{ name: "", quantity: 1, price: "" }]).map((it, i) => ({
      key: i,
      name: it.name,
      quantity: String(it.quantity),
      price: it.price,
    })),
  );
  const [nextKey, setNextKey] = useState(rows.length);

  useEffect(() => {
    if (!state.ok) return;
    toast.success(orderId ? labels.orders.updated : labels.orders.created);
    router.push(`/${lang}/orders`);
  }, [state, orderId, lang, labels.orders.created, labels.orders.updated, router]);

  const total = rows.reduce((sum, r) => {
    const cents = parseMoneyToCents(r.price);
    const qty = Number(r.quantity);
    return cents !== null && Number.isInteger(qty) && qty > 0 ? sum + qty * cents : sum;
  }, 0);

  const error = (field: string) => {
    const key = state.errors?.[field];
    return key ? labels.errors[key] : undefined;
  };
  const setValue = <K extends keyof typeof values>(k: K, v: (typeof values)[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));
  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form
      // Submitted via a transition instead of a bare `action` so React doesn't reset the
      // controlled inputs when validation fails and the user's input is kept.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => dispatch(data));
      }}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="lang" value={lang} />
      {orderId && <input type="hidden" name="id" value={orderId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.orders.branch} error={error("branchId")} htmlFor="branchId">
          <NativeSelect
            id="branchId"
            name="branchId"
            value={values.branchId}
            onChange={(e) => setValue("branchId", e.target.value)}
            aria-invalid={Boolean(error("branchId"))}
          >
            <option value="">{labels.orders.selectBranch}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label={labels.orders.date} error={error("orderedAt")} htmlFor="orderedAt">
          <Input
            id="orderedAt"
            name="orderedAt"
            type="datetime-local"
            value={values.orderedAt}
            onChange={(e) => setValue("orderedAt", e.target.value)}
            aria-invalid={Boolean(error("orderedAt"))}
            className="h-11"
          />
        </Field>

        <Field label={labels.orders.payment} error={error("paymentMethod")} htmlFor="paymentMethod">
          <NativeSelect
            id="paymentMethod"
            name="paymentMethod"
            value={values.paymentMethod}
            onChange={(e) => setValue("paymentMethod", e.target.value as typeof values.paymentMethod)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {labels.payment[m]}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label={labels.orders.status} error={error("status")} htmlFor="status">
          <NativeSelect
            id="status"
            name="status"
            value={values.status}
            onChange={(e) => setValue("status", e.target.value as typeof values.status)}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {labels.status[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <div className="sm:col-span-2">
          <Field label={labels.orders.customerOptional} error={error("customerName")} htmlFor="customerName">
            <Input
              id="customerName"
              name="customerName"
              maxLength={80}
              value={values.customerName}
              onChange={(e) => setValue("customerName", e.target.value)}
              className="h-11"
            />
          </Field>
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">{labels.orders.items}</legend>
        {error("items") && (
          <p role="alert" className="text-sm text-destructive">
            {error("items")}
          </p>
        )}

        {rows.map((r, i) => (
          <div key={r.key} className="grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_6rem_9rem_auto] sm:items-start">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor={`name-${r.key}`} className="mb-1.5 sm:sr-only">
                {labels.orders.itemName}
              </Label>
              <Input
                id={`name-${r.key}`}
                name="itemName"
                maxLength={80}
                value={r.name}
                onChange={(e) => updateRow(r.key, { name: e.target.value })}
                aria-invalid={Boolean(error(`items.${i}.name`))}
                placeholder={labels.orders.itemName}
                className="h-11"
              />
              <FieldError message={error(`items.${i}.name`)} />
            </div>
            <div>
              <Label htmlFor={`qty-${r.key}`} className="mb-1.5 sm:sr-only">
                {labels.orders.quantity}
              </Label>
              <Input
                id={`qty-${r.key}`}
                name="itemQuantity"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={r.quantity}
                onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                aria-invalid={Boolean(error(`items.${i}.quantity`))}
                className="h-11"
              />
              <FieldError message={error(`items.${i}.quantity`)} />
            </div>
            <div>
              <Label htmlFor={`price-${r.key}`} className="mb-1.5 sm:sr-only">
                {labels.orders.unitPrice}
              </Label>
              <Input
                id={`price-${r.key}`}
                name="itemPrice"
                inputMode="decimal"
                value={r.price}
                onChange={(e) => updateRow(r.key, { price: e.target.value })}
                aria-invalid={Boolean(error(`items.${i}.unitPriceCents`))}
                placeholder={labels.orders.unitPrice}
                className="h-11"
              />
              <FieldError message={error(`items.${i}.unitPriceCents`)} />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={rows.length === 1}
              onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
              aria-label={labels.orders.removeItem}
              className="col-span-2 h-11 sm:col-span-1 sm:w-11 sm:px-0"
            >
              <Trash2 aria-hidden className="size-4" />
              <span className="sm:sr-only">{labels.orders.removeItem}</span>
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="h-11 self-start"
          onClick={() => {
            setRows((prev) => [...prev, { key: nextKey, name: "", quantity: "1", price: "" }]);
            setNextKey((k) => k + 1);
          }}
        >
          <Plus aria-hidden className="size-4" />
          {labels.orders.addItem}
        </Button>
      </fieldset>

      <div className="flex items-center justify-between border-t pt-4 text-lg font-semibold">
        <span>{labels.orders.total}</span>
        <span className="tabular-nums">{formatMoney(total, lang)}</span>
      </div>

      {state.formError && (
        <p role="alert" className="text-sm text-destructive">
          {labels.errors.generic}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className="h-11 min-w-28">
          {labels.common.save}
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => router.push(`/${lang}/orders`)}>
          {labels.common.cancel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="mt-1 text-sm text-destructive">
      {message}
    </p>
  ) : null;
}
