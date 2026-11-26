// A "thin" stock page has nothing to show: no key numbers and no price. It is kept out of search results (noindex) and out of the sitemap until data exists.
// Nothing else is ever set to noindex by this rule. On 26 Nov 2026 no stock met it (every one of the 2,303 has candles; 7 lack key numbers but have a chart).
export function isThinStock(tileCount: number, lastPrice: number | null | undefined): boolean {
  return tileCount === 0 && !(typeof lastPrice === "number" && Number.isFinite(lastPrice) && lastPrice > 0);
}

/** The same rule from a Screener list row, used by the sitemap (the row has no key-number tiles, so its reported figures stand in for them). */
export function isThinRow(row: { pe?: number | null; roe?: number | null; eps?: number | null; de?: number | null; dividend_yield_pct?: number | null; market_cap?: number | null; last_price?: number | null }): boolean {
  const figures = [row.pe, row.roe, row.eps, row.de, row.dividend_yield_pct, row.market_cap];
  return figures.every((v) => v === null || v === undefined) && !(typeof row.last_price === "number" && row.last_price > 0);
}
