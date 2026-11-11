import type { SignalsListParams } from "@/lib/api/endpoints";

/**
 * Ready-made screens on reported data (12 Nov 2026). Each one is named by what it filters, never by a judgment, and shows the
 * stocks that meet the stated conditions in alphabetical order. A stock missing a figure is not matched by a filter on it.
 */
export interface FundamentalScreen {
  slug: string;
  title: string;
  /** H1 of the page. */
  heading: string;
  description: string;
  /** The conditions in words, one per filter, shown above the results. */
  conditions: string[];
  params: SignalsListParams;
}

export const FILTERS_NOTE = "Filters on reported data; not recommendations.";

export const FUNDAMENTAL_SCREENS: FundamentalScreen[] = [
  {
    slug: "pe-below-30-roe-above-25-positive-eps",
    title: "P/E below 30, ROE above 25%, positive EPS: NSE stocks meeting all three | RedixFi",
    heading: "P/E below 30, ROE above 25%, positive EPS",
    description: "NSE stocks whose latest reported trailing P/E is below 30, return on equity is above 25% and latest-quarter EPS is above zero, with the quarter-end date of each figure.",
    conditions: ["Trailing 12-month P/E of 30 or less", "Return on equity of 25% or more", "Latest-quarter EPS above zero"],
    params: { pe_max: 30, roe_min: 25, eps_positive: true, sort: "name", order: "asc" },
  },
  {
    slug: "profit-and-sales-growth-above-20-percent",
    title: "Profit and sales growth above 20%: NSE stocks, latest quarter against a year earlier | RedixFi",
    heading: "Profit and sales growth above 20%",
    description: "NSE stocks whose latest-quarter net profit and revenue are each more than 20% above the same quarter a year earlier, with the quarter-end date of the figures.",
    conditions: ["Latest-quarter net profit 20% or more above the same quarter a year earlier", "Latest-quarter revenue 20% or more above the same quarter a year earlier"],
    params: { profit_growth_min: 20, sales_growth_min: 20, sort: "name", order: "asc" },
  },
  {
    slug: "price-above-200-day-ema",
    title: "Price above 200-day EMA: NSE stocks trading above their 200-day exponential average | RedixFi",
    heading: "Price above 200-day EMA",
    description: "NSE stocks whose latest close is above their 200-day exponential moving average, computed from adjusted daily closes for stocks with at least 200 sessions of history.",
    conditions: ["Latest close above the 200-day exponential moving average"],
    params: { ema200_state: "above", sort: "name", order: "asc" },
  },
  {
    slug: "price-below-200-day-ema",
    title: "Price below 200-day EMA: NSE stocks trading below their 200-day exponential average | RedixFi",
    heading: "Price below 200-day EMA",
    description: "NSE stocks whose latest close is below their 200-day exponential moving average, computed from adjusted daily closes for stocks with at least 200 sessions of history.",
    conditions: ["Latest close below the 200-day exponential moving average"],
    params: { ema200_state: "below", sort: "name", order: "asc" },
  },
  {
    slug: "pe-below-15-positive-eps",
    title: "P/E below 15 with positive EPS: NSE stocks by reported trailing P/E | RedixFi",
    heading: "P/E below 15, positive EPS",
    description: "NSE stocks whose latest reported trailing P/E is below 15 and latest-quarter EPS is above zero, with the quarter-end date of each figure.",
    conditions: ["Trailing 12-month P/E of 15 or less", "Latest-quarter EPS above zero"],
    params: { pe_max: 15, eps_positive: true, sort: "name", order: "asc" },
  },
  {
    slug: "roe-above-20-profit-growth-above-15",
    title: "ROE above 20% and profit growth above 15%: NSE stocks on reported figures | RedixFi",
    heading: "ROE above 20%, profit growth above 15%",
    description: "NSE stocks with return on equity above 20% and latest-quarter net profit more than 15% above the same quarter a year earlier, with the quarter-end date of the figures.",
    conditions: ["Return on equity of 20% or more", "Latest-quarter net profit 15% or more above the same quarter a year earlier"],
    params: { roe_min: 20, profit_growth_min: 15, sort: "name", order: "asc" },
  },
  {
    slug: "pe-below-30-price-above-200-day-ema",
    title: "P/E below 30 and price above 200-day EMA: NSE stocks meeting both | RedixFi",
    heading: "P/E below 30, price above 200-day EMA",
    description: "NSE stocks with a latest reported trailing P/E below 30 whose latest close is above their 200-day exponential moving average.",
    conditions: ["Trailing 12-month P/E of 30 or less", "Latest close above the 200-day exponential moving average"],
    params: { pe_max: 30, ema200_state: "above", sort: "name", order: "asc" },
  },
  {
    slug: "sales-growth-above-20-positive-eps",
    title: "Sales growth above 20% with positive EPS: NSE stocks, latest quarter | RedixFi",
    heading: "Sales growth above 20%, positive EPS",
    description: "NSE stocks whose latest-quarter revenue is more than 20% above the same quarter a year earlier and whose latest-quarter EPS is above zero.",
    conditions: ["Latest-quarter revenue 20% or more above the same quarter a year earlier", "Latest-quarter EPS above zero"],
    params: { sales_growth_min: 20, eps_positive: true, sort: "name", order: "asc" },
  },
];

export function getFundamentalScreen(slug: string): FundamentalScreen | undefined {
  return FUNDAMENTAL_SCREENS.find((s) => s.slug === slug);
}
