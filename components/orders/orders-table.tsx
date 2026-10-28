import { StatusBadge } from "@/components/orders/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Locale } from "@/i18n/config";
import { formatDateTime, formatMoney } from "@/i18n/format";
import type { Dictionary } from "@/i18n/get-dictionary";

export type OrderRow = {
  id: string;
  orderedAt: Date;
  status: "PAID" | "PENDING" | "CANCELLED";
  paymentMethod: "CASH" | "CARD" | "PAYNOW";
  customerName: string | null;
  totalCents: number;
  branch: { code: string };
};

type Props = { orders: OrderRow[]; lang: Locale; dict: Dictionary };

const branchName = (dict: Dictionary, code: string) =>
  (dict.branches as Record<string, string>)[code] ?? code;

// Table from `md` up; stacked cards on mobile.
export function OrdersTable({ orders, lang, dict }: Props) {
  if (orders.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{dict.orders.noOrders}</p>;
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.orders.date}</TableHead>
              <TableHead>{dict.orders.branch}</TableHead>
              <TableHead>{dict.orders.customer}</TableHead>
              <TableHead>{dict.orders.payment}</TableHead>
              <TableHead>{dict.orders.status}</TableHead>
              <TableHead className="text-right">{dict.orders.total}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(o.orderedAt, lang)}</TableCell>
                <TableCell>{branchName(dict, o.branch.code)}</TableCell>
                <TableCell>{o.customerName ?? "—"}</TableCell>
                <TableCell>{dict.payment[o.paymentMethod]}</TableCell>
                <TableCell>
                  <StatusBadge status={o.status} label={dict.status[o.status]} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(o.totalCents, lang)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {orders.map((o) => (
          <li key={o.id}>
            <Card className="gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold tabular-nums">{formatMoney(o.totalCents, lang)}</span>
                <StatusBadge status={o.status} label={dict.status[o.status]} />
              </div>
              <div className="text-sm text-muted-foreground">{formatDateTime(o.orderedAt, lang)}</div>
              <div className="text-sm">
                {branchName(dict, o.branch.code)} · {dict.payment[o.paymentMethod]}
                {o.customerName ? ` · ${o.customerName}` : ""}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
