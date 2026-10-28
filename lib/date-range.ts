// Date ranges for the dashboard, computed on Singapore calendar days (UTC+8, no DST).
export const RANGES = ["7d", "30d", "month"] as const;
export type Range = (typeof RANGES)[number];
export const DEFAULT_RANGE: Range = "30d";

const DAY_MS = 24 * 60 * 60 * 1000;
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

export const parseRange = (value: string | undefined): Range =>
  (RANGES as readonly string[]).includes(value ?? "") ? (value as Range) : DEFAULT_RANGE;

export type RangeBounds = {
  from: Date; // inclusive: midnight SGT of the first day
  to: Date; // exclusive: midnight SGT after the last day (today)
  days: string[]; // every SGT calendar day in the range, as YYYY-MM-DD
};

export function getRangeBounds(range: Range, now: number = Date.now()): RangeBounds {
  const sg = new Date(now + SGT_OFFSET_MS);
  const y = sg.getUTCFullYear();
  const m = sg.getUTCMonth();
  const todayStart = Date.UTC(y, m, sg.getUTCDate()) - SGT_OFFSET_MS;

  const fromMs =
    range === "7d" ? todayStart - 6 * DAY_MS : range === "30d" ? todayStart - 29 * DAY_MS : Date.UTC(y, m, 1) - SGT_OFFSET_MS;
  const toMs = todayStart + DAY_MS;

  const days: string[] = [];
  for (let t = fromMs; t < toMs; t += DAY_MS) {
    days.push(new Date(t + SGT_OFFSET_MS).toISOString().slice(0, 10));
  }
  return { from: new Date(fromMs), to: new Date(toMs), days };
}
