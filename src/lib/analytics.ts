import { track as vercelTrack } from "@vercel/analytics";

/** The events RedixFi counts (11 Nov 2026), with no personal data in them: the name and, at most, a short page type or filter count.
 *  Vercel Web Analytics is cookieless; if it is not switched on for the project, these calls do nothing visible. */
export type AnalyticsEvent =
  | "trial_cta_click"
  | "signup_completed"
  | "trial_started"
  | "pricing_viewed"
  | "subscribe_click"
  | "lock_click"
  | "rewind_query_run"
  | "screener_filter_used"
  | "ask_ai_question";

export function track(event: AnalyticsEvent, props?: Record<string, string | number | boolean | null>): void {
  try {
    vercelTrack(event, props);
  } catch {
    /* analytics must never affect the page */
  }
}

/** A short label for the kind of page a path belongs to (for trial_cta_click and lock_click). */
export function pageType(path: string): string {
  if (path === "/" || path === "") return "home";
  const first = path.split("?")[0].split("/").filter(Boolean)[0] ?? "other";
  return ["stocks", "research", "signals", "pricing", "rewind", "intraday", "news", "more", "screens", "market-brief", "watchlist"].includes(first) ? first : "other";
}
