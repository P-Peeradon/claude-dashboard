import { Suspense } from "react";
import { DailySalesChart } from "@/components/charts/daily-sales-chart";
import { SummaryChart } from "@/components/charts/summary-chart";
import { FilterGroup } from "@/components/layout/filter-group";
import { Pagination } from "@/components/layout/pagination";
import { OrdersTable } from "@/components/orders/orders-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/config";
import { formatMoney, formatNumber } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { verifySession } from "@/lib/dal";
import { RANGES, getRangeBounds, parseRange, type Range } from "@/lib/date-range";
import { getBranches } from "@/lib/queries/branches";
import {
  getDailySales,
  getKpis,
  getOrdersPage,
  getSalesByBranch,
  getSalesByPayment,
} from "@/lib/queries/dashboard";

type SearchParams = PageProps<"/[lang]/dashboard">["searchParams"];

// Everything that reads the session or search params streams in behind this boundary.
export default function DashboardPage(props: PageProps<"/[lang]/dashboard">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent searchParams={props.searchParams} />
    </Suspense>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function DashboardContent({ searchParams }: { searchParams: SearchParams }) {
  const lang = await getLocale();
  const [dict, sp] = await Promise.all([getDictionary(), searchParams]);
  await verifySession(lang);

  const range = parseRange(first(sp.range));
  const branches = await getBranches();
  const branch = branches.find((b) => b.code === first(sp.branch));
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);

  const { from, to, days } = getRangeBounds(range);
  const filters = { from, to, branchId: branch?.id };

  const [kpis, daily, byPayment, byBranch, ordersPage] = await Promise.all([
    getKpis(filters),
    getDailySales(filters, days),
    getSalesByPayment(filters),
    branch ? null : getSalesByBranch(filters),
    getOrdersPage(filters, page),
  ]);

  const branchLabel = (code: string) => (dict.branches as Record<string, string>)[code] ?? code;
  const href = (patch: { range?: Range; branch?: string | null; page?: number }) => {
    const params = new URLSearchParams();
    params.set("range", patch.range ?? range);
    const b = patch.branch === undefined ? branch?.code : patch.branch;
    if (b) params.set("branch", b);
    if (patch.page && patch.page > 1) params.set("page", String(patch.page));
    return `/${lang}/dashboard?${params}`;
  };
  const rangeLabels: Record<Range, string> = {
    "7d": dict.dashboard.range7,
    "30d": dict.dashboard.range30,
    month: dict.dashboard.rangeMonth,
  };

  const kpiCards = [
    { label: dict.dashboard.totalSales, value: formatMoney(kpis.totalCents, lang) },
    { label: dict.dashboard.orderCount, value: formatNumber(kpis.orderCount, lang) },
    { label: dict.dashboard.avgOrderValue, value: formatMoney(kpis.avgOrderCents, lang) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{dict.dashboard.title}</h1>

      {/* One filter row above the content; it scopes every figure, chart and the table below. */}
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <FilterGroup
          label={dict.dashboard.dateRange}
          options={RANGES.map((r) => ({ label: rangeLabels[r], href: href({ range: r }), active: r === range }))}
        />
        <FilterGroup
          label={dict.dashboard.branch}
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

      <div className="grid gap-4 sm:grid-cols-3">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardHeader>
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{k.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.dashboard.dailySales}</CardTitle>
        </CardHeader>
        <CardContent>
          <DailySalesChart
            data={daily}
            lang={lang}
            title={dict.dashboard.dailySales}
            seriesLabel={dict.dashboard.totalSales}
            emptyLabel={dict.common.noData}
          />
        </CardContent>
      </Card>

      <div className={byBranch ? "grid gap-4 lg:grid-cols-2" : ""}>
        <SummaryCard
          title={dict.dashboard.salesByPayment}
          data={byPayment.map((r) => ({ name: dict.payment[r.key], totalCents: r.totalCents }))}
          lang={lang}
          seriesLabel={dict.dashboard.totalSales}
          emptyLabel={dict.common.noData}
        />
        {byBranch && (
          <SummaryCard
            title={dict.dashboard.salesByBranch}
            data={byBranch.map((r) => ({ name: branchLabel(r.key), totalCents: r.totalCents }))}
            lang={lang}
            seriesLabel={dict.dashboard.totalSales}
            emptyLabel={dict.common.noData}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.dashboard.recentOrders}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <OrdersTable orders={ordersPage.orders} lang={lang} dict={dict} />
          <Pagination
            page={page}
            pages={ordersPage.pages}
            hrefFor={(p) => href({ page: p })}
            labels={{
              previous: dict.common.previous,
              next: dict.common.next,
              summary: dict.common.page
                .replace("{page}", String(page))
                .replace("{pages}", String(ordersPage.pages)),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard(props: {
  title: string;
  data: { name: string; totalCents: number }[];
  lang: Locale;
  seriesLabel: string;
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <SummaryChart
          data={props.data}
          lang={props.lang}
          title={props.title}
          seriesLabel={props.seriesLabel}
          emptyLabel={props.emptyLabel}
        />
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
