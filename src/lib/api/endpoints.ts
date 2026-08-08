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
  PeersResponse,
  ChartData,
  DailyBrief,
  NewsItem,
  BillingPlan,
  EducationContent,
  SectorSummary,
  TrackRecordSnapshot,
  TrackRecordSymbolHistory,
  AnomalyFlagDoc,
  AnomalyPageInfo,
  AnomalyType,
  AnomalyDirection,
  ApiMeta,
} from "./types";

// Every exported fetch function below MUST carry an `@auth public` or
// `@auth required` tag directly above it (checked by
// scripts/check-auth-fetch.mjs, run as part of `npm run build`) — this is
// the single source of truth for "does this endpoint's response depend on
// the caller's tier/identity", replacing what used to be inconsistent
// prose comments nobody could grep for. `@auth required` means every call
// site must pass `token` (or carry an explicit `// @auth-ok: <reason>`
// marker acknowledging a deliberately-anonymous call, e.g. an SSR fetch
// with a documented client-side correction, or a public SEO page). See
// that script's own header comment for the 4-occurrence bug history this
// exists to structurally prevent.

// ---------- market ----------

// @auth public — market/overview.py never reads `auth`.
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

// @auth required — B8 masks composite_score/etc. outside the free-tier
// unlocked sample; a missing token silently under-serves a paying user.
export const getSignals = (params: SignalsListParams = {}, opts?: FetchOpts) =>
  apiGetPaged<SignalRow>("/signals", { ...opts, params: { ...params, ...opts?.params } });

// @auth required (same as getSignals, which this wraps) —
// @auth-ok: SEO/export-only (sitemap.ts, /stocks/[symbol]), always
// anonymous by design — a shared/crawlable page must never carry a
// visitor's personal token.
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

// @auth public — signal_movers() accepts `auth` but never reads it;
// deliberately ungated for every tier (Home shows it to everyone).
export const getSignalMovers = (direction?: "up" | "down", limit = 20, opts?: FetchOpts) =>
  apiGet<SignalsMovers>("/signals/movers", { ...opts, params: { direction, limit } });

// @auth required — B8 masks the full detail for a locked symbol.
export const getSignalDetail = (symbol: string, newsLimit = 6, opts?: FetchOpts) =>
  apiGet<SignalDetail>(`/signals/${encodeURIComponent(symbol)}`, {
    ...opts,
    params: { news_limit: newsLimit },
  });

// ---------- intraday ----------

// @auth public — session_state() accepts `auth` but never reads it.
export const getIntradaySession = (opts?: FetchOpts) =>
  apiGet<IntradaySession>("/intraday/session", opts);

// @auth public — premarket() accepts `auth` but never reads it.
export const getIntradayPremarket = (
  params: { direction?: "up" | "down"; sort?: string; order?: string; page?: number; size?: number } = {},
  opts?: FetchOpts
) => apiGetPaged<PremarketRow>("/intraday/premarket", { ...opts, params });

// @auth public — sectors() accepts `auth` but never reads it.
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

// @auth public — scan() accepts `auth` but never reads it.
export const getIntradayScan = (params: IntradayScanParams = {}, opts?: FetchOpts) =>
  apiGet<IntradayScan>("/intraday/scan", { ...opts, params });

// @auth public — recap() accepts `auth` but never reads it.
export const getIntradayRecap = (date?: string, opts?: FetchOpts) =>
  apiGetOptional<IntradayRecap>("/intraday/recap", { ...opts, params: { date } });

// @auth required — backend route uses require_auth (401 without a real
// token, free + paid both allowed; watchlist SIZE is what's tier-capped,
// not this read).
export const getWatchlistStates = (opts?: FetchOpts) =>
  apiGet<WatchlistBehaviorRow[]>("/intraday/watchlist-states", opts);

// ---------- research ----------

// @auth public — search() accepts `auth` but never reads it (plain
// symbol/company-name lookup, identical for every caller).
export const searchResearch = (q: string, limit = 10, opts?: FetchOpts) =>
  apiGet<ResearchSearchRow[]>("/research/search", { ...opts, params: { q, limit } });

