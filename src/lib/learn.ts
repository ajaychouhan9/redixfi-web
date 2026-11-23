/**
 * Shortlist Lab, Learn tab (21 Nov 2026): the copy as plain data so the wording guard and the tests can read every sentence.
 * Facts only: no verdicts, no labels, no scores. The seven step names are the same on the Learn tab and the My rules tab.
 */
import { ASK_QUESTIONS } from "@/lib/read-company";

export const LEARN_TAB = "Learn";
export const RULES_TAB = "My rules";
export const LEARN_INTRO = "The seven steps of My rules, and what every field in them means. Facts from filings and the exchange. Not advice.";
/** The line under each step (21 Nov 2026): only "Screener" is a link. `tabs` are the real tab names on a stock page (src/lib/stock-tabs.ts). */
export function findLine(tabs: string[]): string {
  const where = tabs.length === 1 ? `the ${tabs[0]} tab` : `the ${tabs.slice(0, -1).join(", ")} and ${tabs[tabs.length - 1]} tabs`;
  return `Find any stock in Screener, open its page and look in ${where}.`;
}
export const READY_LINE = "Ready to filter? Open the My rules tab to shortlist stocks as per your rule.";
export const STEP_WORD = "Step";

export interface LearnStep {
  /** 1 to 7, shown as "Step 1". */
  n: number;
  name: string;
  /** One plain line under the name; the same line is used on the My rules tab. */
  line: string;
  /** Tabs of a stock page where this step's figures are shown. */
  tabs: string[];
  look: string;
  means: string;
  example: { q: string; a: string };
}

