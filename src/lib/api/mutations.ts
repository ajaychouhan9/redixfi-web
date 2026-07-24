"use client";

// Client-side write calls (auth required, so these can't run as cached
// Server Component fetches). Response envelopes match the GET endpoints exactly.

import { apiGet, apiGetPaged, apiMutate } from "./client";
import type {
  MeProfile,
  AlertPreferences,
  WatchlistResponse,
  UsageInfo,
  InboxAlert,
  BillingOrder,
  SmartScreenResult,
  WatchlistSummary,
} from "./types";

// ---------- auth ----------

export interface AuthUser {
  user_id: string;
  phone: string | null;
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

export async function updateProfile(token: string, body: { name?: string; email?: string; accept_tnc?: boolean }) {
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

export async function createBillingOrder(token: string, plan: string): Promise<BillingOrder> {
  const env = await apiMutate<BillingOrder>("/billing/order", "POST", { plan }, { token });
  return env.data;
}

export async function verifyBilling(
  token: string,
  body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
) {
  const env = await apiMutate<{ ok: boolean }>("/billing/verify", "POST", body, { token });
  return env.data;
}

export async function cancelBilling(token: string) {
  const env = await apiMutate<{ ok: boolean }>("/billing/cancel", "POST", undefined, { token });
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
