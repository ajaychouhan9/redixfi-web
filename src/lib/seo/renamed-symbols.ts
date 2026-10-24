// Stocks whose NSE trading symbol changed with the company's name (the ISIN stays the same).
// Old links, bookmarks and search results for the old symbol are sent to the new one with a
// permanent redirect. Add a line here whenever the universe renames a symbol.
//
//   old symbol  ->  new symbol   (effective on NSE)
export const RENAMED_SYMBOLS: Record<string, string> = {
  SILLYMONKS: "CRESTO",   // Silly Monks Entertainment -> Cresto Techno, 10 Sep 2026
  HEG: "HEGAM",           // HEG -> HEG Advanced Materials, 22 Sep 2026
  MANBRO: "KDGREEN",      // Manbro Industries -> KD Green Industries, 3 Sep 2026
  ICICIPRULI: "ICICILIFE", // ICICI Prudential Life Insurance -> ICICI Life Insurance, Oct 2026 (ISIN INE726G01019)
};

const STOCK_PAGES = ["stocks", "signals", "research", "track-record"] as const;

type Redirect = { source: string; destination: string; statusCode: 301 };

// Both letter cases are matched, and anything below the stock page (for example
// /stocks/HEG/concall-summary) follows to the same place under the new symbol.
export function renamedSymbolRedirects(renamed: Record<string, string> = RENAMED_SYMBOLS): Redirect[] {
  const out: Redirect[] = [];
  for (const [oldSymbol, newSymbol] of Object.entries(renamed)) {
    const either = `${oldSymbol}|${oldSymbol.toLowerCase()}`;
    for (const page of STOCK_PAGES) {
      out.push({ source: `/${page}/:old(${either})`, destination: `/${page}/${newSymbol}`, statusCode: 301 });
      out.push({ source: `/${page}/:old(${either})/:rest*`, destination: `/${page}/${newSymbol}/:rest*`, statusCode: 301 });
    }
  }
  return out;
}
