// Stock Check release 2 (20 Nov 2026): answers saved to a rule ("Add to my rule") and PDF / CSV export with a stored sample for Free.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  ADDED_TO, ADD_TO_RULE, ALREADY_IN, ANSWERS_EMPTY, ANSWERS_NOTE, ANSWERS_TITLE, ANSWER_AS_OF, EXPORT_CSV, EXPORT_FREE_NOTE, EXPORT_LEAD, EXPORT_PDF, NO_RULES_YET, SAMPLE_CSV_PATH,
  SAMPLE_PDF_PATH, SAMPLE_REPORT, SAVE_FAILED, answerSources, canSaveAnswer, saveErrorText,
} from "../src/lib/rule-answers.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// ---- E. Add to my rule
assert.equal(ADD_TO_RULE, "Add to my rule");
assert.equal(ADDED_TO("Growers"), 'Added to "Growers"');
assert.equal(ALREADY_IN("Growers"), 'Already in "Growers"');
assert.ok(NO_RULES_YET.includes("Save one on the Stock Check page first"));
assert.equal(ANSWERS_TITLE(3), "Saved answers (3)");
assert.equal(ANSWER_AS_OF("2026-11-19"), "Answer as of 2026-11-19");
assert.equal(ANSWER_AS_OF(null), "Answer as of date not available");
assert.equal(ANSWERS_NOTE(40), "Up to 40 answers can be saved to one rule.");
assert.ok(ANSWERS_EMPTY.includes("Ask AI") && ANSWERS_EMPTY.includes("saved to your result"));
const ok = { role: "ai", text: "Points: pledge 0.54%.", quotaUnchanged: false };
assert.equal(canSaveAnswer(ok, "c1"), true);
assert.equal(canSaveAnswer(ok, null), false, "no conversation, nothing to copy from");
assert.equal(canSaveAnswer({ ...ok, role: "user" }, "c1"), false);
assert.equal(canSaveAnswer({ ...ok, text: "  " }, "c1"), false);
assert.equal(canSaveAnswer({ ...ok, quotaUnchanged: true }, "c1"), false, "a decline or a question back is not an answer");
assert.equal(canSaveAnswer({ ...ok, choices: [{}] }, "c1"), false);
assert.equal(canSaveAnswer({ ...ok, error: true }, "c1"), false, "a local error line is not an answer");
assert.equal(saveErrorText({ message: "This rule already holds 40 saved answers. Remove one to add another." }), "This rule already holds 40 saved answers. Remove one to add another.");
assert.equal(saveErrorText("plain"), "plain");
assert.equal(saveErrorText(undefined), SAVE_FAILED);
assert.equal(saveErrorText({}), SAVE_FAILED);
assert.equal(answerSources({ sources: [{ label: "Annual report FY2025-26", detail: "Filed 2 Jun 2026" }, { label: "NSE pledge record" }] }), "Annual report FY2025-26 (Filed 2 Jun 2026); NSE pledge record");

const panel = strip(read("components/app/ask/AskRedixFi.tsx"));
assert.ok(panel.includes("canSaveAnswer(m, conversationId)") && panel.includes("<AddToRuleButton conversationId={conversationId as string} text={m.text}"), "the button is under each answer in the Ask panel");
const btn = strip(read("components/app/ask/AddToRuleButton.tsx"));
assert.ok(btn.includes("saveRuleAnswer(token, rule.id, { conversation_id: conversationId, answer_text: text, symbol })") && !btn.includes("sources:") && !btn.includes("answer:"), "the client names the answer; it does not send its own sources or text as a record");
assert.ok(btn.includes("listMyScreens(token)") && btn.includes('state === "none"') && btn.includes("NO_RULES_YET"), "pick a rule, or say there is none");
const api = strip(read("lib/api/mutations.ts"));
assert.ok(api.includes("/my-screens/${encodeURIComponent(ruleId)}/answers") && api.includes("export.${kind}"), "the calls");

// ---- F. export
assert.equal(EXPORT_PDF, "Download PDF");
assert.equal(EXPORT_CSV, "Download CSV");
assert.equal(SAMPLE_REPORT, "See a sample report");
assert.equal(SAMPLE_PDF_PATH, "/samples/rule-report-sample.pdf");
assert.ok(EXPORT_LEAD.includes("each with its date and sources"));
assert.ok(EXPORT_FREE_NOTE.includes("one example company, no real data"));
const rr = strip(read("components/app/stock-check/RuleReport.tsx"));
const sr = strip(read("components/app/stock-check/SavedResults.tsx"));
// [24 Nov 2026 flow changed] assert.ok(sr.includes("isPaidEntitled(user)") && /paid \? \([\s\S]*?saved-result-pdf[\s\S]*?saved-result-csv[\s\S]*?\) : \([\s\S]*?saved-result-sample/.test(sr) && sr.includes("StockPdfButton"), "paid: full report PDF, CSV and a PDF for one stock; Free: the sample link only");
assert.ok(!rr.includes("rule-export-pdf") && !rr.includes("downloadRuleExport"), "the older per-rule export buttons are gone");
assert.ok(sr.includes("href={SAMPLE_PDF_PATH}") && sr.includes('target="_blank"') && !/downloadRunReport[\s\S]{0,40}SAMPLE/.test(sr), "the sample is a stored file opened in a new tab, not an API call");
// [24 Nov 2026 flow changed] assert.ok(sr.includes("<AnswerItem") && sr.includes("saved-result-answers") && !strip(read("components/app/stock-check/MyRulesParts.tsx")).includes("<RuleReport"), "export and saved answers are inside each saved result card");
// the stored sample files: fixed, one example company, no user data
for (const [path, head] of [["public/samples/rule-report-sample.pdf", "%PDF-"], ["public/samples/rule-report-sample.csv", ""]] as const) {
  assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} exists`);
}
assert.ok(readFileSync(new URL("../public/samples/rule-report-sample.pdf", import.meta.url)).subarray(0, 5).toString() === "%PDF-");
assert.equal(SAMPLE_CSV_PATH, "/samples/rule-report-sample.csv");
const csv = readFileSync(new URL("../public/samples/rule-report-sample.csv", import.meta.url), "utf8");
for (const needle of ["SAMPLE: one example company, no real data", "HINDUNILVR", "Figures as of", "Not asked yet", "RedixFi shows market data for information only", "Facts from filings. Not investment advice."]) assert.ok(csv.includes(needle), `sample csv has ${needle}`);
assert.equal((csv.match(/^HINDUNILVR,HINDUSTAN UNILEVER LTD.,/gm) ?? []).length, 5, "one example company, one row for each of the five questions");
assert.ok(!/@|u_test|user_id/.test(csv), "no user data in the sample");

// ---- wording guard on the new copy
const copy = [strip(read("lib/rule-answers.ts")), btn, rr].join("\n").replace(/target="_blank"/g, "").replace(/className="[^"]*"/g, "").replace(/className=\{`[^`]*`\}/g, "").replace(/data-testid="[^"]*"/g, "");
const BANNED = /\b(buy|buying|sell|selling|targets?|picks?|bullish|bearish|strong signal|catch a falling knife|skip|avoid|candidates?|high conviction|red flags?|turnaround|top stocks|best stocks|quality stocks)\b/gi;
assert.deepEqual((copy.match(BANNED) ?? []).map((h) => h.toLowerCase()), [], "banned words in the new copy");
assert.ok(!/\b(top|best)\b/i.test(copy) && !/\b(will rise|will fall|going to)\b/i.test(copy), "no ranking or forecast wording");
console.log("rules release 2 tests: ok");
