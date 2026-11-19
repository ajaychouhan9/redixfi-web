// "Ask AI about these stocks" (Stock Check, 20 Nov 2026): the five fixed questions for a group of stocks picked from a shortlist. Pure functions, no React.
// What the pipeline does with several stocks named in one question (checked on production data 20 Nov 2026): the price and delivery question is
// answered for all of them in one table; the other four become a plain side-by-side card, not the document answer. So those four are asked
// one company at a time: the person picks the company among the selected ones and the question names it.
import { ASK_QUESTIONS } from "@/lib/read-company";

export const ASK_GROUP_MAX = 8; // the existing lookup cap (settings.ASK_LOOKUP_MAX_STOCKS)
export const ASK_GROUP_TITLE = "Ask AI about these stocks";
export const ASK_GROUP_LEAD = "Tick up to 8 stocks on your list, then press Ask AI. A new Ask AI session opens with those stocks and the five questions ready. Nothing is sent until you press Send.";
export const ASK_ALL_LABEL = "Ask all 5";
export const ASK_ALL_LEAD = "Runs the full check on every ticked stock: points to watch, what management said, three years of numbers and holdings, with sources.";
export const ASK_GROUP_PANEL_NOTE = "Price and delivery can be asked for all of these stocks at once. The other four questions are answered one company at a time: tap a company, then a question.";

/** The question keys that can name every selected stock in one question. */
export const ALL_AT_ONCE: ReadonlySet<string> = new Set(["price"]);

export const joinNames = (symbols: string[]): string => (symbols.length <= 1 ? (symbols[0] ?? "") : `${symbols.slice(0, -1).join(", ")} and ${symbols[symbols.length - 1]}`);

/** The five questions worded for a group: "this company" becomes the chosen company (or all selected stocks for the price question). */
export function groupQuestion(key: string, symbols: string[], focus: string | null): string | null {
  const base = Object.prototype.hasOwnProperty.call(ASK_QUESTIONS, key) ? ASK_QUESTIONS[key] : null;
  if (!base || !symbols.length) return null;
  const who = ALL_AT_ONCE.has(key) && symbols.length > 1 ? joinNames(symbols) : focus && symbols.includes(focus) ? focus : symbols[0];
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
