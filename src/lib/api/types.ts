// Types mirror the LIVE API at https://api.redixfi.com/api/v1, verified by
// sampling every endpoint (see docs/openapi-reference.json for the schema
// dump). Several fields diverge from the screen spec's approximations —
// those deviations are intentional, not typos.

export interface ApiMeta {
  generated_at: string;
  data_fresh: boolean;
  ra_mode: boolean;
  // Task 10 A3 — evening-cadence freshness specifically for measured_signals
  // (measured_signals now runs 16:30, after close, not 07:50 before open).
  // Separate from data_fresh, which stays the general feed watchdog signal.
  signals_data_fresh?: boolean;
  signals_as_of?: string | null;
}

export interface ApiEnvelope<T> {
  meta: ApiMeta;
  data: T;
}

export interface PageInfo {
  page: number;
  size: number;
  total: number;
}

export interface PagedEnvelope<T> {
  meta: ApiMeta;
  data: T[];
  page_info: PageInfo;
}

// ---------- market ----------

export interface IndexQuote {
  close: number;
  change_pct: number;
}

export interface NewsToday {
  items_read: number;
  items_flagged: number;
  items_flagged_high: number;
}

export interface MarketOverview {
  market_state: "OPEN" | "CLOSED" | "PRE-OPEN" | string;
  as_of_date: string;
  nifty: IndexQuote;
  banknifty: IndexQuote;
  sectors_up: number;
  sectors_down: number;
  fii_net: number;
  dii_net: number;
  india_vix_change_pct: number;
  us_vix_change_pct: number;
  news_today: NewsToday;
}

// ---------- signals ----------

export interface SignalRow {
  symbol: string;
  company_name: string;
  sector: string;
  // Industry peer-group name (same field GET /signals/{symbol} already
  // exposes) — added 2026-08-08 so the CSV export can include it without
  // a second per-symbol fetch. Identity-level, never masked.
  industry: string | null;
  market_cap: number | null;
  // Basic market data (publicly-known, not a derived signal) — same
  // "identity-level, never masked by B8" category as market_cap above.
  // Restored 2026-08-08 (bug: dropped from every Signals response).
  last_price: number | null;
  day_change_pct: number | null;
  // VWAP removed from the LIST row 2026-08-08 (same-day correction —
  // intraday-only concept, wrong fit for this evening/post-close list;
  // still present on SignalDetail below, unaffected).
  has_score: boolean;
  date: string | null;
  composite_score: number | null;
  delta_1d: number | null;
  delta_5d: number | null;
  delivery_pct: number | null;
  delivery_avg20: number | null;
  sector_rank: number | null;
  sector_count: number | null;
  volume_ratio_5d: number | null;
  signal_states: string[];
  event_risk: boolean | null;
  // Task 16 Part C — written by data-pipeline/anomaly_detector.py directly
  // onto the measured_signals doc this row is joined from.
  anomaly_flags: AnomalyItem[];
  locked: boolean;
}

export interface MoverRow {
  symbol: string;
  company_name: string;
  composite_score: number;
  delta_1d: number;
  cause: string;
}

export interface SignalsMovers {
  up: MoverRow[];
  down: MoverRow[];
}

export interface SignalDetailSignals {
  trend_10d_pct: number;
  above_dma20_sessions: number;
  sector_rank: number;
  sector_count: number;
  delivery_pct: number;
  delivery_avg20: number;
  fii_net_buy_days_5: number;
  pcr: number;
  pcr_available: boolean;
  volume_ratio_5d: number;
  rsi_14: number;
  pledge_pct: number;
  pledge_trend: string;
  insider_net_30d: number;
  event_risk_5d: boolean;
  event_categories: string[];
}

export interface ChangeLogEntry {
  symbol: string;
  date: string;
  delta: number;
  changed_signal: string;
  note: string;
  state: string;
  flip: "appeared" | "cleared" | string;
  created_at: string;
}

export interface NewsEntity {
  symbol: string;
  name: string;
  match_score: number;
  sentiment: number;
  industry: string;
}

export interface NewsItem {
  uuid: string;
  category: "promoter_legal" | "short_seller_report" | "regulatory" | "macro" | "sector_policy" | "corporate_action" | "none" | string;
  description: string;
  entities: NewsEntity[];
  headline: string;
  high_priority: boolean;
  impact: "positive" | "negative" | "uncertain" | string;
  matched_symbols?: string[];
  published_at: string;
  scope: "stock" | "group" | "sector" | "market" | null;
  severity: "none" | "low" | "medium" | "high" | string;
  source: string;
  url: string;
}

// ---------- education (Task 12) ----------

export interface ComponentChange {
  signal: string;
  direction: "up" | "down" | "flat" | string;
  note: string;
}

export interface ChangeCause {
  headline: string;
  category: string;
  severity: string;
  scope: string | null;
}

// The causal-question rule's shape: `descriptive` is always present;
// `cause` is populated ONLY when a real classified news event matched this
// stock on this exact date — otherwise it's null and `note` carries the
// honest "several explanations are possible" line. Never both null+null.
export interface ChangeExplanation {
  descriptive: string;
  cause: ChangeCause | null;
  cause_available: boolean;
  note: string | null;
}

export interface InsightChip {
  type: "computed_fact" | "entry_point";
  metric: string;
  text: string;
  faq_id?: string;
}

export interface SignalDetail {
  symbol: string;
  company_name: string;
  sector: string;
  // Ranking peer-group name for signals.sector_rank/sector_count — an
  // INDUSTRY classification, distinct from `sector` (a broad index
  // grouping like "NIFTY ENERGY"). Null when no industry classification
  // is on file yet for this stock (Task 09 backfill pending); rank/count
  // are null in lockstep in that case.
  industry: string | null;
  isin: string;
  date: string;
  // Same restoration as SignalRow above — never masked when locked.
  last_price: number | null;
  day_change_pct: number | null;
  vwap: number | null;
  composite_score: number;
  delta_1d: number;
  delta_5d: number;
  signals: SignalDetailSignals;
  signal_states: string[];
  conflicts: SignalConflict[];
  narrative: string;
  narrative_model: string;
  change_log: ChangeLogEntry[];
  news: NewsItem[];
  component_changes: ComponentChange[];
  change_explanation: ChangeExplanation;
  insight_chips: InsightChip[];
  locked?: boolean;
  // Bug 2/3 fix (2026-08-22): distinguishes "not yet scored" (a real
  // symbols_master member with no measured_signals doc — locked is false,
  // every other field below is absent) from a genuine tier lock (locked
  // true) and from a full unlocked result (both true) — see
  // SignalUnlockGate.tsx / signals/[symbol]/page.tsx for the two
  // narrower response shapes this covers.
  has_score?: boolean;
}

