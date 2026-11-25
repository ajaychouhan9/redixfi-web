/**
 * The main menu (corrected 18 Nov 2026). The side menu, in this order and the same for everyone, logged in or out:
 * Home, Shortlist Lab, Screener, 7-Day Review, Market Overview, Ask AI, Pricing (21 Nov 2026).
 * The phone bottom bar has five places: Home, Shortlist Lab, Screener, Markets and Account (Ask AI is the gold button in the top bar on every page) (the profile icon, which opens the account menu).
 * "Ask AI" opens the RedixFi AI panel; every other item is a page. Pure data and pure functions so the rules are testable without a browser.
 */
export type NavId = "home" | "lab" | "screener" | "review" | "market" | "ask" | "pricing" | "account";

export interface NavItem {
  id: NavId;
  label: string;
  /** Shorter label for the phone bar. */
  short: string;
  /** null for Ask AI (opens a panel) and Account (opens the account menu). */
  href: string | null;
}

/** The side menu. */
export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", short: "Home", href: "/" },
  { id: "lab", label: "Shortlist Lab", short: "Shortlist", href: "/shortlist-lab" },
  { id: "screener", label: "Screener", short: "Screener", href: "/signals" },
  { id: "review", label: "7-Day Review", short: "7-Day", href: "/signals/7-day-review" },
  { id: "market", label: "Market Overview", short: "Market", href: "/market" },
  { id: "ask", label: "Ask AI", short: "Ask AI", href: null },
  { id: "pricing", label: "Pricing", short: "Pricing", href: "/pricing" },
];

/** The phone bottom bar. */
export const BOTTOM_ITEMS: NavItem[] = [
  { id: "home", label: "Home", short: "Home", href: "/" },
  { id: "lab", label: "Shortlist Lab", short: "Shortlist", href: "/shortlist-lab" },
  { id: "screener", label: "Screener", short: "Screener", href: "/signals" },
  { id: "market", label: "Market Overview", short: "Market", href: "/market" },
  { id: "account", label: "Account", short: "Account", href: null },
];

/** The rows of the account menu (the header's profile circle and the bottom bar's Account). Log out follows them. */
export const ACCOUNT_ITEMS: { id: string; label: string; href: string }[] = [
  { id: "profile", label: "Profile and plan", href: "/account" },
  { id: "watchlist", label: "Watchlist", href: "/watchlist" },
  { id: "alerts", label: "Alerts", href: "/account/alerts" },
  { id: "billing", label: "Billing", href: "/pricing" },
];

const REVIEW = "/signals/7-day-review";
// The pages that belong to Markets: the overview and the four pages its cards open.
const MARKET_PATHS = ["/market", "/intraday", "/pulse", "/market-activity", "/gainers-losers"];

/** Which item is highlighted for a path. The Screener covers /signals but not the 7-Day Review. */
export function activeNavId(pathname: string | null | undefined): NavId | null {
  const p = pathname ?? "";
  if (p === "/") return "home";
  if (p.startsWith("/shortlist-lab") || p.startsWith("/full-check")) return "lab";
  if (p.startsWith(REVIEW)) return "review";
  if (p.startsWith("/signals")) return "screener";
  if (MARKET_PATHS.some((m) => p === m || p.startsWith(`${m}/`))) return "market";
  if (p.startsWith("/pricing")) return "pricing";
  if (p.startsWith("/account") || p.startsWith("/watchlist")) return "account";
  return null;
}

/** Where a logged-out visitor goes to create an account, back to `next` afterwards. */
export function signupHref(next: string): string {
  return `/login?mode=signup&next=${encodeURIComponent(next)}`;
}
