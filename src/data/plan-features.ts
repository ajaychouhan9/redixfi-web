import type { AskTopupTier } from "@/lib/api/types";

// The plan matrix (11 Nov 2026). Every higher plan includes everything a lower plan has; the numbers mirror api/app/core/plan_limits.py and
// api/app/core/config.py (kept in sync by hand: there is no endpoint that exposes them as data). /pricing, the Home pricing section and the
// cards all read from here, so they cannot drift apart. No plan mentions a score: RedixFi does not publish one.
export interface PlanRow {
  feature: string;
  free: string;
  basic: string;
  pro: string;
}

export const PLAN_MATRIX: PlanRow[] = [
  { feature: "Stock screener: sort, filter and search the table", free: "Yes", basic: "Yes", pro: "Yes" },
  { feature: "Delivery, volume, 52-week range and volatility data for 2,000+ NSE stocks", free: "Yes", basic: "Yes", pro: "Yes" },
  { feature: "Research page lookups", free: "3 per day", basic: "Unlimited", pro: "Unlimited" },
  { feature: "News", free: "Delayed 24 hours", basic: "Same day", pro: "Same day" },
  { feature: "Compare stocks side by side", free: "Up to 5", basic: "Up to 5", pro: "Up to 10" },
  { feature: "Watchlist", free: "10 stocks", basic: "50 stocks", pro: "50 stocks" },
  { feature: "Ask AI", free: "1 question per stock per day", basic: "10 a day, 200 a month", pro: "25 a day, 500 a month" },
  { feature: "Ask AI chat history kept", free: "6 hours", basic: "7 days", pro: "30 days" },
  { feature: "Alerts", free: "None", basic: "5 active, price, in-app and email", pro: "Unlimited: price, delivery, volume; in-app, email, push, Telegram" },
  { feature: "Company report PDF", free: "Free sample only", basic: "3 different stocks a month", pro: "15 different stocks a month" },
  { feature: "Market Rewind", free: "Example filters, 5 rows", basic: "Custom filters for one stock or a sector, 50 rows", pro: "All stocks, similar volatility, saved filters, 200 rows, CSV" },
  { feature: "Market Activity (deals, insider trades, events)", free: "5 rows", basic: "20 rows", pro: "Full history with filters" },
  { feature: "CSV and Excel export", free: "No", basic: "No", pro: "Yes" },
];

// The cards list what each plan adds to the one below it (the full table is on /pricing).
export const FREE_FEATURES = PLAN_MATRIX.map((r) => `${r.feature}: ${r.free}`);
export const BASIC_FEATURES = ["Everything in Free, and:", ...PLAN_MATRIX.filter((r) => r.basic !== r.free).map((r) => `${r.feature}: ${r.basic}`)];
export const PRO_FEATURES = ["Everything in Basic, and:", ...PLAN_MATRIX.filter((r) => r.pro !== r.basic).map((r) => `${r.feature}: ${r.pro}`)];

// 4-tier addon structure (2026-09-11, locked with founder), replacing the
// old single 50-question/₹99 option. Mirrors api/app/core/config.py::
// ASK_TOPUP_TIERS exactly — same manual-sync convention as BASIC_FEATURES/
// PRO_FEATURES above (no endpoint exposes the tier catalog as data).
export const ASK_TOPUP_TIERS: AskTopupTier[] = [
  { id: "ask_topup_50", questions: 50, priceRupees: 99 },
  { id: "ask_topup_150", questions: 150, priceRupees: 199 },
  { id: "ask_topup_500", questions: 500, priceRupees: 499 },
  { id: "ask_topup_1000", questions: 1000, priceRupees: 749 },
];
