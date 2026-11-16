import { SIGNAL_SECTORS } from "@/data/sectors";
import type { SharedScreenParams } from "@/lib/api/types";

/**
 * "Start here" (17 Nov 2026): the beginner's three questions, mapped to filters the Screener really has. Each option names the exact
 * rule in plain words. A company-size question is not offered: the Screener has no market-value filter yet (see the report).
 */
export interface StartOption {
  id: string;
  label: string;
  /** The rule in plain words, shown beside the option. */
  rule: string;
  params: Partial<SharedScreenParams>;
}

export const START_WHAT_MATTERS: StartOption[] = [
  { id: "profit", label: "Steady profits", rule: "a profit per share above zero in the latest reported quarter", params: { eps_positive: true } },
  { id: "sales", label: "Growing sales", rule: "latest-quarter sales at least 1% above the same quarter a year earlier", params: { sales_growth_min: 1 } },
  { id: "dividend", label: "Pays dividends", rule: "a dividend yield above zero (dividend paid in the last year, as a share of the price)", params: { dividend_yield_min: 0.01 } },
];

const SECTOR_LABEL: Record<string, string> = {
  BANKNIFTY: "Banks",
  NIFTY: "Nifty 50 companies",
  "NIFTY AUTO": "Auto",
  "NIFTY ENERGY": "Energy",
  "NIFTY FMCG": "Consumer goods (FMCG)",
  "NIFTY MEDIA": "Media",
  "NIFTY METAL": "Metals",
  "NIFTY PHARMA": "Pharma",
  "NIFTY REALTY": "Real estate",
  NIFTYINFRA: "Infrastructure",
  NIFTYIT: "IT",
};

export const START_SECTORS: { value: string; label: string }[] = SIGNAL_SECTORS.map((s) => ({ value: s, label: SECTOR_LABEL[s] ?? s }));

/** The Screener address for the chosen options: results A to Z, marked as coming from Start here. */
export function startScreenerHref(chosen: string[], sector: string): string {
  const q = new URLSearchParams();
  q.set("from", "start");
  for (const o of START_WHAT_MATTERS) {
    if (!chosen.includes(o.id)) continue;
    for (const [k, v] of Object.entries(o.params)) if (v !== undefined && v !== null) q.set(k, String(v));
  }
  if (sector) q.set("sector", sector);
  q.set("sort", "name");
  q.set("order", "asc");
  return `/signals?${q.toString()}`;
}

const NUMBER_KEYS = ["sales_growth_min", "dividend_yield_min", "de_max", "pledge_max", "promoter_min", "pe_max", "roe_min", "profit_growth_min"] as const;

/** Reads filters from a /signals address (for example one made by startScreenerHref). Returns null when the address carries none. */
export function screenerParamsFromQuery(query: Record<string, string | string[] | undefined>): SharedScreenParams | null {
  const one = (k: string): string | undefined => {
    const v = query[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const out: SharedScreenParams = { sort: one("sort") === "symbol" ? "symbol" : "name", order: one("order") === "desc" ? "desc" : "asc" };
  let any = false;
  if (one("eps_positive") === "1" || one("eps_positive") === "true") { out.eps_positive = true; any = true; }
  for (const k of NUMBER_KEYS) {
    const raw = one(k);
    if (raw === undefined) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) { out[k] = n; any = true; }
  }
  const sector = one("sector");
  if (sector && (SIGNAL_SECTORS as readonly string[]).includes(sector)) { out.sector = sector; any = true; }
  return any ? out : null;
}

export const START_RESULTS_NOTE = "All stocks matching your filters, A to Z. Not a recommendation.";
