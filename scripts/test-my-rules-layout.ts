// My rules layout (23 Nov 2026): three pages, a step list with Back / Next, one slim bar with ONE Show button, no count until a field is filled, hints, the price-swings
// control, Ask AI answers saved to the result, one report design. Source checks plus the pure functions.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ABOUT_MATCH, BACK_TO_STEPS, BLANK_LINE, EMPTY_RULES, EXAMPLES, NEXT_STEP, NO_FILTER_LINE, PAST_LINE, PV_FILTERS, RULES, SECTION_RULES, SECTION_RESULTS, stepRowText,
  SHOW_BUTTON, STEPS, VOL_LABEL, VOL_LINE, VOL_OPTIONS, countAfter, describeRules, exampleLine, fromParams, hasAnyRule, stepSetCount, toParams, volNumLabel,
  type Rules,
} from "../src/lib/stock-check.ts";
import { GROUP_SAVED_NOTE, GROUP_SAVE_BUTTON, groupSavedCount } from "../src/lib/ask-group.ts";
import { REPORT_CSV, REPORT_LEAD, REPORT_PDF, REPORT_STOCK_PDF } from "../src/lib/saved-results.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
const withRules = (p: Partial<Rules>): Rules => ({ ...EMPTY_RULES, ...p });

// ---- 1. two tabs: Rules and Results (saved rules are merged into Rules)
assert.deepEqual([SECTION_RULES, SECTION_RESULTS], ["Rules", "Results"]);
const ladder = strip(read("components/app/stock-check/ShortlistLadder.tsx"));
const parts = strip(read("components/app/stock-check/MyRulesParts.tsx"));
assert.ok(ladder.includes('role="tablist"') && ladder.includes('section === "rules" && page === "list"') && ladder.includes('section === "rules" && page === "edit"') && ladder.includes('section === "results" &&') && !ladder.includes("section-saved"), "Rules (list, then the rule page) and Results");
// ---- 2. the step list: a tick or "N set", a full page for a step with Back and Next
assert.equal(stepRowText(0, null), "Not set");
assert.equal(stepRowText(2, 120), "✓ 2 set · 120 left");
assert.equal(NEXT_STEP(2), "Next: Step 2");
assert.equal(BACK_TO_STEPS, "Back to the steps");
assert.equal(stepSetCount(withRules({ mcMin: "500" }), 0), 1);
assert.equal(stepSetCount(withRules({ roe: "15", roce: "15" }), 2), 2);
assert.equal(stepSetCount(withRules({ vol: "calmer", volNum: "25", delivery: "50" }), 4), 2, "the price-swings option counts once it has a number");
assert.equal(stepSetCount(withRules({ chgMonths: "3", chgMin: "10", avgDays: "200", near52: "10", volDay: "1.5" }), 6), 4);
assert.equal(stepSetCount(withRules({ chgMonths: "3" }), 6), 0, "a period alone is not a rule");
assert.ok(ladder.includes("stepRowText(n, l)") && ladder.includes("step-back") && ladder.includes("step-next") && ladder.includes("NEXT_STEP(stepDef.n + 2)") && ladder.includes("STEPS.map"), "a row for each step; a page with Back and Next");
// Fill typical values and Clear all sit above the steps; the name box, Save, Delete and the ONE result button are in the bottom block
for (const id of ["ladder-fill", "ladder-clear"]) assert.ok(parts.includes(id), `above the steps: ${id}`);
for (const id of ["save-name", "save-rules-button", "rule-delete", "rule-result-button"]) assert.ok(parts.includes(id), `the bottom block has ${id}`);
assert.ok(!parts.includes("save-new-button"), "Save as new is only asked when a changed rule is saved");
// ---- 3. the Rules list: Create new rule, the plan line once, tap to open
for (const id of ["create-new-rule", "saved-rule", "my-rules-plan"]) assert.ok(parts.includes(id), `Rules has ${id}`);
assert.equal((parts.match(/PLAN_LINE\(/g) ?? []).length, 1, "the plan limit line is shown once");
// ---- 4. results grouped by rule; ticks, answers, report buttons
const sr = strip(read("components/app/stock-check/SavedResults.tsx"));
// [24 Nov 2026 flow changed] assert.ok(sr.includes("export function ResultsByRule") && sr.includes('data-testid="results-group"') && sr.includes("saved-result-answers") && sr.includes("saved-result-diff") && sr.includes("saved-result-earlier") && sr.includes("onTick(r.id, s.symbol, f)"), "Results: groups by rule, answers, added and dropped, earlier values, ticks");
// ---- 5. ONE result button; the sticky Show bar is gone; no count until a field is filled; nothing listed with nothing filled
assert.equal(SHOW_BUTTON, "Show stocks that meet my rule");
// [24 Nov 2026 flow changed] assert.ok(ladder.includes("resultLabel={viewMode ? VIEW_STOCKS : SHOW_BUTTON}") && !ladder.includes("ladder-bar-show") && !ladder.includes("sticky top-"), "one result button; nothing sticky");
assert.equal(ABOUT_MATCH(2306), "2,306 stocks match your rule");
assert.equal(ABOUT_MATCH(1), "1 stock matches your rule");
assert.equal(NO_FILTER_LINE, "No filter applied. Fill at least one field.");
assert.ok(/\{filled && \(\s*<div[^>]*ladder-bar/.test(ladder) && ladder.includes("const filled = hasAnyRule(rules)"), "the count bar is drawn only when at least one field is filled");
// [24 Nov 2026 flow changed] assert.ok(/function show\([\s\S]*?if \(!hasAnyRule\(useRules\)\) \{\s*setNoFilter\(true\);\s*return;/.test(ladder), "Show with nothing filled lists nothing and says so");
assert.ok(!ladder.includes("stocks left"), "no 'stocks left' wording");
// ---- 6. only two lines of explanation on the page
assert.equal(BLANK_LINE, "Leave a field blank to ignore it.");
assert.equal(PAST_LINE, "Filters use past reported numbers. They do not tell what happens next.");
const copy = ladder + parts + strip(read("lib/stock-check.ts"));
for (const gone of ["Set the rules that matter to you", "The bar that stays on screen", "Open a rule you saved, or set the steps", "Why this rule", "Compare a company with others of its own kind", "A good company can still be priced high", "Bigger swings can go either way.", "Results are stocks that match your rule today.", "With no rules set"]) {
  assert.ok(!copy.includes(gone), `removed from the rules page: ${gone}`);
}
assert.ok(ladder.includes("left !== null && <p") && ladder.includes("COUNTS_NOTE"), "the counts note is shown only when a count is");
// ---- 7. an empty box looks empty; every field has one short example
assert.ok(ladder.includes("`e.g. ${EXAMPLES[d.key].value}`") && ladder.includes("placeholder:text-foreground-faint"), "a grey e.g. hint, never a bare number");
for (const d of RULES.filter((r) => r.op !== "gt0" && r.op !== "flag")) assert.ok(EXAMPLES[d.key], `${d.key} has an example`);
for (const k of ["volNum", "chgMin"]) assert.ok(EXAMPLES[k], `${k} has an example`);
assert.equal(exampleLine(EXAMPLES.volRatio.text), "e.g. 1.5 times");
assert.ok(!/many people|most people|popular|everyone/i.test(copy + JSON.stringify(EXAMPLES)), "no popularity claim anywhere");
// ---- 8. step 7: an example and one plain line under every field, the two ideas folded away
for (const f of PV_FILTERS) {
  assert.ok(f.line.length > 20 && f.example.startsWith("e.g. "), `${f.id}: a plain line and an example`);
  assert.ok(ladder.includes(`pv-\${id}-line`) && ladder.includes("<details") && ladder.includes(`pv-\${id}-fold`), "folded away");
}
assert.ok(ladder.includes('placeholder="e.g. 10"') && ladder.includes('placeholder="e.g. 1.5"'), "the Price and volume boxes show e.g. hints");
// ---- 9. the price-swings control: a clear name, plain words, the same stored values
assert.equal(VOL_LABEL, "Day-to-day price swings");
assert.ok(VOL_LINE.includes("21 trading days") && VOL_LINE.includes("compared with other stocks"));
assert.deepEqual(VOL_OPTIONS.map((o) => o[0]), ["", "calmer", "active"]);
assert.equal(VOL_OPTIONS[1][1], "Calmer: swung less than most stocks");
assert.equal(VOL_OPTIONS[2][1], "More active: swung more than most stocks");
assert.equal(volNumLabel("calmer"), "Swung more than at most");
assert.equal(volNumLabel("active"), "Swung more than at least");
assert.ok(ladder.includes("rule-vol-select") && !ladder.includes('type="radio"'), "a select, not a bare checkbox or radio");
assert.deepEqual(toParams(withRules({ vol: "calmer", volNum: "25" })), { volatility_max: 25 }, "saved values are unchanged");
assert.deepEqual(toParams(withRules({ vol: "active", volNum: "75" })), { volatility_min: 75 });
assert.equal(fromParams({ volatility_max: 25 } as Record<string, unknown>).vol, "calmer", "an old saved rule opens the same way");
assert.deepEqual(describeRules(withRules({ vol: "calmer", volNum: "25" })), ["Day-to-day price swings: calmer, swung more than at most 25% of stocks"]);
// ---- 10. Ask AI: each stock's answer in its own card, saved to the result, or one button
const ask = strip(read("components/app/ask/AskRedixFi.tsx"));
assert.ok(ask.includes("saveRuleAnswer(token, ruleId") && ask.includes("saveGroupToResult") && ask.includes("getLabLink()") && ask.includes('data-testid="ask-group-saved"') && ask.includes('data-testid="ask-group-save"'), "answers are attached to the result, with a button when there is none");
assert.ok(ask.includes("link.hasResult") || ask.includes("auto"), "automatic attach only when the rule has a saved result");
assert.ok(/ask-group-part-\$\{pt\.symbol\}/.test(ask) && ask.includes('className="rounded-lg border border-border p-3"'), "each stock's answer is separate");
assert.equal(GROUP_SAVED_NOTE, "Saved to your result");
assert.equal(GROUP_SAVE_BUTTON, "Save result with answers");
assert.equal(groupSavedCount(3), "Saved to your result (3 answers).");
const ctx = read("lib/ask-panel/AskPanelContext.tsx");
assert.ok(ctx.includes("export interface LabLink") && ctx.includes("setLabLink") && ctx.includes("pendingFromLab"), "the Lab hands Ask AI its rule and result");
// [24 Nov 2026 flow changed] assert.ok(ladder.includes("setLabLink(() => linkRef.current)") && ladder.includes("hasResult:"), "the Lab registers its link");
// the Lab's figures and the AI answers are two separate parts in the report
// ---- 11. one report design
assert.equal(REPORT_PDF, "Download full report");
assert.equal(REPORT_STOCK_PDF, "Download PDF");
assert.equal(REPORT_CSV, "Download CSV");
// [24 Nov 2026 flow changed] assert.ok(REPORT_LEAD.includes("up to 8"));
// [24 Nov 2026 flow changed] assert.ok(sr.includes("StockPdfButton") && sr.includes("downloadRunReport(ruleId, runId, \"pdf\", [symbol], token, true)") && sr.includes("REPORT_FREE"), "a PDF for one stock; Free keeps the sample and the upgrade message");
assert.ok(read("lib/api/mutations.ts").includes("&only=stock"), "one stock's page is asked for with only=stock");
// ---- 12. wording guard over everything new
const BANNED = /\b(buy|buying|sell|selling|targets?|picks?|bullish|bearish|strong|breakout|top|best|good|bad|cheap|expensive|safe|safer|safest|likely|expected|recommend\w*|standard|avoid|candidates?|red flags?|turnaround|rating|verdict|RSI|MACD)\b/gi;
const newCopy = [
  SECTION_RULES, SECTION_RESULTS, BACK_TO_STEPS, NEXT_STEP(3), NO_FILTER_LINE, ABOUT_MATCH(5), BLANK_LINE, PAST_LINE, VOL_LABEL, VOL_LINE, ...VOL_OPTIONS.map((o) => o[1]),
  volNumLabel("calmer"), volNumLabel("active"), ...Object.values(EXAMPLES).map((e) => exampleLine(e.text)), ...PV_FILTERS.flatMap((f) => [f.label, f.line, f.example, f.tells, f.not]),
  GROUP_SAVED_NOTE, GROUP_SAVE_BUTTON, REPORT_PDF, REPORT_STOCK_PDF, REPORT_CSV, REPORT_LEAD, ...STEPS.flatMap((s) => [s.title, s.line]),
].join("\n");
assert.deepEqual(newCopy.match(BANNED) ?? [], [], "banned words in the new copy");
assert.ok(!/\b(will rise|will fall|will go up|will go down|going to)\b/i.test(newCopy), "no forecast wording");
// ---- 13. the counts still work with nothing filled
assert.equal(hasAnyRule(EMPTY_RULES), false);
assert.equal(countAfter({ version: 1, as_of: null, fund_quarter_end: null, built_at: "", cols: ["mc"], rows: [[1], [2]] }, EMPTY_RULES, 6), 2);
console.log("my rules layout tests: ok");
