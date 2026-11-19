// Copy for "Run full check on my shortlist" (Ask AI Part B stages 3-4). Facts only: no score, no verdict, no ranking.

export const FULL_CHECK_TITLE = "Run full check on my shortlist";
export const FULL_CHECK_BUTTON = "Run full check on my shortlist";
export const FULL_CHECK_INTRO =
  "Your watchlist is your shortlist. For each company RedixFi reads the points to watch, what management said in the latest concall and annual report, three years of numbers, and holdings and deals, then puts them in one report with sources and dates.";
export const FULL_CHECK_NO_RANK = "Companies are listed in your own order. RedixFi does not rank them and cannot choose between them.";
export const FULL_CHECK_FOOTER = "Facts from filings. Not investment advice.";
export const FULL_CHECK_FREE = "Full check is on Basic and Pro. Free accounts can read the stored sample on the Stock Check page.";
export const FULL_CHECK_EMPTY = "Your shortlist is empty. Add companies from the Screener, Stock Check or an Ask AI table, then come back.";
export const FULL_CHECK_MAX_NOTE = (max: number) => `A run covers up to ${max} companies. Tick the ones you want checked now.`;

/** What the run will use, shown before it starts. */
export function costLine(total: number, items: { cost: number; cached: boolean }[]): string {
  const cachedN = items.filter((i) => i.cached).length;
  const base = `This run will use ${total} question${total === 1 ? "" : "s"} from your plan.`;
  return cachedN ? `${base} ${cachedN} of ${items.length} ${cachedN === 1 ? "has" : "have"} a stored result that is still current, so ${cachedN === 1 ? "it costs" : "they cost"} less.` : base;
}

/** "Reading annual report, 40%" */
export function progressLine(step: string, pct: number): string {
  return `${step}, ${Math.max(0, Math.min(100, Math.round(pct)))}%`;
}
