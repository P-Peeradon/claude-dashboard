"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { intlLocales, type Locale } from "@/i18n/config";
import { formatMoney } from "@/i18n/format";
import { ChartTooltip } from "./chart-tooltip";

type Point = { day: string; totalCents: number }; // day = YYYY-MM-DD in Singapore time

type Props = {
  data: Point[];
  lang: Locale;
  title: string;
  seriesLabel: string;
  emptyLabel: string;
};

// `day` is already a calendar date, so format it in UTC to avoid any further time-zone shift.
const dayFormatter = (lang: Locale, long: boolean) =>
  new Intl.DateTimeFormat(intlLocales[lang], {
    day: "numeric",
    month: "short",
    ...(long ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });

export function DailySalesChart({ data, lang, title, seriesLabel, emptyLabel }: Props) {
  const short = dayFormatter(lang, false);
  const long = dayFormatter(lang, true);
  const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
  const compact = new Intl.NumberFormat(intlLocales[lang], { notation: "compact", maximumFractionDigits: 1 });

  if (data.length === 0 || data.every((d) => d.totalCents === 0)) {
    return <p className="py-16 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div>
      <div className="h-64 w-full md:h-72">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 288 }}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
            <XAxis
              dataKey="day"
              tickFormatter={(d: string) => short.format(toDate(d))}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v: number) => compact.format(v / 100)}
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  title={typeof label === "string" ? long.format(toDate(label)) : undefined}
                  value={payload?.[0] ? formatMoney(Number(payload[0].value), lang) : undefined}
                  seriesLabel={seriesLabel}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="totalCents"
              stroke="var(--viz-series-1)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="var(--viz-series-1)"
              fillOpacity={0.1}
              activeDot={{ r: 4, fill: "var(--viz-series-1)", stroke: "var(--card)", strokeWidth: 2 }}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Table view: every value stays reachable without hovering. */}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th scope="row">{long.format(toDate(d.day))}</th>
              <td>{formatMoney(d.totalCents, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
