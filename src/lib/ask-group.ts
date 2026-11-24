// "Ask AI about these stocks" (Stock Check, 20 Nov 2026): the five fixed questions for a group of stocks picked from a shortlist. Pure functions, no React.
// The pipeline answers a question well for ONE company (the other four become a plain side-by-side card when several are named), so a group question is asked for each
// stock on its own and the answers are put together in one reply.
import { ASK_QUESTIONS } from "@/lib/read-company";
import { ASK_NONE, ASK_STATUS, ASK_STATUS_OTHER } from "@/lib/saved-results";

export const ASK_GROUP_MAX = 10; // 24 Nov 2026: up to 10 stocks (was 8); a report holds up to 10 stocks too
export const ASK_GROUP_TITLE = "Ask AI about these stocks";
export const ASK_GROUP_LEAD = "Tick up to 10 stocks, then press Ask AI. Nothing is sent until you press Send.";
export const ASK_ALL_LABEL = "Ask all 5";
// "Read your shortlist with AI" (21 Nov 2026): a block of its own after the list, not a step.
export const ASK_BLOCK_TITLE = "Ask AI";
export const ASK_BLOCK_ASK = "\"Ask AI\" is one question in chat.";
export const ASK_BLOCK_ASK_ALL = "\"Ask all 5\" makes a saved report for each ticked stock and uses questions from your plan.";
export const askAllUses = (stocks: number, questions: number): string =>
  `Ask all 5 for ${stocks} ${stocks === 1 ? "stock" : "stocks"} uses ${questions} ${questions === 1 ? "question" : "questions"} from your plan. Nothing is used until you confirm.`;
export const ASK_ALL_LEAD = "Runs the full check on every ticked stock: points to watch, what management said, three years of numbers and holdings, with sources.";

// 22 Nov 2026: with 2 to 10 stocks, any of the five questions (or a typed one) is asked for every stock, one after another, and shown as ONE reply, stock by stock in the order
// selected. Each stock counts as one question. The number is shown first and confirmed; if it is more than what is left, the person is offered fewer stocks.
export const GROUP_ALL_NOTE = "Each question is asked for every stock here and shown as one reply, in the order selected. Each stock counts as one question.";
export const groupUses = (n: number, left: number | null): string =>
  left === null ? `This will use ${n} ${n === 1 ? "question" : "questions"}.` : `This will use ${n} ${n === 1 ? "question" : "questions"}. You have ${left} left.`;
export const groupNotEnough = (n: number, left: number): string =>
  left > 0 ? `You have ${left} left, which is not enough for all ${n} stocks.` : `You have no questions left, so this cannot run.`;
export const groupRunFewer = (left: number): string => `Run for the first ${left} ${left === 1 ? "stock" : "stocks"}`;
export const GROUP_RUN = "Run it";
export const GROUP_CANCEL = "Cancel";
export const groupProgress = (done: number, n: number): string => `Asking ${Math.min(done + 1, n)} of ${n}…`;
export const groupFailedLine = (symbols: string[]): string =>
  `${joinNames(symbols)} could not be answered. ${symbols.length === 1 ? "It was" : "They were"} not charged. You can ask again for ${symbols.length === 1 ? "that stock" : "those stocks"}.`;
export const groupNotRunLine = (symbols: string[]): string => `Not asked, because the limit was reached: ${joinNames(symbols)}. These were not charged.`;

/** Questions left to use now: the daily number, and (Basic and Pro) the month plus any added questions when that is lower. Null when the numbers are not loaded. */
export function askRemaining(u: { daily_limit: number | null; daily_used: number | null; monthly_limit: number | null; monthly_used: number | null; topup_questions_remaining: number } | null): number | null {
  if (!u || u.daily_limit === null) return null;
  const daily = Math.max(0, u.daily_limit - (u.daily_used ?? 0));
  if (u.monthly_limit === null) return daily;
  const monthly = Math.max(0, u.monthly_limit - (u.monthly_used ?? 0)) + Math.max(0, u.topup_questions_remaining ?? 0);
  return Math.min(daily, monthly);
}

/** The five questions as the sample text for a group: "for all N stocks" (not one stock's name). */
export function groupQuestionAll(key: string, n: number): string | null {
  if (!Object.prototype.hasOwnProperty.call(ASK_QUESTIONS, key)) return null;
  if (n <= 1) return null;
  const all = `all ${n} stocks`;
  const text: Record<string, string> = {
    points: `List the points to watch for ${all}.`,
    financials: `Show the sales, profit, margin and debt trend for the last 3 years for ${all}.`,
    holders: `Show recent promoter, insider and bulk or block deal activity for ${all}.`,
    management: `List the guidance, capex plans and risks mentioned in the latest concall and annual report for ${all}.`,
    price: `Show the last 10 days of price change and delivery % for ${all}.`,
  };
  return text[key] ?? null;
}

