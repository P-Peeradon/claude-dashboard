// Parses a user-typed amount in dollars ("4.5", "12", "0.50") into integer cents.
// Returns null for anything that isn't a plain non-negative amount with at most 2 decimals.
export function parseMoneyToCents(input: string): number | null {
  const value = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [dollars, cents = ""] = value.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

export const centsToInput = (cents: number) => (cents / 100).toFixed(2);

export const orderTotalCents = (items: { quantity: number; unitPriceCents: number }[]) =>
  items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
