// /llms.txt: a short plain-text description of the site for AI assistants and crawlers (the llms.txt convention).
export const dynamic = "force-static";

const BODY = `# RedixFi

> RedixFi helps people understand Indian (NSE) stocks through measured market data. It reports what was measured, in plain language. It does not forecast prices, rate stocks or recommend anything, and it is not investment advice.

## Names used on the site

- **Market Rewind** (https://www.redixfi.com/rewind): shows what happened before and after big moves in Indian stocks, from three years of daily data. Choose a move size, a stock or a group of stocks, and see the days it happened and the readings that were present around them.
- **Chance Check**: the base-rate comparison inside Market Rewind. It compares how often each reading was present before the chosen big moves with how often it was present on all days. A reading is marked "Stood out" only when the difference passes strict tests that allow for chance. "Stood out" means different from all days. It does not mean the reading comes before a move, and many readings rise together when a stock is volatile.
- **Stock Condition**: a number from 0 to 100 for each stock and day. It is a weighted combination of 8 measured readings (trend, volume, delivery share, momentum, sector, options positioning and others). It is not a probability, a rating or a forecast. The page for each stock shows the number and its change from the previous session.
- **Readings**: the 8 measured inputs to Stock Condition. Market Rewind also lists extra readings such as insider trade disclosed, bulk or block deal, near 52-week high and gap at open.
- **Intraday**: measured moves during the trading day.

## Main pages

- Home: https://www.redixfi.com/
- Market Rewind: https://www.redixfi.com/rewind
- Stock Condition by stock: https://www.redixfi.com/signals
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
