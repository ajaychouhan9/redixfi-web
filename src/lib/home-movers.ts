/**
 * The Home movers preview (18 Nov 2026): five rows taken from the Intraday Live scan list of the Nifty 500. Rises and falls are treated alike:
 * the five largest changes by size, whichever way they went. Nothing is scored; the rows keep the order of their size.
 */
import type { IntradayTabData } from "@/lib/api/types";

export interface PreviewRow {
  symbol: string;
  name: string | null;
  change: number;
  price: number | null;
}

export const PREVIEW_SIZE = 5;

export function previewRows(d: IntradayTabData | null | undefined): PreviewRow[] {
  if (!d || !d.available || !d.lists) return [];
  const list = d.lists.nifty500 ?? d.lists.liquid;
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
