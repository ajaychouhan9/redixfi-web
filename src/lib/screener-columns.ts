// Screener columns (14 Nov 2026): one registry for the table, the phone cards and the CSV, so what is shown is what is exported.
// Pure functions only (no React), so the rules can be tested without a browser.
import type { SignalRow } from "@/lib/api/types";
import { from52Display } from "@/lib/from52-display";
import { STANDARD_LINE } from "@/lib/compliance/standard-line";

export type ColumnGroup = "Price" | "Technical" | "Fundamentals" | "Activity";
export const COLUMN_GROUPS: ColumnGroup[] = ["Price", "Technical", "Fundamentals", "Activity"];

export type ColumnId =
  | "sector" | "week52" | "from52"
  | "ema200" | "volume" | "volatility" | "chips"
  | "pe" | "roe" | "eps" | "profit_growth" | "sales_growth" | "de" | "promoter" | "pledge" | "dividend_yield"
  | "delivery" | "insider" | "deals" | "news";

/** Facts the cells need that are not on the row itself (dates the API reports for the whole result). */
export interface ColumnCtx {
  measuredAsOf?: string | null;   // date of the measured readings (delivery, volume, volatility, insider)
  pledgeAsOf?: string | null;     // date of the newest pledge disclosure on file
  dealLatest?: string | null;
}

export interface Cell { primary: string; sub?: string }

