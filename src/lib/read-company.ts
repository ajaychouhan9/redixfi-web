/**
 * "Read a company in 15 minutes" (18 Nov 2026): the copy and the fixed Ask AI questions of the /start page, as plain data so the wording guard
 * and the tests can read every sentence. Facts only: no verdicts, no labels, no scores.
 */
export const SAMPLE_SYMBOL = "HINDUNILVR";
export const SAMPLE_NAME = "Hindustan Unilever";

export const READ_INTRO = "Five steps, about 15 minutes, using the tabs on any stock page. Facts from filings and the exchange. Not advice.";
// The owner asked for "has data in every tab"; its bulk and block deals tab is empty, so the line says "nearly every tab" (stated in the report).
export const SAMPLE_NOTE = "This company is shown only because its pages have data in nearly every tab. It is not a suggestion.";
export const SAMPLE_BUTTON = "Try it on a sample stock";
export const CHIP_COST = "Counts against your Ask AI allowance when you send it (usually 1 to 3 questions).";
export const CHIP_LOGIN = "Ask AI needs a log-in. The question is typed in for you; nothing is sent until you press Send.";

/** The only questions the address parameter ?ask= can put into Ask AI. Anything else is ignored. */
export const ASK_QUESTIONS: Record<string, string> = {
  points: "List the points to watch for this company, with sources.",
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

export interface ReadStep {
  n: number;
  minutes: string;
  title: string;
  look: string;
  means: string;
  /** Buttons that open a tab of the sample stock. */
  tabs: { label: string; tab: string }[];
  askKey: string;
  /** Shown only in step 2: common rules, as information. */
  rules?: string;
}

export const READ_STEPS: ReadStep[] = [
  {
    n: 1,
    minutes: "about 3 min",
    title: "Points to watch and News",
    look:
      "Open the Points to watch tab. Each item is a statement found in the company's own filings: an auditor's remark, a contingent liability, a related-party transaction or a promoter pledge, with the filing it came from. Then open News for the latest headlines about the company.",
    means:
      "An item is a fact worth reading in its source. It is not a score and not a conclusion. Older and small items are marked and listed last. An empty list means none of these four kinds of statement were found in the filings read so far.",
    tabs: [
      { label: "Open Points to watch", tab: "points-to-watch" },
      { label: "Open News", tab: "news" },
    ],
    askKey: "points",
  },
  {
    n: 2,
    minutes: "about 4 min",
    title: "Is the business growing?",
    look:
      "On the Annual report tab, find Quarterly results. It shows the last eight quarters: revenue, net profit and margin %. Below it are return on equity (profit as a share of the money the owners have put in), debt to equity (what the company owes compared with that money) and return on capital employed (ROCE). RedixFi calculates ROCE from the annual statements for companies other than banks, insurers and finance companies, and a small table beneath it shows the last five years. Other five-year figures are not on the page yet.",
    means:
      "Revenue and profit that are higher than in the same quarters a year before mean the company sold and earned more than it did then. Margin is the share of each rupee of sales left as operating profit. ROCE is operating profit before exceptional items divided by the capital the business uses (total assets minus current liabilities), so it shows how much operating profit the company made for each rupee of capital. It is not shown for banks, insurers and finance companies, whose business is lending or insuring. Debt works differently for banks and lenders, whose business is borrowing and lending, so compare a company with others of its own kind.",
    tabs: [{ label: "Open Annual report", tab: "annual-report" }],
    askKey: "financials",
    rules:
      "Common rules, shown as information only. Many people look for: a profit above zero in the latest quarter; sales higher than in the same quarter a year earlier; a return on equity of 15% or more; a return on capital employed that is similar in recent years to earlier years; a debt to equity below 1 for companies that are not lenders. These are common rules, not tests a company must pass, and people use different numbers.",
  },
  {
    n: 3,
    minutes: "about 4 min",
    title: "What insiders and big holders did",
    look:
      "Open the Insiders & promoters tab. Promoters are the founders or controlling owners. Read the promoter holding %, the pledge table (promoter shares given as security for a loan), the insider trade disclosures and the bulk and block deals.",
    means:
      "The holding shows how much of the company the promoters own and whether the figure moved from quarter to quarter. A pledge means some of those shares secure a loan. Insider trades are disclosures filed by people close to the company, with the direction and the date. Bulk and block deals are large trades reported by the exchange. Many companies have none stored, and \"none stored\" is a normal answer. A filing shows what happened, not why.",
    tabs: [{ label: "Open Insiders & promoters", tab: "insiders" }],
    askKey: "holders",
  },
  {
    n: 4,
    minutes: "about 4 min",
    title: "What management said",
    look: "Open the Concall tab for summaries of the latest earnings calls, and the Annual report tab for the summary of the yearly report. Each links to its source filing.",
    means:
      "A concall is a call where management presents the results and answers questions. Guidance is what management says it plans for the coming period. Capex is money planned for plants, equipment or buildings. Risks are the matters the company itself lists. These are the company's own statements, summarised; read the source filing for the exact words.",
    tabs: [
      { label: "Open Concall", tab: "concall" },
      { label: "Open Annual report", tab: "annual-report" },
    ],
    askKey: "management",
  },
  {
    n: 5,
    minutes: "about 3 min",
    title: "What price and delivery did",
    look:
      "On the Overview tab see the price chart, the 52-week range and Delivery and volume. Delivery % appears once the day's data is loaded; the table of recent sessions shows the days that are stored. Open Rewind to see past days when the price moved by a size you choose (2%, 3% or 5%) in the period you choose.",
    means:
      "Delivery % is the share of the day's traded shares that were taken for holding rather than traded and settled within the same day. A high delivery % means more of the traded shares were taken for holding than for same-day trading. It describes how the shares were traded. It does not say which way the price will go.",
    tabs: [
      { label: "Open Overview", tab: "overview" },
      { label: "Open Rewind", tab: "rewind" },
    ],
    askKey: "price",
  },
];

export const NOTES_TITLE = "My notes";
export const NOTES_HELP = "Tick each step when you have read it. Saved on this device only. There is no score.";
export const NOTES_LABELS = READ_STEPS.map((s) => `Step ${s.n}: ${s.title}`);
export function notesLine(done: number): string {
  return `You have checked ${done} of ${READ_STEPS.length} steps`;
}

export const QUIZ_TITLE = "What does this data show?";
export const QUIZ: { q: string; a: string }[] = [
  {
    q: "Delivery is 14% today. What does that tell you about how the shares were traded?",
    a: "About 14% of the day's traded shares were taken for holding, and about 86% were traded and settled within the same day. It describes how the shares were traded.",
  },
  {
    q: "Revenue was 120 in the latest quarter and 100 in the same quarter a year earlier. What is the change?",
    a: "Revenue is 20% higher than a year earlier ((120 - 100) / 100). Comparing with the same quarter a year earlier keeps the seasons out of the comparison.",
  },
  {
    q: "A filing says 25% of the promoters' shares are pledged. What does that mean?",
    a: "A quarter of the shares the promoters hold are given as security for a loan. It is a fact about the holding. The filing does not say what will happen.",
  },
];

export const PART2_TITLE = "Part 2. Find companies using your own rules";
export const PART2_INTRO = "Tick the rules that matter to you. The companies that match are listed A to Z, with no ranking. The cards show only what the Screener already returns.";
