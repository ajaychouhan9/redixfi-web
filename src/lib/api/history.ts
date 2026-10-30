import { apiGet, apiGetBlob, apiMutate, ApiError, type FetchOpts } from "./client";

export type HistoryDirection = "up" | "down" | "either";
export type HistoryScope = "stock" | "sector" | "all" | "similar";

export interface HistoryAccess {
  plan: "anonymous" | "free" | "basic" | "pro" | "trial";
  custom_filters: boolean;
  scopes: HistoryScope[];
  max_rows: number;
  saved_filters: boolean;
  csv: boolean;
  locked_text: string;
}

export interface HistoryParams {
  move: number;
  direction: HistoryDirection;
  signals: string[];
  match: string;
  scope: HistoryScope;
  symbol?: string | null;
  sector?: string | null;
  period: "3y" | "1y";
}

export interface HistoryConfig {
  enabled: boolean;
  as_of: string | null;
  moves: number[];
  periods: string[];
  readings: { key: string; label: string; rule: string }[];
  held_back: { label: string; why: string }[];
  examples: { id: string; label: string; params: Partial<HistoryParams> }[];
  access: HistoryAccess;
  min_sample: number;
  saved_max: number;
  stockwise?: StockwiseConfig;
}

export interface ReadingCells {
  date?: string;
  move?: number | null;
  trend_10d?: number | null;
  volume_ratio?: number | null;
  rsi?: number | null;
  delivery_pct?: number | null;
  above_dma_sessions?: number | null;
  states?: string[];
}

export interface HistorySummary {
  E: number;
  K: number | null;
  N: number | null;
  K_next: number | null;
  base_events: number;
  base_days: number;
  base_rate_pct: number | null;
  enough: boolean;
}

export interface HistoryRow {
  symbol: string;
  date: string;
  direction: "up" | "down";
  move: number;
  day_before: ReadingCells;
  day_of: ReadingCells;
  day_after: ReadingCells;
}

export interface HistoryResult {
  as_of: string;
  period_start: string;
  scope: { kind: HistoryScope; label: string; stocks: number | null };
  summaries: Partial<Record<"up" | "down", HistorySummary>>;
  table: HistoryRow[];
  table_total_found: number;
  table_more: boolean;
  today: ReadingCells | null;
  min_sample: number;
  params: HistoryParams;
  access: HistoryAccess;
  rows_limit: number;
  ms: number;
}

export interface SavedFilter {
  id: string;
  name: string;
  created_at: string;
  kind?: "pooled" | "stockwise";
  params: HistoryParams;
}

export const getHistoryConfig = (opts?: FetchOpts) => apiGet<HistoryConfig>("/history/config", opts);
export const searchHistoryStocks = (q: string, opts?: FetchOpts) =>
  apiGet<{ symbol: string; company_name: string | null; industry: string | null }[]>("/history/stocks", { ...opts, params: { q } });
export const getHistorySectors = (opts?: FetchOpts) => apiGet<{ sector: string; stocks: number }[]>("/history/sectors", opts);
export const runHistoryQuery = (body: Record<string, unknown>, opts?: FetchOpts) =>
  apiMutate<HistoryResult>("/history/query", "POST", body, opts);
export const listSavedFilters = (opts?: FetchOpts) => apiGet<SavedFilter[]>("/history/saved", opts);
export const saveFilter = (name: string, params: HistoryParams, opts?: FetchOpts) =>
  apiMutate<SavedFilter>("/history/saved", "POST", { name, params }, opts);
export const deleteSavedFilter = (id: string, opts?: FetchOpts) =>
  apiMutate<{ deleted: number }>(`/history/saved/${encodeURIComponent(id)}`, "DELETE", undefined, opts);
export const downloadHistoryCsv = (params: HistoryParams, token: string) =>
  apiGetBlob("/history/export.csv", {
    token,
    params: { ...params, signals: params.signals.join(",") },
  });

/** A plain sentence for a failed history call. */
export function historyErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return "Too many queries in a minute. Please wait a moment and try again.";
    if (e.status === 403) {
      const d = e.detail as { message?: string } | undefined;
      return d?.message || "This filter is not included in your plan.";
    }
    if (e.status === 404) return "The History Explorer is not available right now.";
    if (e.status === 400) return e.message;
  }
  return "Something went wrong. Please try again.";
}

// ---- stock-wise mode -------------------------------------------------------------------------------------------

export type StockwiseDirection = HistoryDirection;

export interface StockwiseParams {
  symbols: string[];
  move: number | null;
  direction: StockwiseDirection;
  period: "1y" | "2y" | "3y";
  offsets: number[];
  signals: string[];
  match: string;
  signal_offset: number;
  group: "stock" | "date";
  sort: "newest" | "largest";
}

export interface SessionState {
  key: string;
  label: string;
  on: boolean;
}

export interface SessionBlock {
  offset: number;
  status: "ok" | "na" | "pending";
  date?: string;
  weekday?: string;
  change_pct?: number | null;
  trend_10d?: number | null;
  volume_x?: number | null;
  rsi?: number | null;
  delivery_pct?: number | null;
  above_dma_sessions?: number | null;
  states?: SessionState[];
}

export interface StockwiseDay {
  symbol: string;
  date: string;
  weekday: string;
  move_pct: number;
  sessions: SessionBlock[];
}

export interface StockwiseStock {
  symbol: string;
  company_name: string;
  sessions: number;
  first_session: string | null;
  partial_period: boolean;
  count: number;
  up: number;
  down: number;
  with_readings: number | null;
  listed: number;
  days: StockwiseDay[];
  no_history?: boolean;
}

export interface StockwiseResult {
  as_of: string;
  period_start: string;
  stocks: StockwiseStock[];
  same_day_count: number | null;
  timeline: StockwiseDay[] | null;
  timeline_total: number | null;
  day_cap: number;
  params: StockwiseParams;
  access: HistoryAccess;
  max_stocks: number;
  ms: number;
}

export interface StockwiseConfig {
  max_stocks: number;
  periods: string[];
  offsets: [number, number];
  default_offsets: number[];
  day_cap: number;
  examples: { id: string; label: string; params: Partial<StockwiseParams> }[];
}

export const runStockwise = (body: Record<string, unknown>, opts?: FetchOpts) =>
  apiMutate<StockwiseResult>("/history/stockwise", "POST", body, opts);
export const saveStockwiseFilter = (name: string, params: StockwiseParams, opts?: FetchOpts) =>
  apiMutate<SavedFilter>("/history/saved", "POST", { name, kind: "stockwise", params }, opts);
export const downloadStockwiseCsv = (p: StockwiseParams, token: string) =>
  apiGetBlob("/history/stockwise.csv", {
    token,
    params: {
      symbols: p.symbols.join(","),
      move: p.move == null ? "any" : p.move,
      direction: p.direction,
      period: p.period,
      offsets: p.offsets.join(","),
      signals: p.signals.join(","),
      match: p.match,
      signal_offset: p.signal_offset,
      group: p.group,
      sort: p.sort,
    },
  });
