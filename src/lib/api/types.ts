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
  market_cap: number | null;
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
  self: { pe: number | null; pb: number | null; market_cap: number | null; sector_pe: number | null } | null;
  peers: PeerRow[];
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

export interface DailyBrief {
  date: string;
  period: "morning" | "close" | string;
  brief_text: string;
  stat_of_the_day?: string;
  [key: string]: unknown;
}

// ---------- billing ----------

export interface BillingPlan {
  plan: string;
  amount_rupees: number;
  period_days: number;
  tier: "paid" | "founding" | string;
  founding_slots_remaining?: number;
}

export interface BillingOrder {
  order_id: string;
  amount_paise: number;
  currency: string;
  razorpay_key_id?: string;
  [key: string]: unknown;
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

export interface MeProfile {
  user_id: string;
  phone: string | null;
  name: string | null;
  email: string | null;
  tier: "free" | "paid" | "founding" | string;
  subscription: SubscriptionState;
  kyc_status: string;
  tnc_accepted_at: string | null;
  alerts_opt_in: AlertPreferences;
  created_at: string;
}

export interface WatchlistResponse {
  symbols: string[];
  limit: number;
}

export interface UsageInfo {
  research_views_used: number;
  research_views_remaining: number;
  unlimited: boolean;
}

export interface InboxAlert {
  alert_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  [key: string]: unknown;
}
