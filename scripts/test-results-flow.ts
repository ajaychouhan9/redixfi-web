// My rules flow (23 Nov 2026, second release): typical values for steps 5 and 7, the stocks left after each step, Rules and Results tabs, the bottom block, Ask AI status,
// no repeat questions, Tick next 8, saving results and the plan limits. Source checks plus the pure functions.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  AFTER_STEP, COMMON_RULES, CREATE_NEW_RULE, EARLIER_VALUES_LINE, EMPTY_RULES, FILL_NOTE, REMOVED_DEPENDS, SECTION_RESULTS, SECTION_RULES, VIEW_STOCKS, countsByStep, stepRowText, typicalRules,
  type LadderData, type Rules,
} from "../src/lib/stock-check.ts";
import { ALL_ANSWERED, ASK_AGAIN_LABEL, alreadyAnswered, answeredKeys, askStatusText, groupQuestion, nextNotAsked, questionKeyOf } from "../src/lib/ask-group.ts";
import {
  ASK_NONE, ASK_STATUS, DELETE_OTHER, DELETE_RULE_WARN, DROP_CONFIRM, DROP_WARNING_DATE, FREE_MORE_LINE, LIVE_NOT_SAVED, LIVE_TITLE, OVER_LIMIT_LINE, RESULTS_IDLE, SAME_DAY_NOTE,
  SAVE_REPLACE_BUTTON, SAVE_REPLACE_FREE, TICK_NEXT_8, DL_CSV, DL_REPORT, DL_FREE,
} from "../src/lib/saved-results.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// ---- Part 1: typical values
assert.equal(FILL_NOTE, "Typical numbers from published methods. Change any of them. A field with no published number is left blank.");
const t = typicalRules();
assert.deepEqual(t, COMMON_RULES);
assert.deepEqual([t.near52, t.avgDays, t.volDay], ["25", "200", "1.5"], "step 7: 25 % of the 52-week high, 200-day average, volume 1.5 times its 20-day average");
assert.deepEqual([t.chgMonths, t.chgMin], ["", ""], "the 1, 3, 6 month change stays blank");
assert.equal(t.delivery, "50", "step 5: delivery is filled");
assert.deepEqual([t.volRatio, t.vol, t.volNum], ["", "", ""], "step 5: volume vs usual and the price-swings option stay blank");
const ladder = strip(read("components/app/stock-check/ShortlistLadder.tsx"));
const parts = strip(read("components/app/stock-check/MyRulesParts.tsx"));
assert.ok(parts.includes("FILL_NOTE") && parts.includes("ladder-fill-note"), "the note sits under the Fill button");
assert.ok(ladder.includes("times its 20-day average volume"), "the volume filter says which average it uses");

// ---- Part 2: stocks left after each step
const cols = ["mc", "eps", "roe"];
const data: LadderData = { version: 1, as_of: null, fund_quarter_end: null, built_at: "", cols, rows: [[1000, 1, 20], [900, 1, 10], [800, 1, 30], [100, 1, 40], [50, -1, 5]] };
const r1: Rules = { ...EMPTY_RULES, mcMin: "500", roe: "15" };
assert.deepEqual(countsByStep(data, r1), [3, 3, 2, 2, 2, 2, 2]);
assert.equal(AFTER_STEP(2, 1), "After this step: 2 left. This step removed 1.");
assert.equal(AFTER_STEP(1234, 5), "After this step: 1,234 left. This step removed 5.");
assert.equal(REMOVED_DEPENDS, "The removed number depends on the steps before it.");
assert.equal(stepRowText(1, 3), "✓ 1 set · 3 left");
assert.equal(stepRowText(0, 3), "Not set · 3 left");
assert.equal(stepRowText(0, null), "Not set");
assert.ok(ladder.includes("stepsFilledUpTo(rules, n)") && ladder.includes('data-testid="step-after"') && ladder.includes("AFTER_STEP(") && ladder.includes("REMOVED_DEPENDS"), "the step page and the rows show the counts, only once something is filled up to that step");

