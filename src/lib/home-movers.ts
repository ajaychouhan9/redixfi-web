/**
 * The Home movers preview (26 Nov 2026): five rows from the Intraday Live scan list of the Nifty 500, with two tabs, Gainers and Losers.
 * Each row is the stock, its price and its signed change. Nothing is scored; the rows keep the order of their size.
 */
import type { IntradayTabData } from "@/lib/api/types";

export interface PreviewRow {
  symbol: string;
  name: string | null;
  change: number;
  price: number | null;
}

export const PREVIEW_SIZE = 5;
export type MoverSide = "up" | "down";

function listOf(d: IntradayTabData | null | undefined) {
  if (!d || !d.available || !d.lists) return null;
  return d.lists.nifty500 ?? d.lists.liquid ?? null;
}

/** The five largest rises ("up") or falls ("down") of the last scan. */
export function sideRows(d: IntradayTabData | null | undefined, side: MoverSide): PreviewRow[] {
  const list = listOf(d);
  if (!list) return [];
  const rows: PreviewRow[] = (side === "up" ? list.up ?? [] : list.down ?? []).filter((r) => Number.isFinite(r.pct)).map((r) => ({ symbol: r.symbol, name: r.name, change: r.pct, price: r.price }));
  return rows.sort((a, b) => (side === "up" ? b.change - a.change : a.change - b.change)).slice(0, PREVIEW_SIZE);
}

/** Kept for older callers: the five largest changes by size, whichever way they went. */
export function previewRows(d: IntradayTabData | null | undefined): PreviewRow[] {
  const list = listOf(d);
  if (!list) return [];
  const all: PreviewRow[] = [...(list.up ?? []), ...(list.down ?? [])].map((r) => ({ symbol: r.symbol, name: r.name, change: r.pct, price: r.price }));
  return all.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, PREVIEW_SIZE);
}

/** "Live" while the market is open and the list is today's; otherwise "As of <date> close". No date, no label. */
export function previewLabel(d: IntradayTabData | null | undefined): string | null {
  if (!d || !d.available) return null;
  if (d.session.phase === "live" && d.is_today !== false) return "Live · 15 min delayed";
  const day = d.data_date_label ?? d.session.latest_completed_session ?? null;
  return day ? `As of ${day} close` : null;
}
