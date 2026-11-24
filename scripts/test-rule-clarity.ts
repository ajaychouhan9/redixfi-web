// 25 Nov 2026: rule name, balanced typical values, clear report updates, reports inside each rule, a changing list explained. Source and pure-function checks;
// the browser suite (scripts/browser-report-flow.py) covers the screens.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as RF from "../src/lib/report-flow.ts";
import { defaultRuleName, savedLine } from "../src/lib/my-rules.ts";
import {
  COMMON_RULES, DAILY_STEPS, EMPTY_RULES, FILL_COUNT, FILL_NOTE, TOTAL_FIELDS, countsByStep, mostRemovedStep, rulesSetCount, splitCounts, typicalRules, type LadderData,
} from "../src/lib/stock-check.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// ---- Part 1: the rule name
assert.equal(RF.NAME_LABEL, "Name your rule (required)");
assert.equal(RF.NAME_NEEDED, "Give your rule a name to continue.");
assert.equal(defaultRuleName(new Date("2026-11-24T10:00:00Z")), "My rule 24 Nov");
assert.equal(defaultRuleName(new Date("2026-11-23T20:00:00Z")), "My rule 24 Nov", "the India date, not the browser's: 01:30 on 24 Nov in India");
assert.equal(defaultRuleName(new Date("2026-12-31T19:00:00Z")), "My rule 1 Jan");
const ladder = strip(read("components/app/stock-check/ShortlistLadder.tsx"));
const parts = strip(read("components/app/stock-check/MyRulesParts.tsx"));
assert.ok(ladder.includes("setName(defaultRuleName())"), "a new rule starts with My rule and today's date");
assert.ok(parts.includes("NAME_LABEL") && parts.includes('aria-required="true"') && parts.includes("save-name-message"), "the box is marked required and shows the message");
const need = (ladder.match(/requireName\(\)/g) ?? []).length;
assert.ok(need >= 4, "Show stocks, View stocks (a step), Create report and the sheet itself check the name");
assert.ok(ladder.includes("onNameMissing={() => void requireName()}") && parts.includes("onNameMissing()"), "Save checks the name too");
assert.ok(!parts.includes('placeholder={NAME_PLACEHOLDER}'), "no second name box at the bottom");

// ---- Part 2: the typical set
assert.equal(FILL_NOTE, "Typical numbers from published methods. Change any of them. A field with no published number is left blank.", "every number is inside a published range, so the note stays");
assert.deepEqual(typicalRules(), COMMON_RULES);
const T = COMMON_RULES;
assert.deepEqual(
  { mc: T.mcMin, py: T.profitYears, sg3: T.sales3, pg3: T.profit3, sgq: T.salesQ, pgq: T.profitQg, roe: T.roe, roce: T.roce, de: T.de, pl: T.pledge, dl: T.delivery, pe: T.pe, h52: T.near52, avg: T.avgDays },
  { mc: "500", py: "5", sg3: "10", pg3: "10", sgq: "10", pgq: "25", roe: "15", roce: "15", de: "1.5", pl: "10", dl: "40", pe: "30", h52: "25", avg: "200" },
);
assert.deepEqual([T.volDay, T.volRatio, T.vol, T.chgMonths, T.chgMin, T.growthUp], ["", "", "", "", "", false], "the latest-day volume, volume vs usual, swings, price change and the growth box stay blank");
// the ranges the numbers were chosen inside (the test and the table are in api/docs/TYPICAL_VALUES_20261125.md)
const RANGE: Record<string, [number, number]> = { mcMin: [500, 2000], profitYears: [4, 5], sales3: [10, 20], profit3: [10, 25], salesQ: [10, 20], profitQg: [10, 25], roe: [12, 20], roce: [12, 20], de: [0.5, 2], pledge: [5, 25], delivery: [40, 60], pe: [15, 30], near52: [10, 25] };
for (const [k, [lo, hi]] of Object.entries(RANGE)) {
  const v = Number((T as unknown as Record<string, string>)[k]);
  assert.ok(v >= lo && v <= hi, `${k} ${v} is inside its published range ${lo} to ${hi}`);
}
assert.equal(TOTAL_FIELDS, 20);
assert.equal(rulesSetCount(typicalRules()), 15);
assert.equal(FILL_COUNT(rulesSetCount(typicalRules())), "Filled 15 of 20 fields");
const day20 = JSON.parse(read("../scripts/typical-20day.json")) as { day: string; stocks: number; new: number | null }[];
assert.equal(day20.length, 20);
assert.ok(day20.every((d) => d.stocks >= 5 && d.stocks <= 10), "on each of the last 20 trading days the set returned 5 to 10 stocks");
assert.ok(day20.filter((d) => (d.new ?? 0) > 0).length >= 14, "and the list changed from day to day");
assert.ok(parts.includes("ladder-fill-count") && ladder.includes("FILL_COUNT(rulesSetCount(t))"), "Filled N of M fields shows after Fill");
assert.ok(!/Try an example rule/i.test(ladder + parts + strip(read("lib/stock-check.ts"))), "no separate Try an example rule");

