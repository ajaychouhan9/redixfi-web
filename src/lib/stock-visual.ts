/**
 * Pure helpers for the visual stock page (26 Nov 2026): number formats, key-number tiles with their one-line meaning, chart ranges, bar-chart
 * geometry, and the plain sentences under each chart. Everything here is arithmetic on stored figures with their dates. The sentences are built
 * from templates (no language model), state facts with numbers and dates only, and are checked against a list of banned words by a test.
 * Not enough data means no sentence (the function returns null) and no tile.
 */
import { clipSentence, isFragment, splitSentences, stripListMarker } from "@/lib/sentences";
import type { FundamentalsBlock } from "@/lib/api/types";

const MINUS = "−";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** ₹ amount with Indian grouping: 402.6 -> "₹402.60"; 1,234.5 -> "₹1,234.50". */
export const rupees = (n: number, digits = 2): string => `${n < 0 ? MINUS : ""}₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

/** Crore amounts: 289103.81 -> "₹2,89,104 Cr"; small amounts keep one decimal. */
export function crore(n: number): string {
  const a = Math.abs(n);
  const body = a >= 100 ? a.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : a.toLocaleString("en-IN", { maximumFractionDigits: 1 });
  return `${n < 0 ? MINUS : ""}₹${body} Cr`;
}

/** A signed percentage that always carries its sign: +1.76%, −0.8%, 0.0%. Digits are trimmed to what is shown (never "NaN"). */
export function signedPct(n: number | null | undefined, digits = 2): string | null {
  if (!isNum(n)) return null;
  const v = Number(n.toFixed(digits));
  const body = Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: digits });
  return `${v > 0 ? "+" : v < 0 ? MINUS : ""}${body}%`;
}

export function signedRupees(n: number | null | undefined): string | null {
  if (!isNum(n)) return null;
  const v = Number(n.toFixed(2));
  return `${v > 0 ? "+" : v < 0 ? MINUS : ""}₹${Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const toneOf = (n: number | null | undefined): "up" | "down" | "flat" => (!isNum(n) || Number(n.toFixed(2)) === 0 ? "flat" : n > 0 ? "up" : "down");

/** "30 Sep 2026" from YYYY-MM-DD (fixed month names, no time zone drift). */
export function dayText(ymd: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd ?? "");
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
/** "Sep 26" for a quarter end. */
export function quarterShort(ymd: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd ?? "");
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
/** "FY26" from "2026" (the year the fiscal year ends). */
export function fiscalShort(fy: string | null | undefined): string | null {
  const m = /(\d{4})/.exec(fy ?? "");
  return m ? `FY${m[1].slice(2)}` : null;
}

// ---------- key numbers ----------
export interface KeyTile {
  key: string;
  label: string;
  value: string;
  /** One plain line with the stock's own number in it. */
  meaning: string;
}

const trim = (n: number, d = 2) => `${n < 0 && Number(n.toFixed(d)) !== 0 ? MINUS : ""}${Math.abs(Number(n.toFixed(d))).toLocaleString("en-IN", { maximumFractionDigits: d })}`;

/** Sum of the last four quarters' EPS when four consecutive quarters are stored; otherwise null (never a guess). */
export function epsTtm(series: { quarter_end: string; eps: number | null }[] | undefined): number | null {
  const s = (series ?? []).slice(-4);
  if (s.length < 4 || s.some((p) => !isNum(p.eps))) return null;
  // the four quarter ends must be 3 months apart (no gap)
  for (let i = 1; i < 4; i++) {
    const a = new Date(`${s[i - 1].quarter_end.slice(0, 10)}T00:00:00Z`).getTime();
    const b = new Date(`${s[i].quarter_end.slice(0, 10)}T00:00:00Z`).getTime();
    const days = (b - a) / 86400000;
    if (!(days > 80 && days < 100)) return null;
  }
  return s.reduce((t, p) => t + (p.eps as number), 0);
}

/** The tiles that can be filled from the stored figures. A figure that is missing makes no tile. Face value is not stored, so it never appears. */
export function keyTiles(f: FundamentalsBlock | null | undefined): KeyTile[] {
  if (!f) return [];
  const out: KeyTile[] = [];
  const v = f.valuation;
  const mc = f.identity?.market_cap;
  if (isNum(mc) && mc > 0) out.push({ key: "mcap", label: "Market cap", value: crore(mc), meaning: `The price of all ${crore(mc)} of the company's shares together.` });
  if (v && isNum(v.pe_ttm) && v.pe_ttm > 0) out.push({ key: "pe", label: "P/E", value: trim(v.pe_ttm, 1), meaning: `P/E ${trim(v.pe_ttm, 1)}: the price is ${trim(v.pe_ttm, 1)} times the profit of the last 12 months.` });
  if (v && isNum(v.sector_pe) && v.sector_pe > 0) out.push({ key: "ipe", label: "Industry P/E", value: trim(v.sector_pe, 1), meaning: `Companies in this industry have a P/E of ${trim(v.sector_pe, 1)} on average.` });
  if (v && isNum(v.pb) && v.pb > 0) out.push({ key: "pb", label: "P/B", value: trim(v.pb, 1), meaning: `P/B ${trim(v.pb, 1)}: the price is ${trim(v.pb, 1)} times the book value per share.` });
  if (v && isNum(v.roe_ttm)) out.push({ key: "roe", label: "ROE", value: `${trim(v.roe_ttm, 1)}%`, meaning: `ROE ${trim(v.roe_ttm, 1)}%: ₹${trim(v.roe_ttm, 1)} of profit in the last 12 months for every ₹100 of shareholders' money.` });
  const eps = epsTtm(f.quarterly?.series_8q);
  if (isNum(eps)) out.push({ key: "eps", label: "EPS (TTM)", value: rupees(eps), meaning: `Profit per share over the last 4 quarters: ${rupees(eps)}.` });
  if (v && isNum(v.dividend_yield_pct) && v.dividend_yield_pct > 0) out.push({ key: "dy", label: "Dividend yield", value: `${trim(v.dividend_yield_pct, 2)}%`, meaning: `Dividend yield ${trim(v.dividend_yield_pct, 2)}%: ₹${trim(v.dividend_yield_pct, 2)} paid as dividend in a year for every ₹100 of price.` });
  const de = f.balance?.debt_to_equity ?? v?.debt_to_equity;
  if (isNum(de) && de >= 0) out.push({ key: "de", label: "Debt to equity", value: trim(de, 2), meaning: de === 0 ? "Debt to equity 0: no borrowings are recorded against the shareholders' money." : `Debt to equity ${trim(de, 2)}: ₹${trim(de, 2)} borrowed for every ₹1 of shareholders' money.` });
  const bv = f.balance?.book_value_per_share;
  if (isNum(bv) && bv > 0) out.push({ key: "bv", label: "Book value", value: rupees(bv), meaning: `Book value ${rupees(bv)}: the company's net worth divided by its number of shares.` });
  return out;
}

// ---------- price ranges ----------
export type RangeKey = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y";
export const RANGE_KEYS: RangeKey[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"];
const RANGE_DAYS: Record<Exclude<RangeKey, "1D">, number> = { "1W": 7, "1M": 30, "3M": 91, "6M": 183, "1Y": 365, "5Y": 1826 };
const RANGE_WORDS: Record<RangeKey, string> = { "1D": "today", "1W": "1 week", "1M": "1 month", "3M": "3 months", "6M": "6 months", "1Y": "1 year", "5Y": "5 years" };
export const rangeWords = (k: RangeKey): string => RANGE_WORDS[k];

/** [YYYY-MM-DD, close] pairs. */
export type Close = [string, number];

const ymdMs = (ymd: string) => new Date(`${ymd}T00:00:00Z`).getTime();

/** The closes inside a daily range, ending at the last close. The first point is the last close on or before the range start (so the change covers the whole range). */
export function sliceDaily(all: Close[], key: Exclude<RangeKey, "1D">): Close[] {
  if (all.length < 2) return [];
  const end = ymdMs(all[all.length - 1][0]);
  const start = end - RANGE_DAYS[key] * 86400000;
  // a range is only offered when the history reaches back to it (within a week of slack)
  if (ymdMs(all[0][0]) > start + 7 * 86400000) return [];
  let i = 0;
  while (i + 1 < all.length && ymdMs(all[i + 1][0]) <= start) i++;
  return all.slice(i);
}

export interface RangeChange {
  abs: number;
  pct: number;
  from: number;
  to: number;
}
export function changeOver(points: number[]): RangeChange | null {
  if (points.length < 2) return null;
  const from = points[0];
  const to = points[points.length - 1];
  if (!isNum(from) || !isNum(to) || from <= 0) return null;
  return { abs: to - from, pct: ((to - from) / from) * 100, from, to };
}

/** The ranges that have enough history, in button order. 1D is offered separately (it needs today's 15-minute bars). */
export function dailyRangesAvailable(all: Close[]): Exclude<RangeKey, "1D">[] {
  return (Object.keys(RANGE_DAYS) as Exclude<RangeKey, "1D">[]).filter((k) => sliceDaily(all, k).length >= 2);
}

/** Price sentence for the page text: "Price is up 12% in 1 year." (needs a year of closes). */
export function priceSentence(all: Close[]): string | null {
  const pts = sliceDaily(all, "1Y");
  const c = changeOver(pts.map((p) => p[1]));
  if (!c) return null;
  const p = Math.abs(c.pct);
  const shown = p >= 10 ? Math.round(p) : Number(p.toFixed(1));
  if (shown === 0) return "Price is unchanged over 1 year.";
  return `Price is ${c.pct > 0 ? "up" : "down"} ${shown}% in 1 year.`;
}

// ---------- revenue and profit ----------
export interface RPPoint {
  label: string;
  revenue: number | null;
  profit: number | null;
  /** YYYY-MM-DD or YYYY for ordering */
  at: string;
}
export function yearlyPoints(f: FundamentalsBlock | null | undefined): RPPoint[] {
  return (f?.annual?.series_5y ?? [])
    .filter((p) => fiscalShort(p.fiscal_year) && (isNum(p.revenue) || isNum(p.pat)))
    .map((p) => ({ label: fiscalShort(p.fiscal_year) as string, revenue: isNum(p.revenue) ? p.revenue : null, profit: isNum(p.pat) ? p.pat : null, at: String(p.fiscal_year) }));
}
export function quarterlyPoints(f: FundamentalsBlock | null | undefined): RPPoint[] {
  return (f?.quarterly?.series_8q ?? [])
    .filter((p) => quarterShort(p.quarter_end) && (isNum(p.revenue) || isNum(p.pat)))
    .map((p) => ({ label: quarterShort(p.quarter_end) as string, revenue: isNum(p.revenue) ? p.revenue : null, profit: isNum(p.pat) ? p.pat : null, at: p.quarter_end }));
}

/** Growth of the last point against a base point; null when the base is not above zero or a figure is missing. */
export function growth(now: number | null | undefined, before: number | null | undefined): number | null {
  if (!isNum(now) || !isNum(before) || before <= 0) return null;
  return ((now - before) / before) * 100;
}
export function cagr(now: number | null | undefined, before: number | null | undefined, years: number): number | null {
  if (!isNum(now) || !isNum(before) || before <= 0 || now <= 0 || years <= 0) return null;
  return (Math.pow(now / before, 1 / years) - 1) * 100;
}

export interface GrowthRow { label: string; revenue: string | null; profit: string | null }
/** Small table: 1 year growth and 3 year CAGR from the yearly series, only where the data allows. */
export function growthRows(pts: RPPoint[]): GrowthRow[] {
  const rows: GrowthRow[] = [];
  const n = pts.length;
  if (n >= 2) {
    const r = signedPct(growth(pts[n - 1].revenue, pts[n - 2].revenue), 1);
    const p = signedPct(growth(pts[n - 1].profit, pts[n - 2].profit), 1);
    if (r || p) rows.push({ label: "1 year", revenue: r, profit: p });
  }
  if (n >= 4) {
    const r = signedPct(cagr(pts[n - 1].revenue, pts[n - 4].revenue, 3), 1);
    const p = signedPct(cagr(pts[n - 1].profit, pts[n - 4].profit, 3), 1);
    if (r || p) rows.push({ label: "3 year CAGR", revenue: r, profit: p });
  }
  return rows;
}

/** "Profit went up in each of the last 5 years (₹2,399 Cr → ₹6,062 Cr)." Mixed years give a plain two-point line; too little data gives null. */
export function profitSentence(pts: RPPoint[], per: "year" | "quarter"): string | null {
  return seriesSentence(pts, "Profit", "profit", per);
}
export function revenueSentence(pts: RPPoint[], per: "year" | "quarter"): string | null {
  return seriesSentence(pts, "Revenue", "revenue", per);
}
function seriesSentence(pts: RPPoint[], noun: string, field: "profit" | "revenue", per: "year" | "quarter"): string | null {
  const vals = pts.filter((p) => isNum(p[field]));
  if (vals.length < 2) return null;
  const last = vals.slice(-5);
  const unit = per === "year" ? "years" : "quarters";
  const first = last[0][field] as number;
  const end = last[last.length - 1][field] as number;
  const steps = last.length - 1;
  const up = last.every((p, i) => i === 0 || (p[field] as number) > (last[i - 1][field] as number));
  const down = last.every((p, i) => i === 0 || (p[field] as number) < (last[i - 1][field] as number));
  // a period series (quarters) can be seasonal, so only years get the "each of" form
  if (per === "year" && steps >= 2 && up) return `${noun} went up in each of the last ${last.length} ${unit} (${crore(first)} → ${crore(end)}).`;
  if (per === "year" && steps >= 2 && down) return `${noun} went down in each of the last ${last.length} ${unit} (${crore(first)} → ${crore(end)}).`;
  const a = last[last.length - 2];
  const b = last[last.length - 1];
  const av = a[field] as number;
  const bv = b[field] as number;
  const word = bv > av ? "up from" : bv < av ? "down from" : "the same as";
  return `${noun} in ${b.label} was ${crore(bv)}, ${word} ${crore(av)} in ${a.label}.`;
}

/** Bar geometry for a grouped bar chart: values scaled to one shared maximum; negative values drawn below a shared baseline. */
export function barScale(pts: RPPoint[]): { max: number; min: number } {
  let max = 0;
  let min = 0;
  for (const p of pts) for (const v of [p.revenue, p.profit]) if (isNum(v)) { max = Math.max(max, v); min = Math.min(min, v); }
  return { max, min };
}

// ---------- shareholding ----------
export interface HoldPoint { date: string; label: string; promoter: number | null; fii: number | null; mf: number | null; other: number | null }
export function holdPoints(f: FundamentalsBlock | null | undefined): HoldPoint[] {
  return (f?.shareholding?.series_4q ?? [])
    .filter((p) => quarterShort(p.date) && [p.promoter, p.fii, p.mf, p.other].some(isNum))
    .map((p) => ({ date: p.date, label: quarterShort(p.date) as string, promoter: isNum(p.promoter) ? p.promoter : null, fii: isNum(p.fii) ? p.fii : null, mf: isNum(p.mf) ? p.mf : null, other: isNum(p.other) ? p.other : null }));
}
/** "FII holding went from 18.51% to 16.99% in 3 quarters." Needs two quarters with the figure. */
export function holdSentence(pts: HoldPoint[], field: "promoter" | "fii" | "mf", noun: string): string | null {
  const have = pts.filter((p) => isNum(p[field]));
  if (have.length < 2) return null;
  const a = have[0][field] as number;
  const b = have[have.length - 1][field] as number;
  const q = have.length - 1;
  const span = `${q} ${q === 1 ? "quarter" : "quarters"}`;
  if (Number(a.toFixed(2)) === Number(b.toFixed(2))) return `${noun} holding stayed at ${trim(b, 2)}% over ${span}.`;
  return `${noun} holding went from ${trim(a, 2)}% to ${trim(b, 2)}% in ${span}.`;
}

// ---------- short reads ----------
/** At most `max` short bullets (each up to `words` words) taken from a text. Cut-off pieces are dropped, never shown; a long sentence is cut at a clause, never on a joining word. */
export function shortBullets(text: string | null | undefined, max = 3, words = 15): { shown: string[]; rest: string[] } {
  const all = splitSentences(text).map(stripListMarker).filter((s) => !isFragment(s)).map((s) => clipSentence(s, words));
  return { shown: all.slice(0, max), rest: all.slice(max) };
}

/** Words that must never appear in a sentence built here (checked by a test). */
export const BANNED_SENTENCE_WORDS = ["buy", "sell", "target", "strong", "weak", "good", "bad", "healthy", "should", "recommend", "undervalued", "overvalued", "prediction"];
export function bannedIn(text: string): string[] {
  return BANNED_SENTENCE_WORDS.filter((w) => new RegExp(`\\b${w}\\w*\\b`, "i").test(text));
}
