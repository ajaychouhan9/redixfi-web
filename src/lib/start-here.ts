import { SIGNAL_SECTORS } from "@/data/sectors";
import type { SharedScreenParams, SignalRow } from "@/lib/api/types";
import type { SignalsListParams } from "@/lib/api/endpoints";
import { growthText } from "@/lib/seo/stock-facts";

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


// ---- results as cards (17 Nov 2026) -------------------------------------------------------------------------------------------------------
export const START_PAGE_SIZE = 12;

/** The Screener request for the ticked boxes: the stocks matching ALL of them, sorted A to Z by name. Nothing is ranked. */
export function startListParams(chosen: string[], sector: string, page = 1): SignalsListParams {
  const p: SignalsListParams = { sort: "name", order: "asc", page, size: START_PAGE_SIZE };
  if (chosen.includes("profit")) p.eps_positive = true;
  if (chosen.includes("sales")) p.sales_growth_min = 1;
  if (chosen.includes("dividend")) p.dividend_yield_min = 0.01;
  if (sector) p.sector = sector;
  return p;
}

/** "Yes" / "No" / "Not available": was the latest reported quarter's earnings per share above zero. */
export function profitFlag(row: Pick<SignalRow, "eps">): string {
  const e = row.eps;
  return typeof e !== "number" || !Number.isFinite(e) ? "Not available" : e > 0 ? "Yes" : "No";
}

export function salesText(row: Pick<SignalRow, "sales_growth_pct">): string {
  const g = growthText(row.sales_growth_pct, "sales");
  return g === "n/a" ? "Not available" : g;
}

export function yieldText(row: Pick<SignalRow, "dividend_yield_pct">): string {
  const y = row.dividend_yield_pct;
  if (typeof y !== "number" || !Number.isFinite(y)) return "Not available";
  return y <= 0 ? "None" : `${y.toFixed(2)}%`;
}

/** The four plain lines of Step 1: what each figure on a result card means, with a plain example and no company named. */
export const HOW_TO_READ: { term: string; line: string }[] = [
  { term: "Profit", line: "The money a company has left after paying all its costs. Example: it sold goods worth 100, its costs were 90, so its profit is 10. The cards say Yes when the latest reported quarter had a profit." },
  { term: "Sales growth", line: "How much more or less the company sold than in the same quarter a year earlier. Example: +10% means it sold a tenth more than a year before." },
  { term: "Dividend yield", line: "A dividend is a part of the profit paid out to the owners of the shares. The yield is the year's dividend as a share of the price. Example: 2% means 2 rupees a year for every 100 rupees of price." },
  { term: "Points to watch", line: "Statements in a company's own reports that are worth reading yourself, such as an auditor's remark or a pending case. Each one links to its source. It is something to look into, not a verdict." },
];