export const joinNames = (symbols: string[]): string => (symbols.length <= 1 ? (symbols[0] ?? "") : `${symbols.slice(0, -1).join(", ")} and ${symbols[symbols.length - 1]}`);

/** The five questions worded for a group: "this company" becomes the chosen company (or all selected stocks for the price question). */
export function groupQuestion(key: string, symbols: string[], focus: string | null): string | null {
  const base = Object.prototype.hasOwnProperty.call(ASK_QUESTIONS, key) ? ASK_QUESTIONS[key] : null;
  if (!base || !symbols.length) return null;
  const who = focus && symbols.includes(focus) ? focus : symbols[0];
  if (/this company/i.test(base)) return base.replace(/this company's/i, `${who}'s`).replace(/for this company/i, `for ${who}`).replace(/this company/i, who);
  return `${base.replace(/\.$/, "")} for ${who}.`;
}

export const GROUP_KEYS = Object.keys(ASK_QUESTIONS);

/** Tick or untick one stock, keeping the order of ticking and never going past the cap. Returns the new list and whether the cap stopped it. */
export function toggleSelected(current: string[], symbol: string, max = ASK_GROUP_MAX): { list: string[]; capped: boolean } {
  if (current.includes(symbol)) return { list: current.filter((s) => s !== symbol), capped: false };
  if (current.length >= max) return { list: current, capped: true };
  return { list: [...current, symbol], capped: false };
}

// 23 Nov 2026: answers for the stocks ticked on the Shortlist Lab are attached to the open rule's latest saved result.
export const GROUP_SAVED_NOTE = "Saved to your result";
export const GROUP_SAVE_BUTTON = "Save result with answers";
export const GROUP_SAVE_NAME_LABEL = "Name this rule";
export const GROUP_SAVE_NAME_PLACEHOLDER = "e.g. My first rule";
export const GROUP_SAVE_FAILED = "The answers could not be saved to your result right now. They are still shown here.";
export const groupSavedCount = (n: number): string => `${GROUP_SAVED_NOTE} (${n} ${n === 1 ? "answer" : "answers"}).`;

// 23 Nov 2026: a question and stock pair that already has an answer is not asked again (and not charged) unless the person chooses to.
export const ASK_AGAIN_LABEL = "Ask again for the stocks that already have an answer. This uses questions.";
export const alreadyAnswered = (symbols: string[]): string => `Already answered, so not asked again and not charged: ${joinNames(symbols)}.`;
export const ALL_ANSWERED = "Every stock here already has an answer to this question. Nothing will be used unless you ask again.";
/** The question text of an answer, matched to one of the five questions for that stock; null for a typed question. */
export function questionKeyOf(question: string, symbol: string): string | null {
  const norm = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
  const q = norm(question);
  for (const key of GROUP_KEYS) {
    const t = groupQuestion(key, [symbol], symbol);
    if (t && norm(t) === q) return key;
  }
  return null;
}
/** The five questions already answered for one stock (distinct), from the answers saved on a result. */
export function answeredKeys(answers: { symbol: string | null; question: string | null }[], symbol: string): string[] {
  const keys = new Set<string>();
  for (const a of answers) {
    if (a.symbol !== symbol) continue;
    const k = questionKeyOf(a.question ?? "", symbol);
    if (k) keys.add(k);
  }
  return [...keys];
}
/** How many answers (of any question) are saved for one stock. */
export const answerCountFor = (answers: { symbol: string | null }[], symbol: string): number => answers.filter((a) => a.symbol === symbol).length;

/** The Ask AI status of one stock on a result: "3 of 5 answered", "2 answers" (typed questions) or "Not asked". */
export function askStatusText(answers: { symbol: string | null; question: string | null }[] | null, symbol: string): string {
  if (!answers) return ASK_NONE;
  const k = answeredKeys(answers, symbol).length;
  if (k > 0) return ASK_STATUS(k);
  const n = answerCountFor(answers, symbol);
  return n > 0 ? ASK_STATUS_OTHER(n) : ASK_NONE;
}
/** The first 8 stocks of a list (in list order) that have no answer at all yet, for "Tick next 8 not yet asked". */
export function nextNotAsked(symbols: string[], answers: { symbol: string | null }[] | null, max = ASK_GROUP_MAX): string[] {
  return symbols.filter((sym) => !answers || answerCountFor(answers, sym) === 0).slice(0, max);
}
