import { Suspense } from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { FilterGroup } from "@/components/layout/filter-group";
import { Pagination } from "@/components/layout/pagination";
import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { OrdersTable } from "@/components/orders/orders-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { verifySession } from "@/lib/dal";
import { getBranches } from "@/lib/queries/branches";
import { listOrdersFiltered } from "@/lib/queries/orders";
import { ORDER_STATUSES } from "@/lib/validation";
import { cn } from "@/lib/utils";

type SearchParams = PageProps<"/[lang]/orders">["searchParams"];

export default function OrdersPage(props: PageProps<"/[lang]/orders">) {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersContent searchParams={props.searchParams} />
    </Suspense>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function OrdersContent({ searchParams }: { searchParams: SearchParams }) {
  const lang = await getLocale();
  const [dict, sp] = await Promise.all([getDictionary(), searchParams]);
  await verifySession(lang);

  const q = first(sp.q)?.trim().slice(0, 80) || undefined;
  const status = ORDER_STATUSES.find((s) => s === first(sp.status));
  const branches = await getBranches();
  const branch = branches.find((b) => b.code === first(sp.branch));
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);

  const { orders, pages } = await listOrdersFiltered({ q, status, branchId: branch?.id }, page);

  const branchLabel = (code: string) => (dict.branches as Record<string, string>)[code] ?? code;
  const href = (patch: { status?: string | null; branch?: string | null; page?: number }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const s = patch.status === undefined ? status : patch.status;
    const b = patch.branch === undefined ? branch?.code : patch.branch;
    if (s) params.set("status", s);
    if (b) params.set("branch", b);
    if (patch.page && patch.page > 1) params.set("page", String(patch.page));
    const qs = params.toString();
    return `/${lang}/orders${qs ? `?${qs}` : ""}`;
  };

  const deleteLabels = {
    delete: dict.common.delete,
    cancel: dict.common.cancel,
    title: dict.orders.deleteTitle,
    description: dict.orders.deleteConfirm,
    done: dict.orders.deleted,
    error: dict.errors.generic,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{dict.orders.title}</h1>
        <Link href={`/${lang}/orders/new`} className={cn(buttonVariants(), "h-11")}>
          <Plus aria-hidden className="size-4" />
          {dict.orders.new}
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <form method="get" className="flex w-full flex-col gap-1.5 sm:w-auto">
          <label htmlFor="q" className="text-sm text-muted-foreground">
            {dict.common.search}
          </label>
          <div className="flex gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            {branch && <input type="hidden" name="branch" value={branch.code} />}
            <Input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={dict.orders.searchPlaceholder}
              className="h-11 sm:w-72"
            />
            <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
              {dict.common.search}
            </button>
          </div>
        </form>
        <FilterGroup
          label={dict.orders.status}
          options={[
            { label: dict.common.all, href: href({ status: null }), active: !status },
            ...ORDER_STATUSES.map((s) => ({ label: dict.status[s], href: href({ status: s }), active: s === status })),
          ]}
        />
        <FilterGroup
          label={dict.orders.branch}
          options={[
            { label: dict.dashboard.allBranches, href: href({ branch: null }), active: !branch },
            ...branches.map((b) => ({
              label: branchLabel(b.code),
              href: href({ branch: b.code }),
              active: b.code === branch?.code,
            })),
          ]}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <OrdersTable
            orders={orders}
            lang={lang}
            dict={dict}
            renderActions={(id) => (
              <>
                <Link
                  href={`/${lang}/orders/${id}/edit`}
                  className={cn(buttonVariants({ variant: "outline" }), "h-11")}
                >
                  <Pencil aria-hidden className="size-4" />
                  {dict.common.edit}
                </Link>
                <DeleteOrderButton id={id} lang={lang} labels={deleteLabels} />
              </>
            )}
          />
          <Pagination
            page={page}
            pages={pages}
            hrefFor={(p) => href({ page: p })}
            labels={{
              previous: dict.common.previous,
              next: dict.common.next,
              summary: dict.common.page.replace("{page}", String(page)).replace("{pages}", String(pages)),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