export interface EducationFaqNode {
  id: string;
  q: string;
  a: string;
  suggests: string[];
}

export interface EducationDeeper {
  what: string;
  why_traders_watch: string;
  how_calculated: string;
  historical_pattern: string | null;
  current_state: string | null;
}

export interface EducationContent {
  metric: string;
  label: string;
  short: string;
  deeper: EducationDeeper;
  faq: EducationFaqNode[];
  example: string | null;
  version: string;
  reviewed_date: string;
}

export interface WatchlistSummary {
  summary: string;
  strengthened: string[];
  weakened: string[];
  unchanged: string[];
  unscored: string[];
}

export interface SectorSummaryRow {
  sector: string;
  avg_delta: number;
  count: number;
}

export interface SectorSummary {
  summary: string;
  ranked: SectorSummaryRow[];
}

export interface SignalConflict {
  text: string;
  [key: string]: unknown;
}

export interface SmartScreenFilters {
  sector: string | null;
  score_min: number | null;
  score_max: number | null;
  delta_1d_min: number | null;
  delivery_state: string | null;
  vwap_side: string | null;
  volume_ratio_min: number | null;
  dma_state: string | null;
  pcr_band: string | null;
  event_risk: boolean | null;
  anomaly: boolean | null;
  watchlist_only: boolean | null;
}

// ---------- Task 13: compare intent ----------

export interface CompareCompany {
  symbol: string;
  company_name: string | null;
  sector: string | null;
  has_score: boolean;
  has_fundamentals: boolean;
  locked: boolean;
}

export interface CompareRow {
  key: string;
  label: string;
  layer: "measured" | "derived";
  metric_key: string;
  // Keyed by symbol, in the same order as CompareResult.symbols. Every
  // value is already a formatted display string — "Not available" for
  // anything missing/masked, never a raw null the UI has to reformat.
  values: Record<string, string>;
}

export interface CompareUnresolved {
  input: string;
  suggestions: string[];
}

export interface CompareBiggestDifference {
  key: string;
  label: string;
  text: string;
  values: Record<string, string>;
}

export interface CompareResult {
  symbols: string[];
  companies: Record<string, CompareCompany>;
  unresolved: CompareUnresolved[];
  rows: CompareRow[];
  biggest_differences: CompareBiggestDifference[];
  // Additive (2026-08-06) — real composite_score history per symbol
  // (core/signals_view.py::score_history), keyed by symbol. A locked
  // symbol is OMITTED from this map entirely (B8 masking parity with
  // `rows`' own measured-layer masking), never a partial/teaser series.
  score_history: Record<string, ScoreHistoryPoint[]>;
}

export interface SmartScreenResult {
  query: string;
  intent: "screen" | "compare";
  refused: boolean;
  message: string | null;
  parsed_filters: SmartScreenFilters | null;
  results: SignalRow[];
  result_count: number;
  compare: CompareResult | null;
}

// ---------- intraday ----------

export interface IntradaySession {
  state: "premarket" | "live" | "postmarket" | string;
  risk_off: boolean;
  high_severity_events_today: number;
  india_vix_change_pct: number;
}

export interface PremarketRow {
  symbol: string;
  gap_direction: "UP" | "DOWN" | string;
  gap_pct: number;
  premarket_bucket: string;
  premarket_tags: string[];
  preopen_qty: number;
}

export interface SectorMomentum {
  sector: string;
  close: number;
  change_1d_pct: number;
  momentum_5d_pct: number;
}

export interface IntradaySectors {
  as_of_date: string;
  momentum_window_days: number;
  sectors: SectorMomentum[];
}

export interface ScanRow {
  symbol: string;
  sector: string;
  last_price: number;
  day_pct: number;
  volume_ratio: number;
  vwap: number;
  vwap_side: "above" | "below" | string;
  range_state: string;
}

export interface IntradayScan {
  universe_count: number;
  criteria: string;
  scan_date: string;
  has_candle_data: boolean;
  results: ScanRow[];
}

export interface RecapMoverRow {
  symbol: string;
  name: string;
  pct: number;
  volume_ratio: number;
}

export interface SectorPct {
  name: string;
  pct: number;
}

export interface IntradayRecap {
  date: string;
  advancers: number;
  decliners: number;
  unchanged: number;
  market_line: string;
  sector_leaders: SectorPct[];
  sector_laggards: SectorPct[];
  top_gainers: RecapMoverRow[];
  top_losers: RecapMoverRow[];
  volume_anomalies: RecapMoverRow[];
  event_flagged: unknown[];
  builder_version: string;
  created_at: string;
}

// Matches the live GET /intraday/watchlist-states response (verified
// against alert_worker.classify_behavior(), which the route reuses
// unchanged) — NOT the screen spec's approximation. classify_behavior()
// only ever returns "sustaining" | "fading" | null (-> "no_data" here);
// "reversed" is prose in the screen spec, not a value this route
// produces — never render it as a possible state.
export interface WatchlistBehaviorRow {
  symbol: string;
  company_name: string | null;
  state: "sustaining" | "fading" | "no_data" | string;
  since_time: string | null;
  last_price: number | null;
  day_pct: number | null;
}

// ---------- research ----------

export interface ResearchSearchRow {
  canonicalSymbol: string;
  company_name: string;
  isin: string;
  sector_index: string;
}

