// Types mirror the LIVE API at https://api.redixfi.com/api/v1, verified by
// sampling every endpoint (see docs/openapi-reference.json for the schema
// dump). Several fields diverge from the screen spec's approximations —
// those deviations are intentional, not typos.

export interface ApiMeta {
  generated_at: string;
  data_fresh: boolean;
  ra_mode: boolean;
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

export interface SignalDetail {
  symbol: string;
  company_name: string;
  sector: string;
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

export interface SmartScreenResult {
  query: string;
  refused: boolean;
  message: string | null;
  parsed_filters: SmartScreenFilters;
  results: SignalRow[];
  result_count: number;
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

export interface WatchlistBehaviorRow {
  symbol: string;
  behavior_state: "sustaining" | "fading" | "reversed" | string;
  since_time: string;
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
  pledge_change: number;
  pledge_trend: string;
  prev_pledged_pct: number;
  risk_signal: string;
  trend_updated_at: string;
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
  amount: number;
  currency: string;
  key_id?: string;
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
