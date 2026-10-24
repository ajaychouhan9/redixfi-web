// Next route params can retain percent escapes (for example M%26M). Decode
// once before the API client encodes the symbol for its own URL.
export function stockSymbolFromParam(param: string): string | null {
  try {
    const symbol = decodeURIComponent(param).toUpperCase();
    return /^[A-Z0-9][A-Z0-9&._-]*$/.test(symbol) && /[A-Z]/.test(symbol) ? symbol : null;
  } catch {
    return null;
  }
}

/** Where the header search sends the user: a Research stock page stays in Research, a Signals stock page and every
 *  other page (Home, Alerts, Watchlist, Intraday, More, the Research landing page ...) go to Signals. */
export function searchTargetBase(pathname: string | null | undefined): "/signals" | "/research" {
  return /^\/research\/[^/]+/.test(pathname ?? "") ? "/research" : "/signals";
}

// Path for a stock-keyed page. Symbols such as M&M must be percent-encoded so
// every link, canonical and sitemap entry names the same URL.
export function stockPath(base: "/stocks" | "/signals" | "/research" | "/track-record", symbol: string): string {
  return `${base}/${encodeURIComponent(symbol.trim().toUpperCase())}`;
}
