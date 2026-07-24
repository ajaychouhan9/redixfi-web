import { apiGet, apiGetPaged, apiGetOptional, type FetchOpts } from "./client";
import type {
  MarketOverview,
  SignalRow,
  SignalsMovers,
  SignalDetail,
  IntradaySession,
  PremarketRow,
  IntradaySectors,
  IntradayScan,
  IntradayRecap,
  WatchlistBehaviorRow,
  ResearchSearchRow,
  ResearchDetail,
  ChartData,
  DailyBrief,
  NewsItem,
  BillingPlan,
} from "./types";

// ---------- market ----------

export const getMarketOverview = (opts?: FetchOpts) =>
  apiGet<MarketOverview>("/market/overview", opts);

// ---------- signals ----------

export interface SignalsListParams {
  sector?: string;
  score_min?: number;
  score_max?: number;
  event_risk?: boolean;
  q?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  size?: number;
}

export const getSignals = (params: SignalsListParams = {}, opts?: FetchOpts) =>
  apiGetPaged<SignalRow>("/signals", { ...opts, params: { ...params, ...opts?.params } });

/** Pages through the full universe (~751 symbols) for SEO/export use only — not for live UI lists. */
export async function getAllSignals(opts?: FetchOpts): Promise<SignalRow[]> {
  const size = 200;
  const first = await getSignals({ page: 1, size, sort: "name", order: "asc" }, opts);
  const total = first.page_info.total;
  const pages = Math.ceil(total / size);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
      getSignals({ page: i + 2, size, sort: "name", order: "asc" }, opts)
    )
  );
  return [first, ...rest].flatMap((p) => p.data);
}

export const getSignalMovers = (direction?: "up" | "down", limit = 20, opts?: FetchOpts) =>
  apiGet<SignalsMovers>("/signals/movers", { ...opts, params: { direction, limit } });

export const getSignalDetail = (symbol: string, newsLimit = 6, opts?: FetchOpts) =>
  apiGet<SignalDetail>(`/signals/${encodeURIComponent(symbol)}`, {
    ...opts,
    params: { news_limit: newsLimit },
  });

// ---------- intraday ----------

export const getIntradaySession = (opts?: FetchOpts) =>
  apiGet<IntradaySession>("/intraday/session", opts);

export const getIntradayPremarket = (
  params: { direction?: "up" | "down"; sort?: string; order?: string; page?: number; size?: number } = {},
  opts?: FetchOpts
) => apiGetPaged<PremarketRow>("/intraday/premarket", { ...opts, params });

export const getIntradaySectors = (opts?: FetchOpts) =>
  apiGet<IntradaySectors>("/intraday/sectors", opts);

export interface IntradayScanParams {
  min_volume_ratio?: number;
  vwap_side?: "above" | "below";
  range_state?: string;
  sector?: string;
  min_day_pct?: number;
  max_day_pct?: number;
  page?: number;
  size?: number;
}

export const getIntradayScan = (params: IntradayScanParams = {}, opts?: FetchOpts) =>
  apiGet<IntradayScan>("/intraday/scan", { ...opts, params });

export const getIntradayRecap = (date?: string, opts?: FetchOpts) =>
  apiGetOptional<IntradayRecap>("/intraday/recap", { ...opts, params: { date } });

// Auth required (free + paid) — caller must pass a token via opts.
export const getWatchlistStates = (opts?: FetchOpts) =>
  apiGet<WatchlistBehaviorRow[]>("/intraday/watchlist-states", opts);

// ---------- research ----------

export const searchResearch = (q: string, limit = 10, opts?: FetchOpts) =>
  apiGet<ResearchSearchRow[]>("/research/search", { ...opts, params: { q, limit } });

export const getResearch = (symbol: string, opts?: FetchOpts) =>
  apiGet<ResearchDetail>(`/research/${encodeURIComponent(symbol)}`, opts);

// ---------- news ----------

export interface NewsParams {
  symbol?: string;
  scope?: string;
  severity?: string;
  today?: boolean;
  intraday?: boolean;
  page?: number;
  size?: number;
}

export const getNews = (params: NewsParams = {}, opts?: FetchOpts) =>
  apiGetPaged<NewsItem>("/news", { ...opts, params });

// ---------- charts ----------

export const getChart = (
  symbol: string,
  params: { interval?: string; from?: string; to?: string } = {},
  opts?: FetchOpts
) => apiGet<ChartData>(`/charts/${encodeURIComponent(symbol)}`, { ...opts, params });

// ---------- brief ----------

export const getLatestBrief = (opts?: FetchOpts) => apiGetOptional<DailyBrief>("/brief/latest", opts);

// ---------- billing (public) ----------

export const getBillingPlans = (opts?: FetchOpts) => apiGet<BillingPlan[]>("/billing/plans", opts);
