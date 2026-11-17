/**
 * Permanent redirects for the 17 Nov 2026 restructure (one stock page with tabs, one Market today page, Home as the one landing page).
 * Every old address that moves keeps working in ONE hop. `#tab` names the stock-page tab that now holds the old page's content.
 * Order matters: the more specific rule is listed before the general one. /signals/7-day-review is NOT a stock and stays where it is.
 */
export interface Redirect {
  source: string;
  destination: string;
  statusCode: 301;
  has?: { type: "query"; key: string; value?: string }[];
}

const NOT_REVIEW = "(?!7-day-review(?:/|$))[^/]+";

export function restructureRedirects(): Redirect[] {
  const r = (source: string, destination: string, has?: Redirect["has"]): Redirect => ({ source, destination, statusCode: 301, ...(has ? { has } : {}) });
  return [
    // the old per-stock pages for signed-in users and the Research search page
    r(`/signals/:symbol(${NOT_REVIEW})`, "/stocks/:symbol"),
    r(`/signals/:symbol(${NOT_REVIEW})/:rest*`, "/stocks/:symbol"),
    r("/research/:symbol", "/stocks/:symbol"),
    r("/research/:symbol/:rest*", "/stocks/:symbol"),
    r("/research", "/"),
    // the public sub-pages became tabs of the one stock page
    r("/stocks/:symbol/rewind", "/stocks/:symbol#rewind"),
    r("/stocks/:symbol/concall-summary", "/stocks/:symbol#concall"),
    // Market Rewind: the stock link (?symbol=INFY) goes to that stock's Rewind tab, everything else to Home
    r("/rewind", "/stocks/:symbol#rewind", [{ type: "query", key: "symbol", value: "(?<symbol>[A-Za-z0-9&._-]+)" }]),
    r("/rewind", "/"),
    r("/history", "/"),
    r("/history/:path*", "/"),
    // Intraday, Market pulse and Market activity are the three tabs of Market today
    r("/intraday", "/market"),
    r("/pulse", "/market?tab=pulse"),
    r("/market-activity", "/market?tab=activity"),
  ];
}
