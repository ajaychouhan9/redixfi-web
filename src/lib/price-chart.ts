export type ChartPeriod = "1M" | "3M" | "1Y";
export const PERIOD_DAYS: Record<ChartPeriod, number> = { "1M": 31, "3M": 92, "1Y": 366 };

export interface ClosePoint {
  date: string; // YYYY-MM-DD
  close: number;
}

/** Daily closes from the chart API's candles (already adjusted for splits and bonus issues), oldest first. */
export function closesFrom(candles: { timestamp: string; close: number }[]): ClosePoint[] {
  return candles
    .filter((c) => typeof c.close === "number" && Number.isFinite(c.close) && c.close > 0)
    .map((c) => ({ date: String(c.timestamp).slice(0, 10), close: c.close }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** The points of one period, counted back from the last close; fewer when the stock has less history. */
export function periodPoints(all: ClosePoint[], period: ChartPeriod): ClosePoint[] {
  if (all.length === 0) return [];
  const last = new Date(`${all[all.length - 1].date}T00:00:00Z`).getTime();
  const from = last - PERIOD_DAYS[period] * 86400000;
  return all.filter((p) => new Date(`${p.date}T00:00:00Z`).getTime() >= from);
}

export function pctFromStart(points: ClosePoint[], i: number): number | null {
  return points.length && points[0].close > 0 ? (points[i].close / points[0].close - 1) * 100 : null;
}

/** SVG path and the value range for the points, with `pad` on every side; extra values (52-week lines) widen the range only when inside it is not needed. */
export function linePath(points: ClosePoint[], w: number, h: number, pad = 6) {
  const vals = points.map((p) => p.close);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => pad + (points.length > 1 ? (i / (points.length - 1)) * (w - 2 * pad) : 0);
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - 2 * pad);
  return { d: points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.close).toFixed(1)}`).join(" "), min, max, x, y };
}

/** Evenly spaced indexes for 3 or 4 date labels (first and last included). */
export function labelIndexes(n: number, count = 4): number[] {
  if (n <= 1) return [0];
  const k = Math.min(count, n);
  return Array.from(new Set(Array.from({ length: k }, (_, j) => Math.round((j / (k - 1)) * (n - 1)))));
}
