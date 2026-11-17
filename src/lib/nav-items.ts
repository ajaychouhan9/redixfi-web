/**
 * The one main menu (17 Nov 2026), used by the desktop sidebar and the phone bottom bar: Home, Screener, Market today, 7-Day Review,
 * Ask AI and Me. Research, Pro, Market Rewind and Intraday are no longer menu items (Rewind is a tab of every stock page, Intraday is the
 * Movers tab of Market today). "Ask AI" opens the RedixFi AI panel; every other item is a page. Pure data and one pure function so the
 * rules are testable without a browser.
 */
export type NavId = "home" | "screener" | "market" | "review" | "ask" | "me";

export interface NavItem {
  id: NavId;
  label: string;
  /** Shorter label for the phone bar. */
  short: string;
  /** null for Ask AI, which opens a panel instead of a page. */
  href: string | null;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", short: "Home", href: "/" },
  { id: "screener", label: "Screener", short: "Screener", href: "/signals" },
  { id: "market", label: "Market today", short: "Market", href: "/market" },
  { id: "review", label: "7-Day Review", short: "7-Day", href: "/signals/7-day-review" },
  { id: "ask", label: "Ask AI", short: "Ask AI", href: null },
  { id: "me", label: "Me", short: "Me", href: "/me" },
];

const REVIEW = "/signals/7-day-review";

/** Which item is highlighted for a path. The Screener covers /signals but not the 7-Day Review; Me covers its own page and the account pages. */
export function activeNavId(pathname: string | null | undefined): NavId | null {
  const p = pathname ?? "";
  if (p === "/") return "home";
  if (p.startsWith(REVIEW)) return "review";
  if (p.startsWith("/signals")) return "screener";
  if (p.startsWith("/market")) return "market";
  if (p.startsWith("/me") || p.startsWith("/account") || p.startsWith("/watchlist") || p.startsWith("/pricing")) return "me";
  return null;
}

/** Where a logged-out visitor goes from a personal item (Watchlist, Alerts): the sign-up form, back to that page afterwards. */
export function signupHref(next: string): string {
  return `/login?mode=signup&next=${encodeURIComponent(next)}`;
}