export const LEARN_STEPS: LearnStep[] = [
  {
    n: 1,
    name: "Size and trading",
    tabs: ["Overview"],
    line: "How big the company is and how much of its stock changes hands.",
    look: "Market value (market cap) is the number of shares multiplied by the price. Volume is the number of shares traded in a day. Both are on a stock's Overview tab.",
    means: "Market value describes size, not quality. Very small companies can be hard to trade at the price you see, and their numbers can jump around.",
    example: {
      q: "A company has 10 crore shares and the price is ₹200. What is its market value?",
      a: "10 crore × ₹200 = ₹2,000 crore. That is the size of the company at that price. It does not say whether the price is high or low.",
    },
  },
  {
    n: 2,
    name: "Earnings",
    tabs: ["Annual report"],
    line: "Whether the company made a profit, and whether its sales and profit grew.",
    look: "On a stock's Annual report tab, Quarterly results show the last eight quarters: revenue, net profit and margin %. The annual figures show sales and profit for the last years.",
    means: "Revenue and profit that are higher than in the same quarter a year before mean the company sold and earned more than it did then. Margin is the share of each rupee of sales left as operating profit. A profit in the past does not promise one in the future.",
    example: {
      q: "Revenue was 120 in the latest quarter and 100 in the same quarter a year earlier. What is the change?",
      a: "Revenue is 20% higher than a year earlier ((120 - 100) / 100). Comparing with the same quarter a year earlier keeps the seasons out of the comparison.",
    },
  },
  {
    n: 3,
    name: "Returns",
    tabs: ["Annual report"],
    line: "How much profit the company made for the money put into it.",
    look: "Return on equity (ROE) is profit as a share of the money the owners have put in. Return on capital employed (ROCE) is operating profit before exceptional items divided by the capital the business uses (total assets minus current liabilities). Both are on the Annual report tab.",
    means: "Both show how much profit a company made for each ₹100 put in. ROCE is not shown for banks, insurers and finance companies, whose business is lending or insuring. Compare a company with others of its own kind.",
    example: {
      q: "Profit is ₹150 crore and the owners' money in the company is ₹1,000 crore. What is the return on equity?",
      a: "150 ÷ 1,000 = 15%. The company earned ₹15 of profit for each ₹100 the owners have in it.",
    },
  },
  {
    n: 4,
    name: "Debt and pledge",
    tabs: ["Annual report", "Insiders & promoters"],
    line: "How much the company owes, and how much of the promoters' shares are pledged to lenders.",
    look: "Debt to equity compares what a company owes with what its owners put in (Annual report tab). Promoter pledge is the share of the promoters' holding given as security for a loan (Insiders & promoters tab).",
    means: "Debt has to be paid back whatever the company earns. Debt works differently for banks and lenders, whose business is borrowing and lending. A pledge is a fact about the holding; the filing does not say what will happen.",
    example: {
      q: "A filing says 25% of the promoters' shares are pledged. What does that mean?",
      a: "A quarter of the shares the promoters hold are given as security for a loan. It is a fact about the holding. The filing does not say what will happen.",
    },
  },
  {
    n: 5,
    name: "Price movement",
    tabs: ["Overview"],
    line: "How much the price moved lately, and how much was traded.",
    look: "Day-to-day price swings show how far the closing price moved from one day to the next over the last 21 trading days, compared with other stocks. Delivery % is the share of the day's traded shares that were taken for holding. Volume vs usual compares the last five days with the twenty days before. Delivery and volume are on the Overview tab.",
    means: "A high delivery % means more of the traded shares were taken for holding than for same-day trading. Bigger swings in the price can go either way.",
    example: {
      q: "Delivery is 14% today. What does that tell you about how the shares were traded?",
      a: "About 14% of the day's traded shares were taken for holding, and about 86% were traded and settled within the same day. It describes how the shares were traded.",
    },
  },
  {
    n: 6,
    name: "Price you pay",
    tabs: ["Overview"],
    line: "How the price compares with the profit per share.",
    look: "P/E is the price divided by the profit per share over the last 12 months. It is on the Overview tab.",
    means: "The price says what you pay. It does not say how the business is doing. Compare a company with others of its own kind. A low P/E describes the price against profit, not the business.",
    example: {
      q: "The price is ₹300 and the profit per share over the last 12 months is ₹20. What is the P/E?",
      a: "300 ÷ 20 = 15 times. The price is 15 times the last 12 months' profit per share. It describes the price against profit. It does not say what the price will do.",
    },
  },
  {
    n: 7,
    name: "Price and volume",
    tabs: ["Overview"],
    line: "How the price has moved over past months, and how much was traded on the latest day.",
    look: "The Overview tab shows the price, the 52-week range and the day's volume. The change over 1, 3 or 6 months compares the latest close with the close that long ago. An average is the sum of the last 50 or 200 closing prices divided by 50 or 200.",
    means: "These are facts about the past: where the price has been and how many shares traded. They do not say what the price will do next.",
    example: {
      q: "The price was ₹200 three months ago and is ₹230 now. What is the change?",
      a: "(230 - 200) ÷ 200 = 15%. The price is 15% higher than it was three months ago. It describes the past. It does not say what the price will do.",
    },
  },
];

/** The five fixed questions, in the order Ask AI shows them. */
export const FIVE_QUESTIONS: string[] = [ASK_QUESTIONS.points, ASK_QUESTIONS.financials, ASK_QUESTIONS.holders, ASK_QUESTIONS.management, ASK_QUESTIONS.price];

/** The step names, shown the same on both tabs. */
export const STEP_NAMES = LEARN_STEPS.map((s) => s.name);

export interface LearnField {
  name: string;
  text: string;
  example: string;
}