// ---- Part 2: match line, zero match, the two counts
const COLS = ["mc", "eps", "py", "sgq", "pgq", "sg3", "pg3", "roe", "roce", "rna", "de", "pl", "vol", "vr", "dl", "pe", "gs", "h52", "r1", "r3", "r6", "a50", "a200", "vd"];
const row = (o: Record<string, number | null>): (number | null)[] => COLS.map((c) => (c in o ? o[c] : null));
const data: LadderData = {
  version: 1, as_of: "2026-11-23", fund_quarter_end: null, built_at: "x", cols: COLS,
  rows: [
    row({ mc: 900, eps: 2, roe: 20, de: 0.5, dl: 55, vd: 2 }), row({ mc: 900, eps: 2, roe: 20, de: 0.5, dl: 20, vd: 2 }), row({ mc: 900, eps: 2, roe: 20, de: 0.5, dl: 55, vd: 0.5 }),
    row({ mc: 90, eps: 2, roe: 20, de: 0.5, dl: 55, vd: 2 }), row({ mc: 900, eps: 2, roe: 5, de: 0.5, dl: 55, vd: 2 }),
  ],
};
assert.equal(RF.NO_MATCH_LINE(3), "No stocks match. Step 3 removed the most. Try loosening it.");
const loose = { ...EMPTY_RULES, mcMin: "500", roe: "15", delivery: "50" };
assert.deepEqual(countsByStep(data, loose), [4, 4, 3, 3, 2, 2, 2]);
assert.equal(mostRemovedStep(data, loose), 0, "three steps removed one stock each: the earliest of equals wins");
assert.equal(mostRemovedStep(data, { ...EMPTY_RULES, mcMin: "5000" }), 0, "nothing passes the first rule: step 1 removed the most");
assert.equal(mostRemovedStep(data, { ...EMPTY_RULES, mcMin: "50", roe: "90", de: "0.1" }), 2);
assert.equal(mostRemovedStep(data, EMPTY_RULES), null, "no rule set: no step removed anything");
assert.deepEqual(DAILY_STEPS, [4, 6], "steps 5 and 7");
const split = splitCounts(data, { ...EMPTY_RULES, mcMin: "500", delivery: "50", volDay: "1.5" });
assert.deepEqual(split, { steady: 4, all: 2, hasDaily: true });
assert.equal(splitCounts(data, { ...EMPTY_RULES, mcMin: "500" }).hasDaily, false, "no daily step: the two-count line is not shown");
assert.equal(RF.STEADY_LINE(40, 8), "40 stocks pass the steady steps. 8 also pass the daily steps.");
assert.equal(RF.STEADY_LINE(1, 1), "1 stock passes the steady steps. 1 also passes the daily steps.");
assert.ok(ladder.includes("ladder-nomatch") && ladder.includes("ladder-nomatch-open") && ladder.includes("ladder-split"), "the page shows the zero line with a link to the step, and the two counts");

// ---- Part 3: a changing list
assert.equal(RF.FIGURES_AS_OF("23 Nov 2026"), "Figures as of 23 Nov 2026");
assert.equal(RF.DAILY_LINE, "Steps 5 and 7 can change the list every day. The other steps change only when new results come out.");
assert.equal(RF.COMPARE_LINE(3, 2), "Compared with your last result: 3 added, 2 dropped");
assert.equal(savedLine({ updated_at: "2026-11-20T10:00:00Z", latest_run: { count: 21, as_of: "2026-11-19", run_date: "2026-11-20" } }), "Saved 20 Nov 2026 · 21 stocks · Figures as of 19 Nov 2026");
assert.equal(savedLine({ updated_at: "2026-11-20T10:00:00Z", stock_count: 0 }), "Saved 20 Nov 2026", "a stored 0 is not shown");
const names = strip(read("components/app/stock-check/StockNames.tsx"));
assert.ok(names.includes("FIGURES_AS_OF(asOf)"), "every names list can show the date of its figures");
assert.ok(ladder.includes("asOf={figuresDate}") && ladder.includes("open-rule-asof") && ladder.includes("DailyNote") && ladder.includes("readonly-daily-line"), "lists and the saved line show the figures date; both rule pages show the daily line");
const shelf = strip(read("components/app/stock-check/SavedResults.tsx"));
assert.ok(shelf.includes("getRunChanges") && shelf.includes("compare-line") && shelf.includes("<CompareBlock ruleId={rule.id}"), "the result card compares with the last result and loads the filter figures on request");
assert.ok(ladder.includes("<CompareBlock ruleId={active.id}"), "the opened rule shows the same comparison for its latest result");
assert.ok(!/alert|notif|push/i.test(strip(read("components/app/stock-check/SavedResults.tsx")).replace(/aria-live|role="status"/g, "")), "no alert, push message or notice about stocks entering or leaving");

