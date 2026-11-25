/**
 * Plain wording and row building for the stock page's Rewind tab (17 Nov 2026). Counts and dates of past days only: no rate, no chance,
 * no forecast. Pure functions, tested in scripts/test-restructure.ts.
 */
import type { StockwiseDay, StockwiseStock } from "@/lib/api/history";

export type RewindMove = 2 | 3 | 5;
export type RewindPeriod = "1y" | "3y";

export const REWIND_MOVES: RewindMove[] = [2, 3, 5];
// The stored history is 3 years deep, so 5 years is not offered (the API accepts 1, 2 or 3).
export const REWIND_PERIODS: { v: RewindPeriod; text: string }[] = [
  { v: "1y", text: "1 year" },
  { v: "3y", text: "3 years" },
];

export const REWIND_HINT = "Rewind: what happened around this stock's past big moves.";
export const REWIND_INTRO = "Pick a size. We show every day this stock moved by that much, and what its numbers looked like the day before.";
export const REWIND_FOOTER = "Past record. Not a forecast or a recommendation.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function dayLabel(ymd: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd ?? "");
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return "n/a";
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const signed = (v: unknown) => (fin(v) ? `${v > 0 ? "+" : ""}${v.toFixed(2)}%` : "n/a");

/** "INFY moved 2% or more on 139 days in 3 years (74 up, 65 down)." */
export function rewindSummary(symbol: string, move: RewindMove, period: RewindPeriod, s: Pick<StockwiseStock, "count" | "up" | "down" | "partial_period">): string {
  const years = period === "1y" ? "1 year" : "3 years";
  const days = `${(s.count ?? 0).toLocaleString("en-IN")} ${s.count === 1 ? "day" : "days"}`;
  const tail = s.partial_period ? " This stock has been listed for less than the full period." : "";
  return `${symbol} moved ${move}% or more on ${days} in ${years} (${s.up ?? 0} up, ${s.down ?? 0} down).${tail}`;
}

/** The numbers of one earlier session: change, volume against its usual level, delivery share. */
export function sessionNumbers(day: Pick<StockwiseDay, "sessions">, offset: number): string {
  const b = (day.sessions ?? []).find((x) => x.offset === offset);
  if (!b || b.status !== "ok") return b?.status === "pending" ? "Not yet available" : "Not available";
  const parts = [signed(b.change_pct)];
  parts.push(fin(b.volume_x) ? `volume ${b.volume_x.toFixed(2)}× usual` : "volume n/a");
  parts.push(fin(b.delivery_pct) ? `delivery ${b.delivery_pct.toFixed(1)}%` : "delivery n/a");
  return parts.join(" · ");
}

export function rewindRow(day: StockwiseDay): { date: string; move: string; before1: string; before2: string } {
  return { date: dayLabel(day.date), move: signed(day.move_pct), before1: sessionNumbers(day, -1), before2: sessionNumbers(day, -2) };
}