/** Every field of My rules, step by step (1 to 7): what it is, and a short example. The My rules page keeps only a one-line example under each field; this is the place for the explanation. */
export const LEARN_FIELDS: Record<number, LearnField[]> = {
  1: [
    { name: "Market value at least", text: "Market value is the number of shares multiplied by the price. The rule leaves out companies below the number you type.", example: "Type 500 to keep only companies worth at least ₹500 crore." },
  ],
  2: [
    { name: "Profit in the latest quarter", text: "Tick this to keep companies whose earnings per share for the latest quarter are above zero.", example: "A company that earned ₹3 a share last quarter passes. One that made a loss does not." },
    { name: "Profit in at least this many of the last 5 years", text: "Counts the years, out of the last five, in which the company made a profit.", example: "Type 5 for every one of the last 5 years. Type 3 for any three of the five." },
    { name: "Sales growth over 3 years at least", text: "How fast sales grew each year, on average, over the last three years. It is worked out from annual figures.", example: "Sales of 100 that grew to 133 in three years is about 10 % a year. Type 10." },
    { name: "Profit growth over 3 years at least", text: "The same measure for profit instead of sales.", example: "Profit of 20 that grew to 26.6 in three years is about 10 % a year. Type 10." },
    { name: "Sales growth, latest quarter, at least", text: "Compares sales in the latest quarter with the same quarter a year before, so the seasons stay out of the comparison.", example: "Type 10 to keep companies whose sales were at least 10 % higher than a year before." },
    { name: "Profit growth, latest quarter, at least", text: "The same comparison for profit.", example: "Type 10 to keep companies whose profit was at least 10 % higher than a year before." },
    { name: "Sales and profit both higher than the year before, 3 years in a row", text: "Compares rupee figures from annual results, not percentages. A move from a loss to a profit counts as higher. It needs four years of annual figures, so a company with fewer is left out.", example: "Sales of 100, 110, 125 and 140 with profit of 10, 12, 15 and 18 passes." },
  ],
  3: [
    { name: "Return on equity at least", text: "Profit as a share of the money the owners have put in. It shows how much profit a company made for each ₹100 of the owners' money.", example: "Profit of ₹150 crore on owners' money of ₹1,000 crore is 15 %. Type 15." },
    { name: "Return on capital employed (ROCE) at least", text: "Operating profit as a share of the money the business uses. It is not shown for banks, insurers and finance companies, whose business is lending or insuring.", example: "Type 15 to keep companies that earned at least ₹15 of operating profit for each ₹100 used in the business." },
  ],
  4: [
    { name: "Debt to equity at most", text: "What the company owes compared with what its owners put in. It does not suit banks and finance companies, whose business is borrowing and lending.", example: "Type 1 to keep companies that owe no more than the owners put in." },
    { name: "Promoter pledge at most", text: "The share of the promoters' holding that is pledged to lenders as security for a loan. It is a fact from the latest disclosure.", example: "Type 10 to keep companies where no more than a tenth of the promoters' shares are pledged." },
  ],
  5: [
    { name: "Day-to-day price swings", text: "Looks at how far the closing price moved from one day to the next over the last 21 trading days, and ranks every stock by it. Choose Calmer to keep stocks whose price swung less than most. Choose More active to keep stocks whose price swung more than most. Then type how many stocks out of 100 it should have swung more than. Bigger swings can go either way.", example: "Calmer, 25: the price swung more than at most 25 of every 100 stocks. More active, 75: it swung more than at least 75 of every 100." },
    { name: "Volume vs usual at least", text: "Compares the shares traded a day over the last 5 days with the average of the 20 days before them.", example: "Type 1.5 to keep stocks that traded at least 1.5 times as many shares a day as usual." },
    { name: "Delivery at least", text: "The share of traded shares that were taken for holding instead of being bought and sold within the same day.", example: "Type 50 to keep stocks where at least half of the traded shares were taken for delivery." },
  ],
  6: [
    { name: "P/E at most", text: "The price divided by the profit per share over the last 12 months. It describes the price against profit, not the business.", example: "A price of ₹300 and a profit of ₹20 a share is a P/E of 15. Type 25 to keep a P/E of 25 or lower." },
  ],
  7: [
    { name: "Price change over a past period", text: "Choose 1, 3 or 6 months, then the least change in the price you want. It compares the latest closing price with the closing price that long ago. Nothing shorter than 1 month is offered. Both the period and the number are needed.", example: "3 months and 10 keeps stocks whose price is at least 10 % higher than three months ago." },
    { name: "Price close to its 52-week high", text: "How far the latest price may be below the highest price of the last 52 weeks.", example: "Type 10 to keep stocks priced within 10 % of their 52-week high." },
    { name: "Price above its average price", text: "Choose the average of the last 50 or the last 200 closing prices. The latest price must be above it. It describes the past price only.", example: "Choose the 200-day average to keep stocks whose latest price is above the average of the last 200 closing prices." },
    { name: "Shares traded on the latest day", text: "How many times the usual number of shares changed hands on the latest trading day. Usual means the average of the 20 days before it.", example: "Type 1.5 to keep stocks that traded at least 1.5 times their usual number of shares on the latest day." },
  ],
};
