// Plain wording and small pure helpers for "View stocks", "Create report" and the Results shelf (24 Nov 2026).
// No score, no verdict, no ranking, no advice. Questions are counted in plain numbers.
import { stocksText } from "@/lib/my-rules";

export const BACK_BUTTON = "Back";
export const EDIT_RULE = "Edit rule";
export const NO_SAVED_RESULT = "No saved result yet";
export const SEE_IN_RESULTS = "See details in Results";
export const NAMES_SEARCH = "Search by name or symbol";
export const NAMES_MORE = "Show more";
export const NAMES_NONE = "No stock matches that search.";
export const NAMES_NONE_LEFT = "No stock is left at this point.";
export const NAMES_TITLE_LIVE = "Stocks that meet your rule today";
export const NAMES_TITLE_AFTER = (step: number): string => `Stocks left after step ${step}`;
export const CREATE_REPORT = "Create report";
export const CREATE_WITHOUT_AI = "Create without AI";
export const CUSTOMISE = "Customise";
export const SHEET_TITLE = "Create report";
export const SHEET_STOCKS = "Stocks";
export const SHEET_QUESTIONS = "Questions";
export const SHEET_TICK_UP_TO = (max: number): string => `This list has more than ${max} stocks. Tick up to ${max} for the report. Nothing is chosen for you.`;
export const SHEET_FREE_ONE = "A Free report covers 1 stock and uses your 5 questions for the day.";
export const SHEET_NO_STOCKS = "Choose at least one stock.";
export const SHEET_NO_QUESTIONS = "Choose at least one question.";
export const CUSTOM_ADD = "Add your own question";
export const CUSTOM_PLACEHOLDER = "e.g. What did management say about debt in the latest concall?";
export const CUSTOM_CHECKING = "Checking your question…";
export const CUSTOM_CHECK_NOTE = "Your question is checked first. Checking uses no questions.";
export const CUSTOM_ADD_BUTTON = "Check and add";
export const CUSTOM_REMOVE = "Remove";
export const CUSTOM_TOTAL = (stocks: number, per: number): string => `${stocks} ${stocks === 1 ? "stock" : "stocks"} × ${per} ${per === 1 ? "question" : "questions"} = ${stocks * per} of 50 answers`;
export const REPORT_LIMIT_LINE = "A report holds up to 10 stocks and 50 answers, add-on questions included.";
export const USES_MONTH = (n: number, left: number): string => `This uses ${n} ${n === 1 ? "question" : "questions"}. You will have ${left} left this month.`;
export const USES_TODAY = (n: number, left: number): string => `This uses ${n} ${n === 1 ? "question" : "questions"}. You will have ${left} left today.`;
export const ALREADY_ANSWERED_LINE = (n: number): string => `${n} ${n === 1 ? "answer is" : "answers are"} already in this result, so ${n === 1 ? "it is" : "they are"} not asked again and not charged.`;
export const OFFER_FITS = "Your questions are not enough for this report. You can create one of these instead:";
export const offerLabel = (o: { stocks: number; questions: number }): string => `${o.stocks} ${o.stocks === 1 ? "stock" : "stocks"} × ${o.questions} ${o.questions === 1 ? "question" : "questions"}`;
export const POOL_EMPTY = (date: string): string => `You have used your report questions. They reset on ${date}. Add-on questions work now.`;
export const ADDON_LINK = "Add questions";
export const ADDON_LINE = (have: number, used: number): string =>
  `You also have ${have} add-on ${have === 1 ? "question" : "questions"}. They are used after your plan questions${used > 0 ? `, so this report uses ${used} of them` : ""}.`;
export const FREE_UPGRADE_REPORT = "A report for more than 1 stock is on Basic and Pro.";
export const FREE_UPGRADE_DOWNLOAD = "Downloads are on Basic and Pro. You can read your report here on screen.";
export const FREE_UPGRADE_SAVE = "Free keeps 1 saved result for each rule. Basic keeps 10 and Pro keeps 30.";
export const FREE_UPGRADE_QUESTIONS = "You have used today's 5 questions. They reset tomorrow. Basic and Pro have monthly question pools, and Basic and Pro can add question packs.";
export const SEE_PRICING = "See plans and pricing";
export const BUILDING = (done: number, total: number): string => `Building your report: ${done} of ${total} answers`;
export const BUILDING_LEAVE = "You can leave this page. The report will be in Results when it is ready.";
export const BUILD_DONE = "Your report is ready in Results.";
export const BUILD_FAILED_SOME = (n: number): string => `${n} ${n === 1 ? "answer" : "answers"} could not be made. ${n === 1 ? "It was" : "They were"} not charged and show as not asked.`;
export const SAVED_AS_REPORT = (name: string, date: string): string => `Saved to Results: ${name}, ${date}.`;
export const SHELF_TITLE = "Saved reports";
export const SHELF_NONE = "No saved reports yet. Open a rule, press View stocks, then Create report.";
export const OPEN_REPORT = "Open PDF";
export const OPEN_ON_SCREEN = "Open report";
export const DOWNLOAD = "Download";
export const ADD_AI_MORE = "Add AI for more stocks";
export const SHELF_DELETE = "Delete";
export const SHELF_KEEP = "Keep it";
export const SHELF_DELETE_NOTE = "The answers saved with this report are deleted too.";
export const SHELF_DELETE_CONFIRM = "Delete this report";
export const SHELF_STOCKS_LINE = (count: number, answered: number): string => `${stocksText(count)} · ${answered} ${answered === 1 ? "answer" : "answers"}`;
export const ADD_AI_LEAD = "Choose the stocks to add. Only the answers this report is missing are asked.";
export const NEXT_RESET = (date: string | null | undefined): string => (date ? ` They reset on ${date}.` : "");

/** Up to `max` stocks default to all of them when the list is small, otherwise none (the person ticks; nothing is chosen for them). */
export function defaultStocks(all: string[], max = 10): string[] {
  return all.length <= max ? [...all] : [];
}
export function toggleStock(list: string[], symbol: string, max = 10): { list: string[]; capped: boolean } {
  if (list.includes(symbol)) return { list: list.filter((s) => s !== symbol), capped: false };
  if (list.length >= max) return { list, capped: true };
  return { list: [...list, symbol], capped: false };
}
/** Whether a stock-by-question report is inside the 10 stocks and 50 answers limit. */
export const withinLimits = (stocks: number, per: number, maxStocks = 10, maxAnswers = 50): boolean => stocks <= maxStocks && stocks * per <= maxAnswers;
/** The rules of one step up to `n` only: later steps are blank, so the names shown are the ones left after step n. */
export function questionsFor(keys: string[], custom: string[]): number {
  return keys.length + custom.length;
}

/** The one line at the top of an opened saved rule: its name, how many stocks its latest saved result has, and the date of that result. */
export const READONLY_LINE = (name: string, count: number, date: string): string => `${name} · ${stocksText(count)} · ${date}`;
export const RESULTS_LOGGED_OUT = "Log in to create reports and keep them here.";