export interface PricePoint {
  last_price: number;
  day_change_pct: number;
  week52_high: number;
  week52_low: number;
  week52_position_pct: number;
}

export interface DeliveryPoint {
  date: string;
  delivery_pct: number;
}

export interface InsiderTrade {
  filing_id: string;
  classification_flag: string;
  company_name: string;
  disclosure_type: string;
  filing_timestamp: string;
  insider_name: string;
  isin: string;
  parsed_at: string;
  post_holding_shares: number | null;
  price_implied: number | null;
  purpose: string;
  quantity: number;
  raw_data: Record<string, unknown>;
  relation: string;
  source_url: string;
  symbol: string;
  trade_date: string;
  transaction_type: string;
  value_amount: number;
}

export interface PledgeHistoryPoint {
  quarter: string;
  symbol: string;
  as_of_date: string;
  canonicalSymbol: string;
  company_name: string;
  fetched_at: string;
  pledged_pct: number;
  risk_level: string;
  source: string;
  // Absent/null when there's no prior-quarter record to compare against
  // (confirmed live: some pledge_history docs omit these entirely).
  pledge_change?: number | null;
  pledge_trend?: string | null;
  prev_pledged_pct?: number | null;
  risk_signal?: string | null;
  trend_updated_at?: string | null;
}

export interface OptionsPcrPoint {
  symbol: string;
  timestamp: string;
  ce_oi_change: number;
  ce_resistance: number;
  expiry: string;
  fetched_at: string;
  last_price: number;
  max_pain: number;
  pcr: number;
  pcr_vol: number;
  pe_oi_change: number;
  pe_support: number;
  source: string;
  total_ce_oi: number;
  total_ce_vol: number;
  total_pe_oi: number;
  total_pe_vol: number;
}

// bulk_block_deals / corporate_events are sparse in live data (verified
// empty across several symbols) — kept generic rather than guessed, and
// rendered defensively in the UI.
export type GenericRecord = Record<string, unknown>;

export interface ResearchSignalSummary {
  composite_score: number | null;
  delta_1d: number | null;
  narrative: string | null;
}

// ---------- fundamentals (Task 09) ----------
// Derived-only shapes — the API never serves fundamentals_raw directly,
// and neither of these types has any analyst-rating field: there isn't
// one to strip client-side, because fundamentals_derived_builder.py never
// writes analystView/recosBar/stockAnalyst/overallRating/averageRating
// into fundamentals_derived in the first place (see that builder's
// compliance boundary docstring).

export interface FundamentalsQuarterlyPoint {
  quarter_end: string;
  revenue: number | null;
  pat: number | null;
  opm_pct: number | null;
  eps: number | null;
}

export interface FundamentalsQuarterly {
  latest_quarter_end: string | null;
  revenue: number | null;
  revenue_yoy_pct: number | null;
  revenue_qoq_pct: number | null;
  revenue_accel_quarters: number;
  pat: number | null;
  pat_yoy_pct: number | null;
  opm_pct: number | null;
  opm_yoy_bps_change: number | null;
  opm_vs_8q_avg: "above" | "below" | "inline" | null;
  eps: number | null;
  eps_trend: "improving" | "declining" | "stable" | null;
  series_8q: FundamentalsQuarterlyPoint[];
}

export interface FundamentalsAnnualPoint {
  fiscal_year: string | null;
  revenue: number | null;
  pat: number | null;
  opm_pct: number | null;
  eps: number | null;
}

export interface FundamentalsAnnual {
  series_5y: FundamentalsAnnualPoint[];
  revenue_cagr_3y_pct: number | null;
  pat_cagr_3y_pct: number | null;
}

export interface FundamentalsBalance {
  debt_to_equity: number | null;
  book_value_per_share: number | null;
  current_ratio: number | null;
  shares_outstanding: number | null;
}

export interface FundamentalsCashflow {
  ocf_latest: number | null;
  capex_latest: number | null;
  fcf_latest: number | null;
  fcf_positive_years_5: number;
}

export interface FundamentalsValuation {
  pe_ttm: number | null;
  pb: number | null;
  // net_margin_ttm/roe_ttm/debt_to_equity: computed by fundamentals_
  // derived_builder.py's compute_valuation_extras() from data it already
  // parses (quarterly TTM sums, balance sheet) — indianapi's own payload
  // has no top-level equivalent of these three for the subject stock
  // (only per-peer, inside peerCompanyList[]). Same field names peer rows
  // (PeerRow below) use, so the "this stock" row in the peer-comparison
  // table can render identically to a peer row instead of showing "—".
  net_margin_ttm: number | null;
  roe_ttm: number | null;
  debt_to_equity: number | null;
  sector_pe: number | null;
  pe_vs_sector: "above" | "below" | "inline" | null;
  dividend_yield_pct: number | null;
}

export interface FundamentalsShareholdingSeriesPoint {
  date: string;
  promoter: number | null;
  fii: number | null;
  mf: number | null;
  other: number | null;
}

export interface FundamentalsShareholding {
  latest_date: string | null;
  promoter_pct: number | null;
  promoter_change_qoq: number | null;
  promoter_streak: string | null;
  fii_pct: number | null;
  fii_change_qoq: number | null;
  fii_streak: string | null;
  mf_pct: number | null;
  mf_change_qoq: number | null;
  mf_streak: string | null;
  series_4q: FundamentalsShareholdingSeriesPoint[];
}

export interface FundamentalsIdentity {
  industry: string | null;
  isin: string | null;
  market_cap: number | null;
  risk_category: string | null;
  volatility_stddev: number | null;
}

export interface FundamentalsDividend {
  record_date: string | null;
  value: number | null;
  percentage: number | null;
}

export interface FundamentalsCorporateActionNote {
  record_date: string | null;
  remarks: string | null;
}

export interface FundamentalsEvents {
  next_results_date: string | null;
  recent_dividends: FundamentalsDividend[];
  recent_bonus: FundamentalsCorporateActionNote[];
  recent_splits: FundamentalsCorporateActionNote[];
}

