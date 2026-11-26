export interface Crumb {
  name: string;
  href: string;
}

const HOME: Crumb = { name: "Home", href: "/" };
const MARKET: Crumb = { name: "Market Overview", href: "/market" };
const MORE: Crumb = { name: "More", href: "/more" };

/** Breadcrumb trails of the inner pages that do not draw their own (26 Nov 2026). The stock, screen and weekly pages carry theirs. */
export const ROUTE_CRUMBS: Record<string, Crumb[]> = {
  "/signals": [HOME, { name: "Screener", href: "/signals" }],
  "/signals/7-day-review": [HOME, { name: "Screener", href: "/signals" }, { name: "7-Day Review", href: "/signals/7-day-review" }],
  "/screens": [HOME, { name: "Stock screens", href: "/screens" }],
  "/market": [HOME, MARKET],
  "/intraday": [HOME, MARKET, { name: "Intraday Monitor", href: "/intraday" }],
  "/pulse": [HOME, MARKET, { name: "Market Pulse", href: "/pulse" }],
  "/market-activity": [HOME, MARKET, { name: "Market Activity", href: "/market-activity" }],
  "/gainers-losers": [HOME, MARKET, { name: "Top Gainers and Losers", href: "/gainers-losers" }],
  "/unusual-activity": [HOME, MARKET, { name: "Unusual Activity", href: "/unusual-activity" }],
  "/volatility": [HOME, { name: "Volatility ranking", href: "/volatility" }],
  "/shortlist-lab": [HOME, { name: "Shortlist Lab", href: "/shortlist-lab" }],
  "/news": [HOME, { name: "Market News", href: "/news" }],
  "/pricing": [HOME, { name: "Pricing", href: "/pricing" }],
  "/how-it-works": [HOME, { name: "How the readings are measured", href: "/how-it-works" }],
  "/sample-report": [HOME, { name: "Free sample report", href: "/sample-report" }],
  "/market-brief": [HOME, { name: "Market brief archive", href: "/market-brief" }],
  "/more/about-us": [HOME, MORE, { name: "About and contact", href: "/more/about-us" }],
  "/more/disclaimer": [HOME, MORE, { name: "Disclaimer", href: "/more/disclaimer" }],
  "/more/terms": [HOME, MORE, { name: "Terms of Service", href: "/more/terms" }],
  "/more/privacy": [HOME, MORE, { name: "Privacy Policy", href: "/more/privacy" }],
  "/more/refund-policy": [HOME, MORE, { name: "Refund and Cancellation Policy", href: "/more/refund-policy" }],
  "/more/data-sources": [HOME, MORE, { name: "Data sources", href: "/more/data-sources" }],
};