// ---- Part 3: Rules and Results, the Rule page, the bottom block
assert.deepEqual([SECTION_RULES, SECTION_RESULTS], ["Rules", "Results"]);
assert.equal(CREATE_NEW_RULE, "Create new rule");
assert.equal(VIEW_STOCKS, "View stocks");
assert.ok(parts.includes("create-new-rule") && ladder.includes("onCreate={createRule}") && ladder.includes("onOpen={openRule}"), "Create new rule at the top; tap a saved rule to open it");
assert.ok(ladder.includes("function onResult()") && /if \(viewMode && active\) \{[\s\S]*?setViewRule[\s\S]*?return;\s*\}\s*show\(\);/.test(ladder), "an opened rule with no edits shows the saved result and runs nothing; anything else runs the rule");
assert.ok(ladder.includes("const viewMode = !!active && !changed && (activeRuns ?? 0) > 0"), "View stocks only for an opened saved rule with no edits and at least one result");
assert.ok((ladder.match(/\{bottom\(\)\}/g) ?? []).length === 1 && ladder.includes("stepDef.n === STEPS.length - 1 && bottom()"), "the bottom block comes after the steps and at the end of step 7");
assert.ok(parts.includes("rule-delete") && /\{active && <button[^>]*askDelete[^>]*rule-delete|\{active && <button[\s\S]{0,200}rule-delete/.test(parts), "Delete only for a saved rule");
assert.ok(!ladder.includes("sticky") && !parts.includes("sticky"), "no sticky bar");
assert.ok(ladder.includes("back-to-rules"), "a way back to the list of rules");
assert.ok(ladder.includes("EARLIER_VALUES_LINE") && EARLIER_VALUES_LINE === "Your saved results were made with the earlier values. They stay as they were.");

// ---- Part 4: Ask AI status, no repeat questions, tick next 8
const ans = (symbol: string, key: string) => ({ symbol, question: groupQuestion(key, [symbol], symbol) as string });
const answers = [ans("TCS", "points"), ans("TCS", "price"), ans("TCS", "points"), { symbol: "TCS", question: "A typed question" }, ans("INFY", "holders")];
assert.equal(questionKeyOf(groupQuestion("financials", ["TCS"], "TCS") as string, "TCS"), "financials");
assert.equal(questionKeyOf("A typed question", "TCS"), null);
assert.deepEqual(answeredKeys(answers, "TCS").sort(), ["points", "price"]);
assert.equal(askStatusText(answers, "TCS"), "2 of 5 answered");
assert.equal(askStatusText(answers, "INFY"), "1 of 5 answered");
assert.equal(askStatusText(answers, "WIPRO"), "Not asked");
assert.equal(askStatusText(null, "TCS"), "Not asked");
assert.equal(askStatusText([{ symbol: "ITC", question: "typed" }], "ITC"), "1 answer");
assert.equal(ASK_STATUS(3), "3 of 5 answered");
assert.equal(ASK_NONE, "Not asked");
const twelve = Array.from({ length: 12 }, (_, i) => `S${i}`);
assert.deepEqual(nextNotAsked(twelve, [{ symbol: "S0" }, { symbol: "S2" }]), ["S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9"], "the next 8 not yet asked, in list order");
assert.deepEqual(nextNotAsked(["A", "B"], [{ symbol: "A" }, { symbol: "B" }]), []);
assert.equal(TICK_NEXT_8, "Tick next 8 not yet asked");
assert.equal(alreadyAnswered(["TCS", "INFY"]), "Already answered, so not asked again and not charged: TCS and INFY.");
assert.ok(ASK_AGAIN_LABEL.includes("uses questions") && ALL_ANSWERED.includes("Nothing will be used"));
const ask = strip(read("components/app/ask/AskRedixFi.tsx"));
assert.ok(ask.includes("link.answeredKeys(s).includes(key)") && ask.includes("groupPlan.again ? groupPlan.symbols : groupPlan.symbols.filter((s) => !groupPlan.skip.includes(s))") && ask.includes("groupUses(n, left)") && ask.includes('data-testid="ask-group-again"'), "answered pairs are skipped and not charged; Ask again is a choice; the count covers only what will be asked");
assert.ok(ask.includes("link.hasResult ? link.runId : null"), "answers go to the result the stocks came from, not just the latest");
const sr = strip(read("components/app/stock-check/SavedResults.tsx"));
assert.ok(sr.includes('data-testid="stock-ask-status"') && sr.includes("TickNext8") && sr.includes("renderAsk({"), "each stock row shows its status; Tick next 8; the Ask AI card is inside the result card");
assert.ok(ladder.includes("askStatusText(liveAnswers, r.symbol)") && !ladder.includes("Read your shortlist with AI"), "status on the live list too; no separate card at the bottom");
assert.ok(sr.includes("RESULT_ANSWERS_TITLE(answers ? answers.length : r.answers)") && sr.includes("loadAnswers(ruleId, viewing)"), "the answers count is read again after answers are saved");
assert.ok(ask.includes("getLabLink()?.refreshAnswers()"), "saving answers refreshes the status and the count");

// ---- Part 5: saving results and the plan limits
assert.equal(SAVE_REPLACE_FREE, "Saving replaces your saved result, and the Ask AI answers saved with it are removed. Download the report or CSV first if you want to keep them.");
assert.equal(SAVE_REPLACE_BUTTON, "Save and replace");
assert.ok(FREE_MORE_LINE.includes("Basic keeps 10") && FREE_MORE_LINE.includes("Pro keeps 30"));
assert.ok(DROP_WARNING_DATE(10, "1 Nov 2026").includes("(1 Nov 2026)") && DROP_WARNING_DATE(10, "1 Nov 2026").includes("Ask AI answers saved with it"));
assert.equal(DROP_CONFIRM, "Save and remove the oldest");
assert.equal(DELETE_OTHER, "Delete a different result");
assert.deepEqual([DL_REPORT, DL_CSV], ["Download report", "Download CSV"]);
assert.ok(DELETE_RULE_WARN(3).includes("3 saved results") && DELETE_RULE_WARN(1).includes("1 saved result and") && !DELETE_RULE_WARN(0).includes("saved result"));
assert.ok(OVER_LIMIT_LINE(1, 3).includes("open and download them all") && OVER_LIMIT_LINE(1, 3).includes("Delete some results"));
assert.ok(SAME_DAY_NOTE.includes("same values") || SAME_DAY_NOTE.includes("Same rule, same values"));
assert.ok(ladder.includes("dropAsk.limit === 1 ? (") && ladder.includes("SAVE_REPLACE_FREE") && ladder.includes("DialogDownloads") && ladder.includes("pickToDelete") && ladder.includes("deleteThenSave") && ladder.includes("out.blocked"), "Free replace dialog, Basic and Pro remove-oldest dialog, delete a different result, and the blocked case");
assert.ok(ladder.includes("liveSaved") && !ladder.includes("toSave"), "running is temporary; a result is stored only by Save this result");
assert.ok(!/void load\(1, useRules, fromName, toSave\)/.test(ladder) && !ladder.includes("save?: {"), "Show does not save");
assert.ok(LIVE_TITLE === "Your rule today" && LIVE_NOT_SAVED.includes("Not saved yet") && RESULTS_IDLE.length < 80);
assert.ok(read("lib/api/mutations.ts").includes("blocked?: boolean") && read("lib/api/mutations.ts").includes("updated_same_day"));
assert.ok(sr.includes("OVER_LIMIT_LINE(limit, runs.length)") && sr.includes("viewing === r.id"), "results above a lowered limit stay viewable and downloadable");
assert.ok(sr.includes("DL_FREE") && sr.includes("SEE_PLANS"), "Free accounts get a plain message and the plans link in the download buttons");

// ---- wording guard over the new copy
const BANNED = /\b(buy|buying|sell|selling|targets?|picks?|bullish|bearish|strong|breakout|top|best|good|bad|cheap|expensive|safe|safer|safest|likely|expected|recommend\w*|standard|avoid|candidates?|red flags?|turnaround|rating|verdict|RSI|MACD)\b/gi;
const copy = [
  FILL_NOTE, AFTER_STEP(2, 1), REMOVED_DEPENDS, stepRowText(1, 3), CREATE_NEW_RULE, VIEW_STOCKS, EARLIER_VALUES_LINE, ASK_AGAIN_LABEL, ALL_ANSWERED, alreadyAnswered(["TCS"]), ASK_STATUS(3), ASK_NONE, TICK_NEXT_8,
  SAVE_REPLACE_FREE, SAVE_REPLACE_BUTTON, FREE_MORE_LINE, DROP_WARNING_DATE(10, "1 Nov 2026"), DROP_CONFIRM, DELETE_OTHER, DL_REPORT, DL_CSV, DL_FREE, DELETE_RULE_WARN(2), OVER_LIMIT_LINE(1, 3), SAME_DAY_NOTE,
  LIVE_TITLE, LIVE_NOT_SAVED, RESULTS_IDLE,
].join("\n");
assert.deepEqual(copy.match(BANNED) ?? [], [], "banned words in the new copy");
assert.ok(!/\b(standard|recommended|best)\b/i.test(FILL_NOTE + read("lib/stock-check.ts").slice(read("lib/stock-check.ts").indexOf("FILL_BUTTON"), read("lib/stock-check.ts").indexOf("FILL_BUTTON") + 400)), "never standard, recommended or best near Fill typical values");
assert.ok(!/many people|most people|popular/i.test(copy), "no popularity claim");
console.log("results flow tests: ok");
