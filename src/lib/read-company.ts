/**
 * The sample company and the five fixed Ask AI questions of Shortlist Lab (Learn tab), and the My rules heading, as plain data so the wording guard
 * and the tests can read every sentence. Facts only: no verdicts, no labels, no scores.
 */
export const SAMPLE_SYMBOL = "HINDUNILVR";
export const SAMPLE_NAME = "Hindustan Unilever";


/** The only questions the address parameter ?ask= can put into Ask AI. Anything else is ignored. */
export const ASK_QUESTIONS: Record<string, string> = {
  points: "List the points to watch for this company.",
  financials: "Show this company's sales, profit, margin and debt trend for the last 3 years.",
  holders: "Show recent promoter, insider and bulk or block deal activity.",
  management: "List the guidance, capex plans and risks mentioned in the latest concall and annual report.",
  price: "Show the last 10 days of price change and delivery %.",
};

/** The question for an ?ask= value, or null when the value is not one of the five keys. Own properties only (no "constructor", no "__proto__"). */
export function askQuestionFor(key: string | null | undefined): string | null {
  if (!key || !Object.prototype.hasOwnProperty.call(ASK_QUESTIONS, key)) return null;
  return ASK_QUESTIONS[key];
}

export function askHref(symbol: string, key: string): string {
  return `/stocks/${symbol}?ask=${key}`;
}

export const PART2_TITLE = "Build Your Shortlist";
export const PART2_INTRO = "Part 2. Choose the rules that matter to you. The stocks that meet them are listed A to Z unless you choose a column to sort by. We do not rank them.";
