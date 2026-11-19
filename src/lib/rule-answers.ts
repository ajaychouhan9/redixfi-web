// Answers saved to a rule and export of a rule (Stock Check release 2, 20 Nov 2026): copy and small pure helpers, no React.
import type { RuleAnswer } from "@/lib/api/mutations";

export const ADD_TO_RULE = "Add to my rule";
export const ADD_TO_RULE_CHOOSE = "Choose a rule to add this answer to";
export const NO_RULES_YET = "You have no saved rule yet. Save one on the Stock Check page first, then add answers to it.";
export const SAVE_A_RULE_LINK = "Open Stock Check";
export const ADDED_TO = (name: string): string => `Added to "${name}"`;
export const ALREADY_IN = (name: string): string => `Already in "${name}"`;
export const SAVE_FAILED = "The answer could not be added just now. Please try again.";

export const ANSWERS_TITLE = (n: number): string => `Saved answers (${n})`;
export const ANSWERS_EMPTY = "No answers saved to this rule yet. In Ask AI, press Add to my rule under an answer.";
export const ANSWERS_NOTE = (limit: number): string => `Up to ${limit} answers can be saved to one rule.`;
export const REMOVE_ANSWER = "Remove";
export const ANSWER_AS_OF = (date: string | null): string => `Answer as of ${date ?? "date not available"}`;

export const EXPORT_PDF = "Download PDF";
export const EXPORT_CSV = "Download CSV";
export const SAMPLE_REPORT = "See a sample report";
export const SAMPLE_PDF_PATH = "/samples/rule-report-sample.pdf";
export const SAMPLE_CSV_PATH = "/samples/rule-report-sample.csv";
export const EXPORT_LEAD = "The export holds the rules, the stocks that meet them and the saved answers, each with its date and sources.";
export const EXPORT_FREE_NOTE = "Downloading a rule report is on Basic and Pro. The sample shows the format: one example company, no real data.";
export const EXPORT_FAILED = "The report could not be prepared just now. Please try again in a moment.";

export const answerSources = (a: { sources: RuleAnswer["sources"] }): string =>
  a.sources.map((s) => `${s.label ?? ""}${s.detail ? ` (${s.detail})` : ""}`.trim()).filter(Boolean).join("; ");

/** Whether an Ask AI answer can be saved to a rule: a real answer (not a decline or a question back), with a conversation to copy it from. */
export function canSaveAnswer(m: { role: string; text: string; quotaUnchanged?: boolean; choices?: unknown[] | null; error?: boolean }, conversationId: string | null): boolean {
  return m.role === "ai" && !!conversationId && !!m.text.trim() && !m.error && !m.quotaUnchanged && !(m.choices && m.choices.length > 0);
}

/** The plain message for an API error from the save (the server's own sentence when it sent one). */
export function saveErrorText(detail: unknown): string {
  const d = detail as { message?: string } | string | undefined;
  if (typeof d === "string" && d) return d;
  if (d && typeof d === "object" && typeof d.message === "string" && d.message) return d.message;
  return SAVE_FAILED;
}