// @auth required — NOT data-masking (every tier gets the identical
// payload) but research() meters logged-in free users at 3 views/day
// (core/metering.py); an anonymous/no-token call is silently unmetered.
export const getResearch = (symbol: string, opts?: FetchOpts) =>
  apiGet<ResearchDetail>(`/research/${encodeURIComponent(symbol)}`, opts);

// @auth public — research_peers() accepts `auth` but never reads it.
export const getResearchPeers = (symbol: string, opts?: FetchOpts) =>
  apiGet<PeersResponse>(`/research/${encodeURIComponent(symbol)}/peers`, opts);

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

// @auth required — is_free_tier(auth.tier) applies a FREE_NEWS_DELAY_HOURS
// delay for free/anonymous callers (routers/news.py); a missing token
// silently imposes the free-tier delay on a paying subscriber. THIS IS
// THE EXACT ROUTE 3 of the 4 known auth-token bugs hit (Signals-paywall's
// sibling, News/Events staleness, Home's server-side news).
export const getNews = (params: NewsParams = {}, opts?: FetchOpts) =>
  apiGetPaged<NewsItem>("/news", { ...opts, params });

// ---------- charts ----------

// @auth public — charts.py has no auth dependency on this route at all.
export const getChart = (
  symbol: string,
  params: { interval?: string; from?: string; to?: string } = {},
  opts?: FetchOpts
) => apiGet<ChartData>(`/charts/${encodeURIComponent(symbol)}`, { ...opts, params });

// ---------- brief ----------

// @auth public — brief.py has no auth dependency on this route at all.
export const getLatestBrief = (opts?: FetchOpts) => apiGetOptional<DailyBrief>("/brief/latest", opts);

// ---------- billing (public) ----------

// @auth public — plan list is shown before login (pre-login checkout).
export const getBillingPlans = (opts?: FetchOpts) => apiGet<BillingPlan[]>("/billing/plans", opts);

// ---------- education (Task 12) — public, fetch-only, zero live LLM calls --

// @auth public — same content for every caller.
export const getEducation = (metric: string, opts?: FetchOpts) =>
  apiGetOptional<EducationContent>(`/education/${encodeURIComponent(metric)}`, opts);

// @auth public — summary_sectors() accepts `auth` but never reads it.
export const getSectorSummary = (opts?: FetchOpts) => apiGet<SectorSummary>("/summary/sectors", opts);

// ---------- track record (Task 15) — public, no auth ----------

// @auth public
export const getTrackRecord = (opts?: FetchOpts) => apiGet<TrackRecordSnapshot>("/track-record", opts);

// @auth public
export const getTrackRecordSymbol = (symbol: string, opts?: FetchOpts) =>
  apiGet<TrackRecordSymbolHistory>(`/track-record/${encodeURIComponent(symbol)}`, opts);

// ---------- anomalies (Task 16 Part C) — public, no auth, full-universe,
// disclosed-criteria, symmetric (never only the "up" side) ----------

export interface AnomalyListParams {
  type?: AnomalyType;
  direction?: AnomalyDirection;
  page?: number;
  size?: number;
}

export interface AnomalyListResult {
  meta: ApiMeta;
  data: AnomalyFlagDoc[];
  page_info: AnomalyPageInfo;
}

// @auth public — market_anomalies() accepts `auth` but never reads it
// (the separate, genuinely tier-gated /anomalies/watchlist route lives in
// mutations.ts instead, since it requires a mandatory token parameter).
export async function getAnomalies(params: AnomalyListParams = {}, opts?: FetchOpts): Promise<AnomalyListResult> {
  const env = await apiGetPaged<AnomalyFlagDoc>("/anomalies", { ...opts, params });
  // page_info carries `scan`/`date` at runtime (see routers/anomalies.py) —
  // PagedEnvelope's generic PageInfo type just doesn't declare those extra
  // keys, so this cast reflects the real, verified response shape.
  return env as unknown as AnomalyListResult;
}
