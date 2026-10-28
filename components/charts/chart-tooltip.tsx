"use client";

// Shared tooltip for the dashboard charts: value leads, label follows, series keyed by a short
// line of the series color. Text stays in text tokens; only the key wears the series color.
export function ChartTooltip({
  active,
  title,
  value,
  seriesLabel,
}: {
  active?: boolean;
  title?: string;
  value?: string;
  seriesLabel: string;
}) {
  if (!active || value === undefined) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      {title && <div className="text-xs text-muted-foreground">{title}</div>}
      <div className="mt-1 flex items-center gap-2">
        <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: "var(--viz-series-1)" }} />
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{seriesLabel}</span>
      </div>
    </div>
  );
}