export interface ColumnDef {
  id: ColumnId;
  group: ColumnGroup;
  label: string;                  // header text
  unit: string;                   // shown in the CSV header, "" when the value is text
  /** API sort name; null = not sortable on the server. */
  sort: string | null;
  /** sorted on the loaded page only (the API cannot sort on it); the report says so */
  pageSort?: boolean;
  /** true for columns whose readings are hidden on locked (Free) rows */
  measured?: boolean;
  kind?: "chips" | "news";
  /** the extra row field the API only sends when asked for (?fields=) */
  needsField?: "pledge_pct" | "insider_net_30d";
  cell: (row: SignalRow, ctx: ColumnCtx) => Cell | null;      // null = "n/a"
  asOf: (row: SignalRow | null, ctx: ColumnCtx) => string | null;
  csv: (row: SignalRow, ctx: ColumnCtx) => string | number;
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(ymd: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd ?? "");
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
const qtr = (ymd: string | null | undefined) => { const d = fmtDate(ymd); return d ? `${d} qtr` : null; };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const trim1 = (n: number) => String(Math.round(n * 10) / 10);
export function inrShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${trim1(a / 1e7)} Cr`;
  if (a >= 1e5) return `₹${trim1(a / 1e5)} lakh`;
  return `₹${Math.round(a).toLocaleString("en-IN")}`;
}

/** Price against its 200-day EMA, in percent, from the row's price and the stored EMA. */
export function emaGapPct(row: SignalRow): number | null {
  return isNum(row.last_price) && isNum(row.ema200) && row.ema200 > 0 ? Math.round((row.last_price / row.ema200 - 1) * 1000) / 10 : null;
}

const pctCell = (v: number | null | undefined, sub: string | null): Cell | null => (isNum(v) ? { primary: `${trim1(v)}%`, ...(sub ? { sub } : {}) } : null);
const numCell = (v: number | null | undefined, sub: string | null): Cell | null => (isNum(v) ? { primary: trim1(v), ...(sub ? { sub } : {}) } : null);
const sgn = (v: number) => `${v > 0 ? "+" : ""}${trim1(v)}%`;
const csvNum = (v: unknown): string | number => (isNum(v) ? Math.round(v * 100) / 100 : "n/a");
const fq = (r: SignalRow | null) => qtr(r?.fund_quarter_end);

export const COLUMNS: ColumnDef[] = [
  { id: "sector", group: "Price", label: "Sector", unit: "", sort: null,
    cell: (r) => (r.sector ? { primary: r.sector } : null), asOf: () => null, csv: (r) => r.sector || "n/a" },
  { id: "week52", group: "Price", label: "52-week high", unit: "₹", sort: "week52_high", measured: true,
    cell: (r) => { const f = from52Display(r.week52_high, r.pct_below_52w_high, r.last_price); return f.high != null ? { primary: inr(f.high) } : null; },
    asOf: (_r, c) => fmtDate(c.measuredAsOf), csv: (r) => csvNum(from52Display(r.week52_high, r.pct_below_52w_high, r.last_price).high) },
  { id: "from52", group: "Price", label: "From 52-week high", unit: "% below", sort: "pct_below_52w_high", measured: true,
    cell: (r) => { const f = from52Display(r.week52_high, r.pct_below_52w_high, r.last_price); return f.belowPct == null ? null : { primary: f.atHigh ? "at 52-week high" : `${f.belowPct.toFixed(1)}% below` }; },
    asOf: (_r, c) => fmtDate(c.measuredAsOf), csv: (r) => { const f = from52Display(r.week52_high, r.pct_below_52w_high, r.last_price); return f.belowPct == null ? "n/a" : f.belowPct; } },

  { id: "ema200", group: "Technical", label: "200-day EMA", unit: "% vs EMA", sort: null, pageSort: true,
    cell: (r) => {
      const gap = emaGapPct(r);
      if (gap === null || !r.ema200_state) return null;
      return { primary: `${r.ema200_state === "above" ? "Above" : "Below"} (${sgn(gap)})`, sub: `EMA ${inr(r.ema200 as number)}` };
    },
    asOf: (r) => fmtDate(r?.ema200_as_of), csv: (r) => { const g = emaGapPct(r); return g === null ? "n/a" : g; } },
  { id: "volume", group: "Technical", label: "Volume vs usual", unit: "x", sort: "volume_ratio", measured: true,
    cell: (r) => (isNum(r.volume_ratio_5d) ? { primary: `${r.volume_ratio_5d}x`, sub: "last 5 vs prior 20" } : null),
    asOf: (_r, c) => fmtDate(c.measuredAsOf), csv: (r) => csvNum(r.volume_ratio_5d) },
  { id: "volatility", group: "Technical", label: "Volatility", unit: "more volatile than % of stocks", sort: "vol_pct_more", measured: true,
    cell: (r) => (isNum(r.vol_pct_more) ? { primary: `More volatile than ${r.vol_pct_more}%`, ...(isNum(r.vol_rank) && isNum(r.vol_ranked_of) ? { sub: `Rank ${r.vol_rank} of ${r.vol_ranked_of}` } : {}) } : null),
    asOf: (r) => fmtDate(r?.vol_as_of), csv: (r) => csvNum(r.vol_pct_more) },
  { id: "chips", group: "Technical", label: "State", unit: "", sort: null, kind: "chips", measured: true,
    cell: (r) => (r.signal_states?.length ? { primary: r.signal_states.join(", ") } : null), asOf: (_r, c) => fmtDate(c.measuredAsOf),
    csv: (r) => (r.signal_states ?? []).join("; ") },

  { id: "pe", group: "Fundamentals", label: "P/E", unit: "x", sort: "pe",
    cell: (r) => numCell(r.pe, fq(r)), asOf: (r) => fq(r), csv: (r) => csvNum(r.pe) },
  { id: "roe", group: "Fundamentals", label: "ROE", unit: "%", sort: "roe",
    cell: (r) => pctCell(r.roe, fq(r)), asOf: (r) => fq(r), csv: (r) => csvNum(r.roe) },
  { id: "eps", group: "Fundamentals", label: "EPS", unit: "₹", sort: "eps",
    cell: (r) => (isNum(r.eps) ? { primary: inr(r.eps), ...(fq(r) ? { sub: fq(r) as string } : {}) } : null), asOf: (r) => fq(r), csv: (r) => csvNum(r.eps) },
  { id: "profit_growth", group: "Fundamentals", label: "Profit growth", unit: "% vs year-earlier quarter", sort: "profit_growth",
    cell: (r) => pctCell(r.profit_growth_pct, fq(r)), asOf: (r) => fq(r), csv: (r) => csvNum(r.profit_growth_pct) },
  { id: "sales_growth", group: "Fundamentals", label: "Sales growth", unit: "% vs year-earlier quarter", sort: "sales_growth",
    cell: (r) => pctCell(r.sales_growth_pct, fq(r)), asOf: (r) => fq(r), csv: (r) => csvNum(r.sales_growth_pct) },
  { id: "de", group: "Fundamentals", label: "Debt-to-equity", unit: "x", sort: "de",
    cell: (r) => numCell(r.de, fq(r)), asOf: (r) => fq(r), csv: (r) => csvNum(r.de) },
  { id: "promoter", group: "Fundamentals", label: "Promoter holding", unit: "%", sort: "promoter_pct",
    cell: (r) => pctCell(r.promoter_pct, fmtDate(r.shareholding_date)), asOf: (r) => fmtDate(r?.shareholding_date), csv: (r) => csvNum(r.promoter_pct) },
  { id: "pledge", group: "Fundamentals", label: "Promoter pledge", unit: "%", sort: "pledge_pct", needsField: "pledge_pct", measured: true,
    cell: (r, c) => pctCell(r.pledge_pct, fmtDate(c.pledgeAsOf)), asOf: (_r, c) => fmtDate(c.pledgeAsOf), csv: (r) => csvNum(r.pledge_pct) },
  { id: "dividend_yield", group: "Fundamentals", label: "Dividend yield", unit: "%", sort: "dividend_yield",
    cell: (r) => pctCell(r.dividend_yield_pct, fq(r)), asOf: (r) => fq(r), csv: (r) => csvNum(r.dividend_yield_pct) },

  { id: "delivery", group: "Activity", label: "Delivery", unit: "%", sort: "delivery_pct", measured: true,
    cell: (r) => (isNum(r.delivery_pct) ? { primary: `${r.delivery_pct}%`, ...(isNum(r.delivery_avg20) ? { sub: `avg ${r.delivery_avg20}%` } : {}) } : null),
    asOf: (_r, c) => fmtDate(c.measuredAsOf), csv: (r) => csvNum(r.delivery_pct) },
  { id: "insider", group: "Activity", label: "Insider trades, 30 days", unit: "₹ net traded value", sort: "insider_net_30d", needsField: "insider_net_30d", measured: true,
    cell: (r, c) => {
      const v = r.insider_net_30d;
      if (!isNum(v)) return null;
      const sub = c.measuredAsOf ? `30 days to ${fmtDate(c.measuredAsOf)}` : undefined;
      if (v === 0) return { primary: "None disclosed", ...(sub ? { sub } : {}) };
      return { primary: `${v > 0 ? "Net buying" : "Net selling"} ${inrShort(v)}`, ...(sub ? { sub } : {}) };
    },
    asOf: (_r, c) => fmtDate(c.measuredAsOf), csv: (r) => csvNum(r.insider_net_30d) },
  { id: "deals", group: "Activity", label: "Bulk/block deals, 30 days", unit: "deals", sort: "deal_30d_count",
    cell: (r) => {
      const n = r.deal_30d_count;
      if (isNum(n) && n > 0) return { primary: `${n} ${n === 1 ? "deal" : "deals"}`, ...(fmtDate(r.deal_30d_last) ? { sub: `last ${fmtDate(r.deal_30d_last)}` } : {}) };
      return { primary: "None disclosed" };
    },
    asOf: (_r, c) => fmtDate(c.dealLatest), csv: (r) => (isNum(r.deal_30d_count) ? r.deal_30d_count : 0) },
  { id: "news", group: "Activity", label: "News (5 days)", unit: "", sort: null, kind: "news",
    cell: (r) => (r.news_5d ? { primary: "News in the last 5 days" } : null), asOf: () => null, csv: (r) => (r.news_5d ? r.news_5d.headline : "") },
];

export const COLUMN_BY_ID: Record<string, ColumnDef> = Object.fromEntries(COLUMNS.map((c) => [c.id, c]));
/** Table order: the long-standing seven keep their places, new columns follow. */
const ORDER: ColumnId[] = ["sector", "delivery", "volume", "from52", "week52", "volatility", "chips", "ema200", "pe", "roe", "eps", "profit_growth", "sales_growth",
  "de", "promoter", "pledge", "dividend_yield", "insider", "deals", "news"];

const PRESET_DEFS: { id: string; label: string; ids: ColumnId[] }[] = [
  { id: "basic", label: "Basic", ids: ["sector", "delivery", "volume", "from52", "volatility", "chips", "news"] },
  { id: "fundamentals", label: "Fundamentals", ids: ["sector", "pe", "roe", "profit_growth", "sales_growth", "de", "promoter", "dividend_yield"] },
  { id: "technical", label: "Technical", ids: ["from52", "ema200", "volume", "volatility", "chips"] },
  { id: "activity", label: "Activity", ids: ["delivery", "insider", "deals", "volume", "news"] },
];
/** Presets always list their columns in table order. */
export const PRESETS = PRESET_DEFS.map((p) => ({ ...p, ids: sanitizeColumns(p.ids) }));
export const DEFAULT_COLUMNS: ColumnId[] = PRESETS[0].ids;

/** Keep only known column ids, once each, in table order. */
export function sanitizeColumns(ids: unknown): ColumnId[] {
  if (!Array.isArray(ids)) return [];
  const set = new Set(ids.filter((x): x is string => typeof x === "string" && x in COLUMN_BY_ID));
  return ORDER.filter((id) => set.has(id));
}

/** The old per-user choice (a yes/no for each of seven columns) as a list of ids. */
export function fromLegacyColumns(old: Record<string, unknown> | null | undefined): ColumnId[] {
  if (!old || typeof old !== "object") return DEFAULT_COLUMNS;
  const map: Record<string, ColumnId> = { sector: "sector", delivery: "delivery", volume: "volume", chips: "chips", eventRisk: "news", from52: "from52", volatility: "volatility" };
  const ids = Object.entries(map).filter(([k]) => old[k] !== false).map(([, id]) => id);
  return sanitizeColumns(ids);
}

/** What the current filters read, as the state of the Screener controls. */
export interface ActiveFilterState {
  peMax?: string; roeMin?: string; epsPositive?: boolean; profitGrowthMin?: string; salesGrowthMin?: string; ema200?: string;
  deMax?: string; promoterMin?: string; promoterMax?: string; dividendYieldMin?: string; pledgeMax?: string; pledgeMin?: string; deliveryMin?: string;
  insider?: string; deal30d?: boolean;
  from52?: boolean; volatility?: boolean; volumeMin?: boolean; deliveryState?: boolean; news?: boolean; sector?: boolean;
}
const has = (v: string | undefined) => !!v && v.trim() !== "";

/** Columns a filter forces on, so the value that was filtered on is always visible. */
export function filterColumns(f: ActiveFilterState): ColumnId[] {
  const out: ColumnId[] = [];
  if (has(f.peMax)) out.push("pe");
  if (has(f.roeMin)) out.push("roe");
  if (f.epsPositive) out.push("eps");
  if (has(f.profitGrowthMin)) out.push("profit_growth");
  if (has(f.salesGrowthMin)) out.push("sales_growth");
  if (f.ema200) out.push("ema200");
  if (has(f.deMax)) out.push("de");
  if (has(f.promoterMin) || has(f.promoterMax)) out.push("promoter");
  if (has(f.dividendYieldMin)) out.push("dividend_yield");
  if (has(f.pledgeMax) || has(f.pledgeMin)) out.push("pledge");
  if (has(f.deliveryMin) || f.deliveryState) out.push("delivery");
  if (f.insider) out.push("insider");
  if (f.deal30d) out.push("deals");
  if (f.from52) out.push("from52");
  if (f.volatility) out.push("volatility");
  if (f.volumeMin) out.push("volume");
  if (f.news) out.push("news");
  return sanitizeColumns(out);
}

/** Chosen columns plus the ones active filters force on, in table order. `forced` lists the filter-driven ones. */
export function resolveColumns(chosen: ColumnId[], forced: ColumnId[]): { ids: ColumnId[]; forced: Set<ColumnId> } {
  const set = new Set<ColumnId>([...sanitizeColumns(chosen), ...forced]);
  return { ids: ORDER.filter((id) => set.has(id)), forced: new Set(forced) };
}

/** What the API behind the page can do. Older deployments lack some columns' data, so those columns are not offered (no empty "n/a" columns). */
export interface ApiCaps { fundamentals: boolean; filters13: boolean; columns: boolean }
export const NO_CAPS: ApiCaps = { fundamentals: false, filters13: false, columns: false };
const NEEDS_FUNDAMENTALS: ColumnId[] = ["ema200", "pe", "roe", "eps", "profit_growth", "sales_growth"];
const NEEDS_FILTERS13: ColumnId[] = ["de", "promoter", "dividend_yield", "deals"];
const NEEDS_COLUMNS: ColumnId[] = ["pledge", "insider"];
export function columnAvailable(id: ColumnId, caps: ApiCaps): boolean {
  if (NEEDS_FUNDAMENTALS.includes(id)) return caps.fundamentals;
  if (NEEDS_FILTERS13.includes(id)) return caps.filters13;
  if (NEEDS_COLUMNS.includes(id)) return caps.columns;
  return true;
}
/** Sorts every API deployment accepts; the others need `columns`. */
const LEGACY_SORTS = new Set(["symbol", "name", "market_cap", "delivery_pct", "sector_rank", "volume_ratio", "pct_below_52w_high", "week52_high", "vol_pct_more"]);
export const sortAvailable = (sort: string, caps: ApiCaps) => caps.columns || LEGACY_SORTS.has(sort) || isPageSort(sort);

/** The value of ?fields= the API needs for these columns ("" when every value is already in the default row). */
export function neededFields(ids: ColumnId[]): string {
  return ids.map((id) => COLUMN_BY_ID[id].needsField).filter((f): f is "pledge_pct" | "insider_net_30d" => !!f).join(",");
}

/** Sort names the visible columns can use (server sorts), plus page-only sorts. */
export function sortOptionsFor(ids: ColumnId[]): { value: string; label: string; pageOnly: boolean }[] {
  return ids.flatMap((id): { value: string; label: string; pageOnly: boolean }[] => {
    const c = COLUMN_BY_ID[id];
    if (c.sort) return [{ value: c.sort, label: c.label, pageOnly: false }];
    if (c.pageSort) return [{ value: `page:${id}`, label: `${c.label} (this page only)`, pageOnly: true }];
    return [];
  });
}

/** A sort that is applied to the loaded page only; it is never sent to the API or stored in a shared link. */
export const isPageSort = (sort: string) => sort.startsWith("page:");
export function apiSort(sort: string): string { return isPageSort(sort) ? "symbol" : sort; }

export function sortPage(rows: SignalRow[], sort: string, order: "asc" | "desc"): SignalRow[] {
  if (!isPageSort(sort)) return rows;
  const id = sort.slice(5);
  const val = (r: SignalRow): number | null => (id === "ema200" ? emaGapPct(r) : null);
  const have = rows.filter((r) => val(r) !== null).sort((a, b) => (val(a) as number) - (val(b) as number) || a.symbol.localeCompare(b.symbol));
  if (order === "desc") have.reverse();
  return [...have, ...rows.filter((r) => val(r) === null)];      // rows without a value always last
}

// ---------------------------------------------------------------- CSV

export function csvHeader(def: ColumnDef, ctx: ColumnCtx, rows?: SignalRow[]): string {
  const asOf = commonAsOf(def, ctx, rows);
  const parts = [def.unit, asOf ? `as of ${asOf}` : ""].filter(Boolean);
  return parts.length ? `${def.label} (${parts.join(", ")})` : def.label;
}
/** Columns dated by each row (quarter ends, shareholding date) show the date shared by the exported rows, or the newest one. */
function commonAsOf(def: ColumnDef, ctx: ColumnCtx, rows?: SignalRow[]): string | null {
  const dates = (rows && rows.length ? rows : [null]).map((r) => def.asOf(r, ctx)).filter((d): d is string => !!d);
  if (!dates.length) return null;
  const uniq = [...new Set(dates)].sort((x, y) => toIso(x).localeCompare(toIso(y)));
  return uniq.length === 1 ? uniq[0] : `newest ${uniq[uniq.length - 1]}; rows differ`;
}
function toIso(d: string): string {
  const m = /^(\d+) (\w{3}) (\d{4})/.exec(d);
  return m ? `${m[3]}-${String(MONTHS.indexOf(m[2]) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : d;
}

const q = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** Spreadsheet programs run text that starts with = + - @ as a formula; a leading apostrophe-free guard keeps imported text inert. */
const safe = (v: string | number): string | number => (typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : v);

/**
 * CSV text for exactly the visible columns. Row 1 is the standard line. Symbol, Company and Price (with the day change shown in the
 * Price cell) are always visible, so they are always exported. Header: label, unit and the as-of date of the figure.
 */
export function buildScreenerCsv(rows: SignalRow[], ids: ColumnId[], ctx: ColumnCtx, priceAsOf: string | null): string {
  const defs = ids.map((id) => COLUMN_BY_ID[id]);
  const head = ["Symbol", "Company", `Price (₹${priceAsOf ? `, as of ${priceAsOf}` : ""})`, "Day change (%)", ...defs.map((d) => csvHeader(d, ctx, rows))];
  const lines = [q(STANDARD_LINE), head.map(q).join(",")];
  for (const r of rows) {
    const cells: (string | number)[] = [r.symbol, r.company_name, isNum(r.last_price) ? r.last_price : "n/a", isNum(r.day_change_pct) ? r.day_change_pct : "n/a"];
    for (const d of defs) cells.push(r.locked && d.measured ? "locked" : d.csv(r, ctx));
    lines.push(cells.map((c) => q(safe(c))).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

/** How many rows an export may hold: the Pro table allowance, the same number the API enforces. */
export const EXPORT_MAX_ROWS = 2000;
export function exportPages(total: number, size = 200, cap = EXPORT_MAX_ROWS): number { return Math.ceil(Math.min(Math.max(total, 0), cap) / size); }