export interface FundamentalsBlock {
  symbol: string;
  as_of: string;
  identity: FundamentalsIdentity;
  quarterly: FundamentalsQuarterly;
  annual: FundamentalsAnnual;
  balance: FundamentalsBalance;
  cashflow: FundamentalsCashflow;
  valuation: FundamentalsValuation;
  shareholding: FundamentalsShareholding;
  events: FundamentalsEvents;
  flags: string[];
  coverage: { has_quarterly: boolean; has_peers: boolean; has_shareholding: boolean; parse_warnings: string[] };
}

export interface PeerRow {
  company_name: string | null;
  pe: number | null;
  pb: number | null;
  market_cap: number | null;
  net_margin_ttm: number | null;
  roe_ttm: number | null;
  debt_to_equity: number | null;
  dividend_yield: number | null;
  percent_change: number | null;
  yhigh: number | null;
  ylow: number | null;
}

export interface PeersResponse {
  symbol: string;
  // Same field set as PeerRow (minus company_name/percent_change/yhigh/
  // ylow — identity + price-history fields out of this route's scope,
  // see api/app/routers/research.py::PEER_COMPARISON_FIELDS) — the web
  // app doesn't currently render this "self" block (it builds the
  // subject's own peer-table row from FundamentalsBlock.valuation
  // instead, see FundamentalsPanels.tsx), but the shape is kept accurate
  // for other/future consumers of this endpoint.
  self: {
    pe: number | null;
    pb: number | null;
    market_cap: number | null;
    net_margin_ttm: number | null;
    roe_ttm: number | null;
    debt_to_equity: number | null;
    dividend_yield: number | null;
    sector_pe: number | null;
  } | null;
  peers: PeerRow[];
}

// Task 21 Phase C — recent concall transcript / investor presentation
// summaries. RedixFi-generated (data-pipeline/concall_summarizer.py);
// tone_label describes only the language used in that document, never a
// signal on the stock. No B8 masking on this block — /research/{symbol}'s
// whole payload is already identical for every tier (see the backend's
// own research() comment).
export interface ConcallTranscript {
  filing_date: string;
  subject: "EARNINGS_CALL_TRANSCRIPT" | "INVESTOR_PRESENTATION";
  summary: string;
  tone_label: "Positive" | "Neutral" | "Negative" | "Mixed";
  tone_note: string;
  source_pdf_url: string;
}

// Annual report AI summary card (mirrors ConcallTranscript above — same
// category of exchange-filed qualitative disclosure, same "no B8 masking"
// posture: /research/{symbol}'s whole payload is identical for every
// tier). One per symbol (annual_report_api.py's unique index on `symbol`),
// so the backend returns a single object or null, not an array.
// `compliance_note` is the backend's own ANNUAL_REPORT_COMPLIANCE_NOTE
// constant (core/document_retrieval.py) passed through verbatim — reused,
// not re-authored client-side, so the disclaimer can never drift from the
// wording already established for the RAG prompt path.
export interface AnnualReportSummary {
  fiscal_year: string;
  page_count: number;
  filing_date: string;
  source_pdf_url: string;
  summary: string;
  bullets: string[];
  key_takeaway: string;
  compliance_note: string;
}

export interface ResearchDetail {
  symbol: string;
  company_name: string;
  sector: string;
  isin: string;
  price: PricePoint;
  delivery_30d: DeliveryPoint[];
  insider_trades: InsiderTrade[];
  bulk_block_deals: GenericRecord[];
  pledge_history: PledgeHistoryPoint[];
  options_pcr_history: OptionsPcrPoint[];
  corporate_events: GenericRecord[];
  news: NewsItem[];
  signal_summary: ResearchSignalSummary;
  fundamentals: FundamentalsBlock | null;
  concall_transcripts: ConcallTranscript[];
  annual_report_summary: AnnualReportSummary | null;
}

// ---------- charts ----------

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartData {
  symbol: string;
  interval: string;
  candles: Candle[];
}

// ---------- brief ----------

// Field names verified directly against data-pipeline/daily_brief_builder.py's
// own written doc shape (Bug 1 fix: this type previously declared a
// `brief_text` field that never existed on the real document — the API
// call succeeded and returned real data, but every reader of this type
// silently rendered `undefined`, showing as a blank AI Daily Brief card
// rather than an error). `stat_of_the_day` is NOT a separate field either —
// the builder appends it directly into `body` before saving.
export interface DailyBrief {
  date: string;
  period: "morning" | "close" | string;
  title: string;
  body: string;
  model: string;
  builder_version: string;
  created_at: string;
  [key: string]: unknown;
}

// ---------- billing ----------

export interface BillingPlan {
  plan: string;
  amount_rupees: number;
  period_days: number;
  // Multi-tier restructure (2026-08-08) — "paid" is retired (see
  // app_models.py's Tier docstring); kept in the union for the same
  // reason it's kept there, not because GET /billing/plans can still
  // return it (retired plans are filtered out server-side).
  tier: "free" | "basic" | "pro" | "paid" | "founding" | string;
  founding_slots_remaining?: number;
}

export interface BillingOrder {
  // Absent on a free_checkout response (see below) — Razorpay never opens,
  // so there's no order to hand it.
  order_id?: string;
  amount_paise: number;
  currency?: string;
  razorpay_key_id?: string;
  discount_pct?: number | null;
  discount_type?: "percentage" | "flat" | null;
  discount_value?: number | null;
  // 100%-off (or near-enough) promo bypass: the backend skips Razorpay
  // entirely and activates the subscription synchronously, so this
  // response carries the SAME shape as BillingVerifyResult below instead
  // of order_id/razorpay_key_id. When this is true, the caller must skip
  // openRazorpayCheckout() and treat the purchase as already complete.
  free_checkout?: boolean;
  success?: boolean;
  subscription_id?: string;
  tier?: string;
  founding_number?: number | null;
  scheduled?: boolean;
  effective_date?: string;
  [key: string]: unknown;
}