// ---- Part 4: reports made again
assert.equal(RF.UPDATE_REPORT, "Update report");
assert.equal(RF.SAVED_ANSWERS_LINE(19, 20, 1), "19 of 20 answers are already saved. Only 1 new question will be asked and it uses 1 question.");
assert.equal(RF.SAVED_ANSWERS_LINE(15, 20, 5), "15 of 20 answers are already saved. Only 5 new questions will be asked and they use 5 questions.");
assert.equal(RF.SAVED_ANSWERS_LINE(20, 20, 0), "All 20 answers are already saved. Nothing new will be asked and no questions are used.");
assert.equal(RF.REUSED_LINE(19, 1), "19 answers reused, 1 new answer.");
assert.equal(RF.REUSED_LINE(1, 4), "1 answer reused, 4 new answers.");
assert.equal(RF.ANSWERED_OF(19, 20), "19 of 20 answered");
assert.equal(RF.NOT_CHARGED, "The question was not charged.");
const sheet = strip(read("components/app/stock-check/ReportSheet.tsx"));
assert.ok(sheet.includes("isUpdate ? UPDATE_REPORT : CREATE_REPORT") && sheet.includes("SAVED_ANSWERS_LINE(") && sheet.includes("REUSED_LINE("), "the sheet says Update report, the saved answers and what was reused");
assert.ok(shelf.includes("ANSWERED_OF(run.answered") && shelf.includes("run.unanswered") && shelf.includes("NOT_CHARGED") && shelf.includes("REUSED_LINE(run.last_report"), "each report card: N of M answered, each unanswered item with its reason, reused and new");

// ---- Part 5: reports inside the rule
assert.ok(sheet.includes("onStarted?.(ref)") && ladder.includes("onStarted={(ref) => goReports(ref.ruleId)}"), "after a report starts the person is taken to that rule's reports");
assert.ok(ladder.includes("rule-reports-section") && ladder.includes("<RuleReports rule={ruleOpen}") && ladder.indexOf("rule-reports-section") > ladder.indexOf("read-card"), "a Reports section sits under View stocks on the opened rule");
assert.ok(ladder.includes("<ResultsTab") && shelf.includes("results-rule") && shelf.includes("REPORTS_FOR(open.name)") && shelf.includes("results-back"), "Results lists the rules first; a rule opens its reports");
assert.ok(shelf.includes("shelf-open-pdf") && shelf.includes("shelf-download") && shelf.includes("shelf-add-ai") && shelf.includes("saved-result-delete") && shelf.includes("shelf-open-screen") && shelf.includes("shelf-free-note"), "Open PDF, Download, Add AI, Delete and the Free on-screen report are kept");

// ---- wording guard on the new copy
const copy = [strip(read("lib/report-flow.ts")), strip(read("lib/stock-check.ts")), strip(read("lib/my-rules.ts")), ladder, parts, shelf, sheet, names].join("\n")
  .replace(/className="[^"]*"/g, "").replace(/className=\{`[^`]*`\}/g, "").replace(/data-testid="[^"]*"/g, "").replace(/target="_blank"/g, "").replace(/e\.target/g, "");
const BANNED = /\b(recommended?|best|top|strong|standard|new today|fresh picks?|today's picks?|buy|buying|sell|selling|targets?|picks?|bullish|bearish|skip|avoid|candidates?|safe|score|verdict)\b/gi;
const hits = (copy.match(BANNED) ?? []).map((h) => h.toLowerCase()).filter((h) => h !== "top");
assert.deepEqual(hits, [], "banned words in the new copy: " + JSON.stringify(hits));
assert.ok(!/(^|[^-\w:])top\b(?!-)/i.test(copy.replace(/top-\w+|top:|scrollTop|\.top\b/g, "")), "never top");
assert.ok(!/\b(will rise|will fall|going to|should buy|expect)\b/i.test(copy), "no forecast or advice wording");
console.log("rule clarity tests: ok");
