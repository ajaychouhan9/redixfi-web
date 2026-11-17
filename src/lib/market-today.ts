/**
 * Market today (17 Nov 2026): one page with three tabs, Movers | Pulse | Activity. Pure helpers for the Movers tab: which list to read, how a row
 * is written and which label carries its date. The numbers all come from the existing Intraday lists; nothing is computed or ranked here.
 */
import type { IntradayTabData, IntradayTabId, IntradayUniverse } from "@/lib/api/types";

export type MarketTabId = "movers" | "pulse" | "activity";
export const MARKET_TABS: { id: MarketTabId; label: string }[] = [
  { id: "movers", label: "Movers" },
  { id: "pulse", label: "Pulse" },
  { id: "activity", label: "Activity" },
];

export function marketTabFrom(search: string | null | undefined, hash?: string | null): MarketTabId | null {
  const q = new URLSearchParams(String(search ?? "")).get("tab") ?? String(hash ?? "").replace(/^#/, "");
  return MARKET_TABS.some((t) => t.id === q) ? (q as MarketTabId) : null;
}

/** The universes offered (Nifty 500 first opened). "All liquid" is left out. */
export const MOVER_UNIVERSES: { id: IntradayUniverse; label: string }[] = [
  { id: "nifty50", label: "Nifty 50" },
  { id: "nifty100", label: "Nifty 100" },
  { id: "nifty500", label: "Nifty 500" },
];
export const DEFAULT_UNIVERSE: IntradayUniverse = "nifty500";

/** Before the open the Pre-open gaps are the movers; during and after the session the Live scan list is (after the close it holds the
 *  last scan of the day, labelled with its date). The server decides the phase from the Indian clock, a weekend or a holiday. */
export function moversSource(phase: string | null | undefined): IntradayTabId {
  return phase === "pre_market" ? "morning" : "scan";
}

export interface MoverRow {
  symbol: string;
  name: string | null;
  change: number | null;
  price: number | null;
  /** Volume so far against the stock's own usual level (a ratio); null when the list does not carry one. */
  ratio: number | null;
}

/** "3.0x its usual volume" or "-". The lists carry the ratio only; a share count is not sent by the API. */
export function volumeText(ratio: number | null | undefined): string {
  return typeof ratio === "number" && Number.isFinite(ratio) ? `${ratio.toFixed(1)}x its usual volume` : "-";
}

export function moverRows(d: IntradayTabData | null | undefined, universe: IntradayUniverse, side: "up" | "down"): MoverRow[] {
  if (!d || !d.available) return [];
  if (d.tab === "morning") {
    return (d[side] ?? []).map((r) => ({ symbol: r.symbol, name: r.name, change: r.gap_pct, price: r.pre_open_price, ratio: null }));
  }
  return (d.lists?.[universe]?.[side] ?? []).map((r) => ({ symbol: r.symbol, name: r.name, change: r.pct, price: r.price, ratio: r.vr }));
}

/** The label that dates the list: "As of 17 Nov 2026, 13:45 IST (delayed)" while open, "At 16 Nov close" once the session is over,
 *  "Pre-open prices as of 09:09 IST" before the open. Never an unlabelled figure. */
export function moversDateLabel(d: IntradayTabData | null | undefined): string | null {
  if (!d || !d.available) return null;
  const phase = d.session.phase;
  const when = d.as_of_label ?? d.data_date_label ?? null;
  if (d.tab === "morning") return when ? `Pre-open prices as of ${when}` : d.data_date_label ? `Pre-open prices of ${d.data_date_label}` : null;
  if (phase === "live" && d.is_today !== false) return when ? `As of ${when}` : null;
  const day = d.data_date_label ?? d.session.latest_completed_session;
  return day ? `At ${day} close` : null;
}

export const MOVERS_NOTE = "Largest price changes against the previous close among liquid stocks. Prices are delayed or as of the last update. Past record of measured data. Not a forecast or a recommendation.";