// Addon-promo extension (2026-08-21) — POST /ask/topup/order's response.
// Mirrors BillingOrder's own order-vs-free_checkout shape (see that
// interface's comments for the full reasoning) but topup-specific:
// `questions`/`topup_questions_remaining` instead of a subscription id/
// tier, since a topup purchase tops up a running balance, not a plan.
export interface TopupOrder {
  order_id?: string;
  amount_paise: number;
  currency?: string;
  questions: number;
  razorpay_key_id?: string;
  discount_pct?: number | null;
  discount_type?: "percentage" | "flat" | null;
  discount_value?: number | null;
  // 100%-off (or near-enough) promo bypass — same Razorpay-skip pattern as
  // BillingOrder.free_checkout; when true, `topup_questions_remaining` is
  // already the POST-purchase balance, and the caller must skip
  // openRazorpayCheckout() entirely.
  free_checkout?: boolean;
  topup_questions_remaining?: number;
}

// Task 20 Part B — real shape of POST /billing/verify's response, distinct
// from the older, loosely-typed `{ ok: boolean }` other callers use (that
// field never actually existed on the wire — the real key is `success` —
// but nothing previously read it, so it never surfaced as a bug).
export interface BillingVerifyResult {
  success: boolean;
  subscription_id: string;
  tier: string;
  founding_number: number | null;
  scheduled: boolean;
  effective_date?: string;
}

export interface PendingPlanChange {
  to_plan: string;
  to_subscription_id: string;
  effective_date: string;
  purchased_at: string;
}

export interface PromoValidation {
  valid: boolean;
  discount_pct: number | null;
  discount_type?: "percentage" | "flat" | null;
  discount_value?: number | null;
  final_amount_paise?: number | null;
  message: string;
}

// ---------- promo-code admin (/admin/promo-codes) ----------

