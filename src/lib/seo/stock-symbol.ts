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

/** One public page per stock (17 Nov 2026): the signed-in /signals/<symbol> and /research/<symbol> pages were merged into /stocks/<symbol>
 *  (their addresses redirect there permanently). The header search therefore always opens /stocks. */
export function searchTargetBase(_pathname?: string | null): "/stocks" {
  return "/stocks";
}

// Path for a stock-keyed page. Symbols such as M&M must be percent-encoded so every link, canonical and sitemap entry names the same URL.
// `base` is kept so older call sites still compile; every base now gives the one stock page.
export function stockPath(_base: "/stocks" | "/signals" | "/research", symbol: string): string {
  return `/stocks/${encodeURIComponent(symbol.trim().toUpperCase())}`;
}

/** Stock page address with a tab opened: /stocks/INFY#rewind. Tabs: overview, annual-report, concall, points-to-watch, news, insiders, rewind, ask-ai. */
export function stockTabPath(symbol: string, tab: string): string {
  return `${stockPath("/stocks", symbol)}#${tab}`;
}
