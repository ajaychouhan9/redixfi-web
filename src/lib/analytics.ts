/**
 * Funnel events (26 Nov 2026). The browser sends a small row for each step a visitor takes (page view, tapped Start free, opened the sign-up form, opened
 * Pricing) to our own API (POST /events), which stores it in our database. No cookie is set: the visitor id is a random id kept in the browser's local
 * storage (the same one the free stock lookups use), never a name or an email. The steps that happen on the server (sign-up completed, trial started,
 * first Ask AI question, first saved item, checkout started, payment success) are written there, not here.
 *
 * The old Vercel Analytics calls were removed: the site left Vercel and they were doing nothing. `track()` keeps its name and event names so every
 * existing caller still works; only the events that are funnel steps are sent.
 */
import { sendFunnelEvent } from "@/lib/api/mutations";
import { getVisitorId } from "@/lib/lookup-grants";

export type AnalyticsEvent =
  | "trial_cta_click"
  | "signup_started"
  | "signup_completed"
  | "trial_started"
  | "pricing_viewed"
  | "subscribe_click"
  | "lock_click"
  | "rewind_query_run"
  | "screener_filter_used"
  | "screener_csv_export"
  | "ask_ai_question";

/** Which of our events is a client-side funnel step, and its name in the funnel. The rest are not sent from the browser. */
const FUNNEL_NAME: Partial<Record<AnalyticsEvent, string>> = {
  trial_cta_click: "start_free_click",
  signup_started: "signup_started",
  pricing_viewed: "pricing_view",
  lock_click: "lock_click",
};

const UTM_KEY = "redixfi:utm";
const ENTRY_KEY = "redixfi:entry-sent";

function utm(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  try {
    const fromUrl = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = fromUrl.get(k);
      if (v) found[k] = v.slice(0, 40);
    }
    if (Object.keys(found).length) window.sessionStorage.setItem(UTM_KEY, JSON.stringify(found));
    const stored = window.sessionStorage.getItem(UTM_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function send(event: string, extra: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  // our own automated checks (a browser driven by a script) are not visitors
  if (typeof navigator !== "undefined" && navigator.webdriver) return;
  try {
    void sendFunnelEvent({ event, visitor_id: getVisitorId(), path: window.location.pathname, ...utm(), ...extra }).catch(() => undefined);
  } catch {
    /* analytics must never affect the page */
  }
}

export function track(event: AnalyticsEvent, props?: Record<string, string | number | boolean | null>): void {
  void props;
  const name = FUNNEL_NAME[event];
  if (name) send(name);
}

/** One page view per page the visitor opens. The first page of a visit is marked as the entry page. */
export function trackPageView(): void {
  let entry = false;
  try {
    if (!window.sessionStorage.getItem(ENTRY_KEY)) {
      entry = true;
      window.sessionStorage.setItem(ENTRY_KEY, "1");
    }
  } catch {
    /* no storage: no entry mark */
  }
  send("page_view", { entry });
}

/** A short label for the kind of page a path belongs to (for trial_cta_click and lock_click). */
export function pageType(path: string): string {
  if (path === "/" || path === "") return "home";
  const first = path.split("?")[0].split("/").filter(Boolean)[0] ?? "other";
  return ["stocks", "research", "signals", "pricing", "rewind", "intraday", "news", "more", "screens", "market-brief", "watchlist"].includes(first) ? first : "other";
}
