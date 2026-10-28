import { z } from "zod";
import { parseMoneyToCents } from "./money";

// Error keys map to dictionary entries under `errors.*`, so validation messages are translated
// on the client rather than baked into the action's response.
export type ErrorKey = "required" | "invalidNumber" | "minItems";
export type FieldErrors = Record<string, ErrorKey>;

export const ORDER_STATUSES = ["PAID", "PENDING", "CANCELLED"] as const;
export const PAYMENT_METHODS = ["CASH", "CARD", "PAYNOW"] as const;

const itemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1).max(999),
  unitPriceCents: z.number().int().min(0).max(1_000_000),
});

const orderSchema = z.object({
  branchId: z.string().min(1),
  orderedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  customerName: z.string().trim().max(80),
  items: z.array(itemSchema).min(1).max(50),
});

export type OrderInput = z.infer<typeof orderSchema>;

export function parseOrderForm(formData: FormData):
  | { ok: true; data: OrderInput }
  | { ok: false; errors: FieldErrors } {
  const names = formData.getAll("itemName").map(String);
  const quantities = formData.getAll("itemQuantity").map(String);
  const prices = formData.getAll("itemPrice").map(String);

  const items = names
    .map((name, i) => ({ name, quantity: quantities[i] ?? "", price: prices[i] ?? "" }))
    // Rows left entirely blank are ignored rather than reported.
    .filter((row) => row.name.trim() || row.quantity.trim() || row.price.trim())
    .map((row) => ({
      name: row.name,
      quantity: row.quantity.trim() === "" ? Number.NaN : Number(row.quantity),
      unitPriceCents: parseMoneyToCents(row.price) ?? Number.NaN,
    }));

  const result = orderSchema.safeParse({
    branchId: String(formData.get("branchId") ?? ""),
    orderedAt: String(formData.get("orderedAt") ?? ""),
    status: String(formData.get("status") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    customerName: String(formData.get("customerName") ?? ""),
    items,
  });
  if (result.success) return { ok: true, data: result.data };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (issue.path[0] === "items" && issue.path.length === 1) {
      errors.items = "minItems";
    } else if (issue.path[0] === "items") {
      // items.<index>.<field>: numeric fields report "invalidNumber", the name reports "required".
      errors[path] = issue.path[2] === "name" ? "required" : "invalidNumber";
    } else {
      errors[path] = "required";
    }
  }
  return { ok: false, errors };
}
