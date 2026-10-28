"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Locale } from "@/i18n/config";
import { formatMoney } from "@/i18n/format";
import { ChartTooltip } from "./chart-tooltip";

type Props = {
  data: { name: string; totalCents: number }[]; // already translated, sorted by caller
  lang: Locale;
  title: string;
  seriesLabel: string;
  emptyLabel: string;
};

// Horizontal bars for a handful of categories (payment methods, branches). One series, so one
// hue and no legend; the value sits at the bar tip and the hidden table carries everything else.
export function SummaryChart({ data, lang, title, seriesLabel, emptyLabel }: Props) {
  if (data.length === 0 || data.every((d) => d.totalCents === 0)) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div>
      <div style={{ height: Math.max(96, data.length * 48) }} className="w-full">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 144 }}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 88, bottom: 4, left: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="name"
              width={112}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              content={({ active, payload }) => (
                <ChartTooltip
                  active={active}
                  title={payload?.[0]?.payload?.name}
                  value={payload?.[0] ? formatMoney(Number(payload[0].value), lang) : undefined}
                  seriesLabel={seriesLabel}
                />
              )}
            />
            <Bar
              dataKey="totalCents"
              fill="var(--viz-series-1)"
              barSize={16}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="totalCents"
                position="right"
                formatter={(v: unknown) => formatMoney(Number(v), lang)}
                fill="var(--foreground)"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* The wrapper div does the clipping: `sr-only` directly on a <table> doesn't clip its cells. */}
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <tbody>
            {data.map((d) => (
              <tr key={d.name}>
                <th scope="row">{d.name}</th>
                <td>{formatMoney(d.totalCents, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