export interface PromoCodeAdmin {
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  applies_to: string[];
  max_redemptions: number | null;
  one_use_per_user: boolean;
  valid_till: string | null;
  active: boolean;
  redeemed_count: number;
  redeemed_by: string[];
  channel_tag: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

// ---------- me / account ----------

export interface SubscriptionState {
  plan: string | null;
  started: string | null;
  renews: string | null;
  status: "none" | "active" | "cancelled" | string;
}

export interface AlertPreferences {
  watchlist: boolean;
  market_wide: boolean;
  daily_brief: boolean;
}

// ---------- threshold alerts (2026-08-08, locked spec) ----------
// Distinct from AlertPreferences above (broadcast-style opt-in toggles
// for the 5 existing B4 triggers) — these are user-DEFINED per-symbol
// price/score/delivery/volume thresholds, additive, not a replacement.

export type AlertMetric = "price" | "score" | "delivery" | "volume";
export type AlertDirection = "above" | "below";

export interface AlertRule {
  rule_id: string;
  user_id: string;
  symbol: string;
  metric: AlertMetric;
  direction: AlertDirection;
  target_value: number;
  active: boolean;
  armed: boolean;
  created_at: string;
  last_fired_at: string | null;
  /** Latest measured value for this rule's (symbol, metric) — server-computed, for display only. */
  current_value: number | null;
}

export interface AlertCapabilities {
  max_active_alerts: number | null;
  alertable_metrics: AlertMetric[];
  delivery_channels: ("inbox" | "email" | "push")[];
}

export interface AlertRulesList {
  rules: AlertRule[];
  active_count: number;
  capabilities: AlertCapabilities;
}

export interface MeProfile {
  user_id: string;
  phone: string | null;
  name: string | null;
  email: string | null;
  tier: "free" | "basic" | "pro" | "paid" | "founding" | string;
  subscription: SubscriptionState;
  // Task 20 Part B — set only while a monthly->annual upgrade is
  // SCHEDULED (payment captured, not yet active). null otherwise.
  pending_plan_change: PendingPlanChange | null;
  kyc_status: string;
  tnc_accepted_at: string | null;
  alerts_opt_in: AlertPreferences;
  // "Always allow" opt-out session (2026-08-21) — "Don't ask me again" on
  // the Ask-RedixFi heavy-question (weight>=2) confirm dialog, persisted
  // per-account (routers/me.py::PATCH /me/ask-preferences). `false` for
  // every account by default and for every account that predates this
  // field (server-side `.get(..., False)`) — opt-in only, never defaults
  // to skipping.
  ask_skip_confirm: boolean;
  created_at: string;
}

export interface WatchlistResponse {
  symbols: string[];
  limit: number;
}

// Weighted-credit system — shape of GET /me/usage's `ask_redixfi` block
// (core/metering.py::ask_usage_snapshot). `daily_used`/`monthly_used` are
// already the SUM of weighted deductions, not a plain message count — the
// server does the weighting, this is just a read-only mirror of it. Free
// tier reports the per-symbol boolean gate instead (daily_limit_per_symbol
// set, daily_limit/monthly_limit null) — that gate is never weighted.
export interface AskUsageInfo {
  tier: string;
  daily_limit_per_symbol: number | null;
  daily_used: number | null;
  daily_limit: number | null;
  monthly_used: number | null;
  monthly_limit: number | null;
  topup_questions_remaining: number;
}

export interface UsageInfo {
  research_views_used?: number;
  research_views_remaining: number;
  unlimited: boolean;
  ask_redixfi: AskUsageInfo;
}

export interface InboxAlert {
  alert_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  // Real field on the stored doc (users_repo.py::push_inbox_alert) — null
  // for market/day-level alerts (daily_brief, news_market) that aren't
  // about one stock; present for the other 3 trigger types (signal_delta,
  // news_watchlist, behavior_state).
  symbol?: string | null;
  [key: string]: unknown;
}

// ---------- track record (Task 15) ----------
// Every published percentage on this page MUST render alongside its own
// `n` and the snapshot's `date_range` — never standalone (task doc's own
// non-negotiable compliance guardrail). null fields are the HONEST "not
// enough history yet" state, not a fetch failure — render "Not available",
// never a fabricated 0%.

export interface TrackRecordDateRange {
  from: string;
  to: string;
}

export interface TrackRecordBucket {
  band: string;
  score_min: number;
  score_max: number;
  n: number;
  pct_beat_sector_median: number | null;
  avg_relative_return_pct: number | null;
  low_sample: boolean;
}

export interface TrackRecordSnapshot {
  publish_date: string;
  published_at: string;
  builder_version: string;
  window_sessions: number;
  buckets: TrackRecordBucket[];
  total_observations: number;
  date_range: TrackRecordDateRange | null;
  // Covers ALL scored dates, including ones too recent for a complete
  // forward outcome — lets the UI explain an empty/thin study honestly.
  earliest_measured_date: string | null;
  latest_measured_date: string | null;
}

export interface SignalCrossing {
  symbol: string;
  threshold: number;
  crossing_side: "above" | "below";
  crossing_date: string;
  sector_index: string | null;
  window_sessions: number;
  outcome_status: "observed" | "pending";
  relative_return_pct: number | null;
  beat_sector_median: boolean | null;
}

export interface SignalChangeLogEntry {
  symbol: string;
  date: string;
  delta: number;
  changed_signal: string;
  note: string;
  state: string | null;
  flip: "appeared" | "cleared" | null;
}

export interface TrackRecordSymbolHistory {
  symbol: string;
  company_name: string | null;
  sector_index: string | null;
  crossings: SignalCrossing[];
  change_log: SignalChangeLogEntry[];
}

// ---------- Task 16 Part A: personalized portfolio brief ----------

export interface PortfolioBriefMover {
  symbol: string;
  delta_1d: number;
  note: string | null;
}

export interface PortfolioBrief {
  user_id: string;
  date: string;
  title: string;
  body: string;
  symbol_count: number;
  strengthened: string[];
  weakened: string[];
  unchanged: string[];
  unscored: string[];
  biggest_movers: PortfolioBriefMover[];
}

// ---------- Task 16 Part B: portfolio-level analytics ----------

export interface PortfolioConcentrationGroup {
  industry: string;
  symbols: string[];
  count: number;
  pct: number;
}

export interface PortfolioConcentration {
  summary: string;
  groups: PortfolioConcentrationGroup[];
  top_industry: string | null;
  top_industry_pct: number | null;
  flagged: boolean;
  flag_threshold_pct: number;
}

export interface PortfolioDeliveryTrend {
  summary: string;
  avg_ratio: number | null;
  scored_count: number;
  total_count: number;
}

export interface PortfolioEventRiskSymbol {
  symbol: string;
  company_name: string | null;
  categories: string[];
}

export interface PortfolioEventRisk {
  summary: string;
  count: number;
  symbols: PortfolioEventRiskSymbol[];
}

export interface PortfolioPledgeSymbol {
  symbol: string;
  company_name: string | null;
  pledge_pct: number;
  pledge_trend: string | null;
}

export interface PortfolioPledgeExposure {
  summary: string;
  max_pledge_pct: number | null;
  max_symbol: string | null;
  high_count: number;
  flagged_symbols: PortfolioPledgeSymbol[];
  scored_count: number;
}

export interface PortfolioAnalytics {
  symbol_count: number;
  concentration: PortfolioConcentration;
  delivery_trend: PortfolioDeliveryTrend;
  event_risk: PortfolioEventRisk;
  pledge_exposure: PortfolioPledgeExposure;
}

// ---------- Task 17: Ask-RedixFi chat ----------

/** Task 22 Phase 2/3 — a filter-shaped Ask question resolves through the
 * SAME B9 smart-screener code GET /signals/smart-screen uses (core/
 * ask.py::run_ask_open -> core/screener.py::run_smart_screen, unchanged),
 * so `results` is real SignalRow data (masking already applied) meant to
 * render with the EXACT same <SignalTableRow> the Signals page uses. */
export interface AskScreenResult {
  parsed_filters: SmartScreenFilters | null;
  results: SignalRow[];
  result_count: number;
}

/** One day's real composite_score, from measured_signals (never synthesized) —
 * see core/signals_view.py::score_history. */
export interface ScoreHistoryPoint {
  date: string;
  composite_score: number;
}

/** Ask-panel-upgrade session — per-source citation metadata (core/ask.py::
 * compute_source_citations/generic_source_citations), the richer sibling
 * of `sources_used` (bare category names). `investor_calls` produces one
 * entry per concall document (own filing_date/url each); every other
 * source type is a single aggregate entry for that fact-packet section. */
export interface SourceCitation {
  type: string;
  label: string;
  detail: string | null;
  url?: string | null;
  subject?: string | null;
}

/** Shared table shape for TWO distinct Ask AI features: core/tabular_ask.py's
 * multi-day/multi-field NUMERIC tabular answer (Pro tier only) and core/
 * document_table_ask.py's structured extraction of UNSTRUCTURED document
 * facts (products/segments/categories, every tier) — same rendering
 * contract, different data source. `columns` is the single source of truth
 * for what to render: EVERY key a row can carry is listed here (a "Date"
 * column for the numeric feature's date-keyed rows, "Item"/"Description"
 * for the document-extraction feature's rows, nothing else assumed) — see
 * this bug fix's own session note for why a previously-hardcoded "Date"
 * column broke the moment a dateless table reused this same shape.
 * `symbol`/`field` are populated only by the numeric tabular feature (which
 * needs them for symbol-prefixed multi-stock columns, e.g. "TCS_close") —
 * optional here since document-table columns carry neither. `rows` is one
 * object per real data point (a numeric-tabular row per calendar date with
 * data, a document-table row per extracted item) — nothing padded/
 * fabricated, so `row_count` is always an honest count. */
export interface AskTableColumn {
  key: string;
  label: string;
  symbol?: string;
  field?: string;
}

export interface AskTableResult {
  columns: AskTableColumn[];
  rows: Record<string, string | number | null>[];
  row_count: number;
}

export interface AskResult {
  answer: string;
  sources_used: string[];
  source_citations: SourceCitation[];
  refused: boolean;
  conversation_id: string;
  // Task 22 Phase 1/2/3 — additive. Every pre-existing caller (explicit
  // `symbol`, non-comparative/non-screen question) gets mode="symbol" and
  // both compare/screen null, so nothing about the old contract changes.
  // "clarify" — Ask AI symbol-resolution session, locked spec rule 2d:
  // the question needs a specific stock's data but none is resolvable
  // (no page context, no established session symbol, none named) —
  // `answer` is a plain clarifying question ("Which stock are you
  // asking about?"), NOT a compliance refusal (`refused` is false) and
  // not charged against the caller's daily quota (core/routers/ask.py).
  mode: "symbol" | "compare" | "screen" | "general" | "tabular" | "clarify";
  resolved_symbol: string | null;
  compare: CompareResult | null;
  screen: AskScreenResult | null;
  // RedixFi AI backend upgrade — present only for mode="tabular", null
  // everywhere else (same additive/null-elsewhere pattern as compare/screen).
  table: AskTableResult | null;
  // Task 22 Phase 4 — narrow whitelist-only web fallback (company-profile
  // facts: sector/industry, incorporation date, HQ, promoters/management,
  // listing date, ISIN) for a fact not in RedixFi's own DB. MUST be shown
  // as a visibly distinct label, never folded into the AI-generated
  // framing used elsewhere — this content wasn't LLM-generated at all,
  // it's a structured fact read from an external source (Wikidata).
  web_sourced: boolean;
  web_source_label: string | null;
  web_source_url: string | null;
  // Additive (2026-08-06). Present only for a causal/trend-shaped
  // per-symbol question with a real (non-refused) answer — null everywhere
  // else, incl. plain single-fact answers ("what sector is TCS in"), which
  // stay text-only by design. For a `compare` answer, the equivalent data
  // lives at `compare.score_history` instead (one series per symbol).
  score_history: ScoreHistoryPoint[] | null;
  // Additive (2026-08-06) — deterministic (never LLM-generated) next-
  // question suggestions, code-computed from the answer's own mode/fact
  // type. Empty array for a refusal or a locked/paywalled answer.
  follow_ups: string[];
  // Weighted-credit system — how much of the caller's daily/monthly
  // Ask-RedixFi COUNT this answer actually cost (1 for a simple question,
  // up to 3 for a heavy tabular one; see core/ask.py::compute_question_
  // weight). 0 for a free locked-guard/clarify-symbol turn.
  question_weight?: number;
  // Locked-quota-rules session — True only when this turn charged 0
  // (document-not-found, web-fallback-offer, an empty confirmed web
  // search, a genuine refusal, a technical-error template fallback).
  // Server-computed (core/routers/ask.py's own charged_to=="none" check),
  // never re-derived client-side, so the "balance unchanged" footer can
  // never drift from what was actually charged.
  quota_unchanged?: boolean;
}

/** Shape of ApiError.detail on a 429 from POST /ask (core/metering.py::enforce_ask_usage). */
export interface AskLimitDetail {
  reason: "free_daily_limit" | "daily_cap" | "monthly_cap";
  message: string;
  cta: "subscribe" | "topup";
  topup_questions?: number;
  topup_price_paise?: number;
}

/** Ask-panel-upgrade session, Phase 3 — one persisted turn from
 * GET /ask/history (users_repo.ASK_CONVERSATIONS), same shape
 * append_conversation_turn writes. `source_citations`/`follow_ups` are
 * only ever present on an assistant message. */
export interface AskConversationMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
  source_citations?: SourceCitation[];
  follow_ups?: string[];
  // Weighted-credit system — see AskResult.question_weight; stored the
  // same way so a REOPENED conversation shows the same per-message cost
  // tag a live answer would. Absent on turns that predate this field.
  question_weight?: number;
  // Locked-quota-rules session — see AskResult.quota_unchanged; stored
  // only when true (sparse, same convention as the backend's own
  // storage), so a REOPENED conversation shows the same footer a live
  // zero-charge answer would.
  quota_unchanged?: boolean;
}

