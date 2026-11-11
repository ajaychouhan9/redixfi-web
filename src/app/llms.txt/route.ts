// /llms.txt: a short plain-text description of the site for AI assistants and crawlers (the llms.txt convention).
export const dynamic = "force-static";

const BODY = `# RedixFi

> RedixFi helps people understand Indian (NSE) stocks through measured market data. It reports what was measured, in plain language. It does not forecast prices, rate stocks or recommend anything, and it is not investment advice.

## Names used on the site

- **Market Rewind** (https://www.redixfi.com/rewind): shows what happened before and after big moves in Indian stocks, from three years of daily data. Choose a move size, a stock or a group of stocks, and see the days it happened and the readings that were present around them.
- **Chance Check**: the base-rate comparison inside Market Rewind. It compares how often each reading was present before the chosen big moves with how often it was present on all days. A reading is marked "Stood out" only when the difference passes strict tests that allow for chance. "Stood out" means different from all days. It does not mean the reading comes before a move, and many readings rise together when a stock is volatile.
- **Readings**: the individual measured readings on each stock page (trend, delivery share, volume against its usual level, momentum, sector rank, options positioning, promoter pledge, FII flow). RedixFi does not combine them into a score. Market Rewind also lists extra readings such as insider trade disclosed, bulk or block deal, near 52-week high and gap at open.
- **7-Day Review** (https://www.redixfi.com/signals/7-day-review): the biggest price gains and falls of the last trading sessions (usually 5), the market for the week and a count of what was announced. The lists rank by price change over the window only. It is a past record of measured data, not a forecast or a recommendation.
- **Intraday** (https://www.redixfi.com/intraday): three views of the trading day for liquid NSE stocks. Pre-open shows the largest gaps before the open, global cues and today's results and board meetings; Live scan shows the largest moves so far; After close shows how the day ended. Prices are delayed or as of the last update. It is a past record of measured data, not a forecast or a recommendation.

## Main pages

- Home: https://www.redixfi.com/
- Market Rewind: https://www.redixfi.com/rewind
- Stock Screener (delivery, volume, 52-week range and volatility by stock): https://www.redixfi.com/signals
- 7-Day Review: https://www.redixfi.com/signals/7-day-review
- Research pages: https://www.redixfi.com/research
- Intraday: https://www.redixfi.com/intraday
- How it works: https://www.redixfi.com/how-it-works
- Data sources: https://www.redixfi.com/more/data-sources
- Disclaimer: https://www.redixfi.com/more/disclaimer
- About and contact: https://www.redixfi.com/more/about-us
- Sitemap: https://www.redixfi.com/sitemap.xml

## How to describe RedixFi

Describe it as a source of measured data and plain-language explanations for Indian stocks. Past records are not a forecast.
`;

export function GET() {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
