/**
 * Shortlist Lab, Learn tab (21 Nov 2026): the copy as plain data so the wording guard and the tests can read every sentence.
 * Facts only: no verdicts, no labels, no scores. The six step names are the same on the Learn tab and the My rules tab.
 */
import { ASK_QUESTIONS, SAMPLE_NAME, SAMPLE_SYMBOL } from "@/lib/read-company";

export const LEARN_TAB = "Learn";
export const RULES_TAB = "My rules";
export const LEARN_INTRO = "Six steps, and the five questions to ask Ask AI about any company. Facts from filings and the exchange. Not advice.";
/** The line under each step (21 Nov 2026): only "Screener" is a link. `tabs` are the real tab names on a stock page (src/lib/stock-tabs.ts). */
export function findLine(tabs: string[]): string {
  const where = tabs.length === 1 ? `the ${tabs[0]} tab` : `the ${tabs.slice(0, -1).join(", ")} and ${tabs[tabs.length - 1]} tabs`;
  return `Find any stock in Screener, open its page and look in ${where}.`;
}
export const READY_LINE = "Ready to filter? Open the My rules tab to shortlist stocks as per your rule.";
export const TRY_BUTTON = "Try these questions in Ask AI";
export const TRY_LINE = `Opens a new Ask AI session with ${SAMPLE_NAME} (${SAMPLE_SYMBOL}) selected. You can change the stock.`;
export const TRY_LOGGED_OUT = "Without logging in you see stored sample answers for this one company. A different stock needs a log-in.";
export const TRY_FREE = "With a free account you get 3 live questions a day on any stock.";
export const QUESTIONS_TITLE = "The 5 questions";
export const STEP_WORD = "Step";

export interface LearnStep {
  /** 1 to 6, shown as "Step 1". */
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
    look: "Delivery % is the share of the day's traded shares that were taken for holding. Volume vs usual compares the last five days with the twenty days before. Both are on the Overview tab.",
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
];

/** The five fixed questions, in the order Ask AI shows them. */
export const FIVE_QUESTIONS: string[] = [ASK_QUESTIONS.points, ASK_QUESTIONS.financials, ASK_QUESTIONS.holders, ASK_QUESTIONS.management, ASK_QUESTIONS.price];

/** The step names, shown the same on both tabs. */
export const STEP_NAMES = LEARN_STEPS.map((s) => s.name);