export interface AskConversation {
  conversation_id: string;
  user_id: string;
  symbol: string;
  messages: AskConversationMessage[];
  created_at: string;
  updated_at: string;
}

/** Ask panel UI redesign session — one row of the real chat-history list
 * (GET /ask/conversations, core/users_repo.py::list_conversations).
 * `symbol` is "_general" for an open-mode conversation — the same value
 * start_conversation already writes, not a new sentinel. `preview` is
 * the conversation's own first user message, truncated server-side. */
export interface AskConversationListItem {
  conversation_id: string;
  symbol: string;
  updated_at: string;
  created_at: string;
  preview: string;
}

export interface AskHistoryResult {
  conversation: AskConversation | null;
  // Context-tailored empty-state chips for symbol mode (core/ask.py::
  // compute_initial_suggestions) — [] for the general/no-symbol panel or
  // a locked symbol.
  initial_suggestions: string[];
}

// ---------- Task 16 Part C: anomaly / unusual-activity detection ----------

export type AnomalyType = "volume_extreme" | "pcr_shift" | "insider_cluster";
export type AnomalyDirection = "up" | "down" | "flat" | "put_heavy" | "call_heavy" | "buying" | "selling";

export interface AnomalyItem {
  type: AnomalyType;
  // NOT `direction` — the API strips any key literally named "direction"
  // from every response body (ra_mode.FORBIDDEN_FIELDS, predictions_
  // snapshot's directional-call field) regardless of context. See
  // api/app/routers/anomalies.py's module docstring for the live bug this
  // renaming fixed.
  anomaly_direction: AnomalyDirection;
  metric: string;
  value: number;
  detail: string;
  method: string;
}

export interface AnomalyFlagDoc {
  symbol: string;
  date: string;
  company_name: string | null;
  sector_index: string | null;
  industry: string | null;
  anomalies: AnomalyItem[];
}

export interface AnomalyScanMeta {
  date: string;
  universe_count: number;
  flagged_symbol_count: number;
  direction_counts: Record<string, number>;
  thresholds: Record<string, number>;
}

// GET /anomalies' page_info carries `scan` (universe size + disclosed
// thresholds) and `date` alongside the usual page/size/total — envelope()
// only accepts data+page_info, so the scan-meta disclosure rides here
// rather than in a second nested container around the results list.
export interface AnomalyPageInfo extends PageInfo {
  scan: AnomalyScanMeta | null;
  date: string;
}

