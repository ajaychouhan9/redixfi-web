"use client";

// Client-side write calls (auth required, so these can't run as cached
// Server Component fetches). Response envelopes match the GET endpoints exactly.

import { apiGet, apiGetPaged, apiGetOptional, apiMutate } from "./client";
import type {
  MeProfile,
  AlertPreferences,
  WatchlistResponse,
  UsageInfo,
  InboxAlert,
  BillingOrder,
  BillingVerifyResult,
  PromoValidation,
  SmartScreenResult,
  WatchlistSummary,
  PortfolioBrief,
  PortfolioAnalytics,
  AnomalyFlagDoc,
  AskResult,
  PromoCodeAdmin,
  AlertRule,
  AlertRulesList,
  AlertMetric,
  AlertDirection,
} from "./types";

// ---------- auth ----------

export interface AuthUser {
  user_id: string;
  phone: string | null;
  // Task 19 — a Google/email+password account's identity; null for an
  // existing phone-OTP account that hasn't separately added an email via
  // Account/Profile.
  email: string | null;
  name: string | null;
  tier: string;
  tnc_accepted_at: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export async function firebaseLogin(firebase_token: string): Promise<AuthTokens> {
  const env = await apiMutate<AuthTokens>("/auth/firebase-login", "POST", { firebase_token });
  return env.data;
}

export async function refreshTokens(refresh_token: string): Promise<AuthTokens> {
  const env = await apiMutate<AuthTokens>("/auth/refresh", "POST", { refresh_token });
  return env.data;
}

export async function logoutAll(token: string) {
  await apiMutate<{ ok: boolean }>("/auth/logout-all", "POST", undefined, { token });
}

// ---------- me ----------

export async function getMe(token: string): Promise<MeProfile> {
  const env = await apiGet<MeProfile>("/me", { token });
  return env.data;
}

export async function updateProfile(token: string, body: { name?: string; email?: string; phone?: string; accept_tnc?: boolean }) {
  const env = await apiMutate<MeProfile>("/me", "PATCH", body, { token });
  return env.data;
}

export async function updateAlertPrefs(token: string, body: Partial<AlertPreferences>) {
  const env = await apiMutate<AlertPreferences>("/me/alerts", "PATCH", body, { token });
  return env.data;
}

export async function getWatchlist(token: string): Promise<WatchlistResponse> {
  const env = await apiGet<WatchlistResponse>("/me/watchlist", { token });
  return env.data;
}

export async function replaceWatchlist(token: string, symbols: string[]): Promise<WatchlistResponse> {
  const env = await apiMutate<WatchlistResponse>("/me/watchlist", "PUT", { symbols }, { token });
  return env.data;
}

export async function addToWatchlist(token: string, symbol: string): Promise<WatchlistResponse> {
  const env = await apiMutate<WatchlistResponse>(`/me/watchlist/${encodeURIComponent(symbol)}`, "POST", undefined, {
    token,
  });
  return env.data;
}

export async function removeFromWatchlist(token: string, symbol: string): Promise<WatchlistResponse> {
  const env = await apiMutate<WatchlistResponse>(`/me/watchlist/${encodeURIComponent(symbol)}`, "DELETE", undefined, {
    token,
  });
  return env.data;
}

export async function getUsage(token: string): Promise<UsageInfo> {
  const env = await apiGet<UsageInfo>("/me/usage", { token });
  return env.data;
}

export async function getInboxPage(token: string, page = 1, size = 20) {
  return apiGetPaged<InboxAlert>("/me/inbox", { token, params: { page, size } });
}

export async function markInboxRead(token: string, alertId: string) {
  await apiMutate<{ ok: boolean }>(`/me/inbox/${encodeURIComponent(alertId)}/read`, "POST", undefined, { token });
}

export async function addPushToken(token: string, pushToken: string, platform: "android" | "ios" | "web" = "web") {
  await apiMutate<{ ok: boolean }>("/me/push-token", "POST", { token: pushToken, platform }, { token });
}

// ---------- billing ----------

export async function createBillingOrder(token: string, plan: string, promoCode?: string): Promise<BillingOrder> {
  const env = await apiMutate<BillingOrder>(
    "/billing/order",
    "POST",
    promoCode ? { plan, promo_code: promoCode } : { plan },
    { token }
  );
  return env.data;
}

export async function verifyBilling(
  token: string,
  body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
): Promise<BillingVerifyResult> {
  const env = await apiMutate<BillingVerifyResult>("/billing/verify", "POST", body, { token });
  return env.data;
}

export async function cancelBilling(token: string) {
  const env = await apiMutate<{ ok: boolean }>("/billing/cancel", "POST", undefined, { token });
  return env.data;
}

// Task 20 Part C — universal promo input. No auth required (pre-login web
// checkout can validate before a user commits to logging in), matches the
// backend's own no-auth-required design.
export async function validatePromoCode(code: string, plan: string): Promise<PromoValidation> {
  const env = await apiMutate<PromoValidation>("/billing/promo-code/validate", "POST", { code, plan });
  return env.data;
}

// Task 20 Part D — Ask-RedixFi topup, already built (Task 17) for the
// reactive 429-triggered flow; reused here for the proactive Checkout
// line item. Same order/verify shape as billing's, distinct endpoints.
export async function createTopupOrder(token: string): Promise<BillingOrder> {
  const env = await apiMutate<BillingOrder>("/ask/topup/order", "POST", undefined, { token });
  return env.data;
}

export async function verifyTopupOrder(
  token: string,
  body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
): Promise<{ success: boolean; topup_questions_remaining: number }> {
  const env = await apiMutate<{ success: boolean; topup_questions_remaining: number }>("/ask/topup/verify", "POST", body, { token });
  return env.data;
}

// ---------- smart screener ----------

export async function smartScreen(token: string | null, query: string): Promise<SmartScreenResult> {
  const env = await apiMutate<SmartScreenResult>("/signals/smart-screen", "POST", { query }, token ? { token } : undefined);
  return env.data;
}

// ---------- education (Task 12) ----------

export type EngagementType = "explainer_open" | "chip_tap" | "faq_open" | "faq_suggest_tap";

/** Fire-and-forget instrumentation — the usage data that will shape Ask-AI
 * v1.5. Auth is optional (matches the API's get_auth_context default);
 * callers should not await this on the critical path of opening a panel. */
export async function logEducationEngagement(
  token: string | null,
  body: { type: EngagementType; metric: string; question_id?: string; symbol?: string }
): Promise<void> {
  try {
    await apiMutate<{ logged: boolean }>("/education/engagement", "POST", body, token ? { token } : undefined);
  } catch {
    // Engagement logging must never block or break the UI it's attached to.
  }
}

// GET /summary/watchlist requires auth (a watchlist is per-user) — lives
// here alongside the other token-gated calls rather than in endpoints.ts.
export async function getWatchlistSummary(token: string): Promise<WatchlistSummary> {
  const env = await apiGet<WatchlistSummary>("/summary/watchlist", { token });
  return env.data;
}

// ---------- research view metering (bug fix, 2026-08-08) ----------

// The real Research page (app/(app)/research/[symbol]/page.tsx) is SSR+
// ISR with a shared anonymous cache, so it can never itself trigger the
// free-tier 3/day metering check GET /research/{symbol} carries server-
// side. ResearchViewGate.tsx calls this once per page view, client-side,
// with the real browser-held token SSR can't reach — same
// SignalUnlockGate-style "correction after the cached content already
// rendered" pattern, but deliberately NOT a re-fetch of the full
// GET /research/{symbol} payload (fundamentals/insider/news/peers can be
// large; this only needs the metering side effect, see the backend
// route's own docstring for the full reasoning). A 429 ApiError means
// today's free-tier cap is hit — the caller shows the gate.
export async function recordResearchView(token: string, symbol: string): Promise<void> {
  await apiMutate<{ ok: boolean }>(`/research/${encodeURIComponent(symbol)}/view`, "POST", undefined, { token });
}

// ---------- portfolio (Task 16 Parts A + B) — auth required, per-user ----------

/** null when data-pipeline/portfolio_brief_builder.py hasn't run for this
 * user yet (honest 404, same stance as GET /brief/latest before daily_brief
 * existed) — never a fabricated empty-looking brief. */
export async function getPortfolioBrief(token: string): Promise<PortfolioBrief | null> {
  return apiGetOptional<PortfolioBrief>("/portfolio/brief", { token });
}

export async function getPortfolioAnalytics(token: string): Promise<PortfolioAnalytics> {
  const env = await apiGet<PortfolioAnalytics>("/portfolio/analytics", { token });
  return env.data;
}

// ---------- watchlist-scoped anomalies (Task 16 Part C) ----------

export async function getWatchlistAnomalies(token: string): Promise<AnomalyFlagDoc[]> {
  const env = await apiGetPaged<AnomalyFlagDoc>("/anomalies/watchlist", { token });
  return env.data;
}

// ---------- Ask-RedixFi (Task 17) — auth required (require_auth, no
// anonymous path); free tier is 1 question/symbol/day, paid/founding
// 25/day + 450/month. A 429 here always carries a structured AskLimitDetail
// in ApiError.detail — callers should catch ApiError and read e.detail
// rather than treating this as a generic failure. ----------

// Task 22 Phase 1 — `symbol` is optional: omit it (or pass null) from any
// page with no current-stock context (Home, Signals list, Watchlist) and
// the backend extracts/routes free-text on its own (core/ask.py::
// run_ask_open). Symbol-context pages (Signal/Research detail) keep
// passing it explicitly, unchanged.
export async function askRedixfi(
  token: string,
  body: { symbol?: string | null; question: string; conversation_id?: string | null }
): Promise<AskResult> {
  const env = await apiMutate<AskResult>("/ask", "POST", body, { token });
  return env.data;
}

// ---------- promo-code admin (/admin/promo-codes) — every call here is
// gated SERVER-SIDE by core/admin_auth.py::require_admin (ADMIN_USER_IDS
// allowlist). A non-admin token gets a plain 403 from every one of these,
// same as any other authorization failure — the hidden frontend route is
// not the security boundary, this check (on the API side) is. ----------

export async function listPromoCodes(token: string): Promise<PromoCodeAdmin[]> {
  const env = await apiGet<PromoCodeAdmin[]>("/admin/promo-codes", { token });
  return env.data;
}

export interface CreatePromoCodeBody {
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  applies_to: string[];
  max_redemptions?: number | null;
  one_use_per_user?: boolean;
  valid_till?: string | null;
  channel_tag?: string;
}

export async function createPromoCodeAdmin(token: string, body: CreatePromoCodeBody): Promise<PromoCodeAdmin> {
  const env = await apiMutate<PromoCodeAdmin>("/admin/promo-codes", "POST", body, { token });
  return env.data;
}

export interface UpdatePromoCodeBody {
  discount_type?: "percentage" | "flat";
  discount_value?: number;
  applies_to?: string[];
  max_redemptions?: number | null;
  max_redemptions_unlimited?: boolean;
  one_use_per_user?: boolean;
  valid_till?: string | null;
  valid_till_no_expiry?: boolean;
  channel_tag?: string;
  active?: boolean;
}

export async function updatePromoCodeAdmin(token: string, code: string, body: UpdatePromoCodeBody): Promise<PromoCodeAdmin> {
  const env = await apiMutate<PromoCodeAdmin>(`/admin/promo-codes/${encodeURIComponent(code)}`, "PATCH", body, { token });
  return env.data;
}

export async function deactivatePromoCodeAdmin(token: string, code: string): Promise<PromoCodeAdmin> {
  const env = await apiMutate<PromoCodeAdmin>(`/admin/promo-codes/${encodeURIComponent(code)}/deactivate`, "POST", undefined, { token });
  return env.data;
}

// ---------- threshold alerts (2026-08-08, locked spec) — auth required,
// zero access for free tier (enforced server-side, not just hidden here) ----------

export async function getAlertRules(token: string): Promise<AlertRulesList> {
  const env = await apiGet<AlertRulesList>("/alert-rules", { token });
  return env.data;
}

export async function createAlertRule(
  token: string,
  body: { symbol: string; metric: AlertMetric; direction: AlertDirection; target_value: number }
): Promise<AlertRule> {
  const env = await apiMutate<AlertRule>("/alert-rules", "POST", body, { token });
  return env.data;
}

export async function updateAlertRule(
  token: string,
  ruleId: string,
  body: { direction?: AlertDirection; target_value?: number; active?: boolean }
): Promise<AlertRule> {
  const env = await apiMutate<AlertRule>(`/alert-rules/${encodeURIComponent(ruleId)}`, "PATCH", body, { token });
  return env.data;
}

export async function deleteAlertRule(token: string, ruleId: string): Promise<void> {
  await apiMutate<{ ok: boolean }>(`/alert-rules/${encodeURIComponent(ruleId)}`, "DELETE", undefined, { token });
}