// ---------- Market Activity hub (2026-08-15) — cross-stock aggregation
// of the 4 data types that already render per-stock, unmasked, on
// ResearchDetail (concalls, insider trades, corporate events, bulk/block
// deals). No new fields invented server-side — each row is the SAME
// shape its per-stock counterpart already has (InsiderTrade,
// ConcallTranscript, GenericRecord), plus `type`/`date` (a normalized
// alias of each category's own date field, for chronological merge in
// the "All" tab) and `company_name` (joined from symbols_master server-
// side for collections — bulk_block_deals, corporate_events — that don't
// reliably carry it themselves). ----------

export type MarketActivityType = "concall" | "insider" | "corporate_event" | "bulk_block";

interface MarketActivityBase {
  type: MarketActivityType;
  symbol: string;
  company_name: string | null;
  /** Normalized alias of the category's own date field (filing_date/trade_date/event_date/date) — used for the "All" tab's chronological sort. */
  date: string;
}

export type MarketActivityConcallRow = MarketActivityBase & ConcallTranscript & { type: "concall"; symbol: string };

// Omit + re-add company_name from Base: InsiderTrade's own company_name is
// non-nullable, but the server-side fallback (name_map join) can legitimately
// be null if a symbol is somehow missing from symbols_master — Base's
// `string | null` is the accurate type for the field actually returned here.
export type MarketActivityInsiderRow = Omit<InsiderTrade, "company_name"> & MarketActivityBase & { type: "insider" };

// corporate_events' live field shape (BUG 6 fix, 2026-08-16 — verified
// against data-pipeline/corprate_event.py's CorporateEvent dataclass,
// which is the ONLY writer of this collection): symbol, event_date,
// event_type, event_subtype (often null), headline, summary, source,
// is_pre_event/is_post_event, valid_from/valid_till, and `meta` — a
// NESTED OBJECT (e.g. {source_section, bse_code, company_name, ...}),
// never a scalar. event_impact/impact_strength/expected_direction/
// expected_volatility/confidence are real fields on the stored Mongo
// doc but are stripped server-side by ra_mode.FORBIDDEN_FIELDS before
// this API ever returns them (same choke point every other route uses)
// — intentionally NOT modeled here since the API contract never
// includes them. `meta` stays typed as `Record<string, unknown> | undefined`
// specifically so CategoryTables.tsx's generic-column fallback can be
// guarded against ever String()-rendering it directly (that was BUG 6's
// root cause: a nested object rendered as literal "[object Object]").
export type MarketActivityCorporateEventRow = MarketActivityBase &
  GenericRecord & {
    type: "corporate_event";
    event_type?: string | null;
    event_subtype?: string | null;
    headline?: string | null;
    summary?: string | null;
    source?: string | null;
    meta?: Record<string, unknown> | null;
    /** Present only when the server resolved `symbol` from a raw BSE
     * scrip code (e.g. "544634") to a known canonical NSE symbol — the
     * original code, kept for traceability. Absent when `symbol` is
     * already the original identifier (nothing was resolved). */
    source_symbol?: string | null;
  };

// bulk_block_deals' live field shape (BUG 7 fix, 2026-08-16 — verified
// against data-pipeline/nse_bulk_block_deal.py, the ONLY writer of this
// collection): it upserts a PER-SYMBOL-PER-DAY AGGREGATE summary doc,
// NOT a per-deal row. There is no single deal-level dealType/buySell/
// quantity/price/clientName on the stored document (those only ever
// existed as an in-memory intermediate the writer itself discards —
// "No separate raw collection is used" per that script's own module
// docstring) — the hub's original column mapping guessed a per-deal
// shape that never matched what's actually persisted, which is why
// every column but Date/Symbol (both synthesized server-side in
// market_activity.py, not read from these fields) came back blank.
export type MarketActivityBulkBlockRow = MarketActivityBase &
  GenericRecord & {
    type: "bulk_block";
    net_direction?: "BUY" | "SELL" | "NEUTRAL" | null;
    net_quantity?: number | null;
    buy_quantity?: number | null;
    sell_quantity?: number | null;
    buyer_count?: number | null;
    seller_count?: number | null;
    total_value?: number | null;
    deal_types_present?: string[] | null;
    participation_pct?: number | null;
    deal_strength?: string | null;
  };

export type MarketActivityRow =
  | MarketActivityConcallRow
  | MarketActivityInsiderRow
  | MarketActivityCorporateEventRow
  | MarketActivityBulkBlockRow;

// Deliberately NOT `extends PageInfo` — this endpoint isn't page/size/total
// paginated (see routers/market_activity.py's own comment: a single-shot,
// tier-capped feed, not true cross-collection pagination). Mirrors
// AnomalyListResult's own cast-through-unknown pattern in endpoints.ts.
export interface MarketActivityPageInfo {
  tier: string;
  max_rows: number;
  filters_enabled: boolean;
  csv_export_enabled: boolean;
  type: MarketActivityType | null;
}

// BUG 11 fix (2026-08-17): each category now reports its OWN latest
// date + count independently (routers/market_activity.py::
// market_activity_summary()) instead of all 4 being counted on a single
// shared "most recent across all 4" date — that old design zeroed out
// sparser categories (corporate events, bulk/block deals) whenever their
// own latest activity fell on a different day than insider trades'
// (which file most often and so usually "won" the shared date).
export interface MarketActivityCategorySummary {
  count: number;
  date: string | null;
}

export interface MarketActivitySummary {
  date: string;
  last_updated: string;
  insider_trades: MarketActivityCategorySummary;
  bulk_block_deals: MarketActivityCategorySummary;
  concalls: MarketActivityCategorySummary;
  corporate_events: MarketActivityCategorySummary;
  // Legacy flat fields, kept for back-compat — each is now that
  // category's OWN latest-date count (not "count on one shared date").
  insider_trades_today: number;
  bulk_block_deals_today: number;
  concalls_today: number;
  corporate_events_today: number;
  total_today: number;
}
