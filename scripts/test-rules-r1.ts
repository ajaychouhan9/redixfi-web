// Stock Check release 1 (20 Nov 2026): the growth checkbox, one "My rules" card, the opened-rule view, and Ask AI about the ticked stocks.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  COMMON_RULES, EMPTY_RULES, GROWTH_LABEL, NO_GROWTH_LINE, RULES, activeTests, cardValues, countAfter, countsByStep, describeRules, fromParams, growthGap, hasAnyRule,
  isOn, sameRules, toParams, type LadderData, type Rules,
} from "../src/lib/stock-check.ts";
import {
  LIMIT_REACHED, PLAN_LINE, REPLACE_OLD, REPLACE_QUESTION, RUN_AGAIN_RESULT, SAVE_AS_NEW_RULE, SHOWING_RULE, copyName, diffLists, fmtDay, saveAction, savedLine, snapshotLine,
} from "../src/lib/my-rules.ts";
import { ALL_AT_ONCE, ASK_GROUP_MAX, GROUP_KEYS, groupQuestion, joinNames, toggleSelected } from "../src/lib/ask-group.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// ---- A. the growth checkbox: a new rule, the existing 5-year rules unchanged
assert.equal(GROWTH_LABEL, "Sales and profit both higher than the year before, 3 years in a row.");
const g = RULES.find((r) => r.key === "growthUp")!;
assert.deepEqual({ step: g.step, col: g.col, op: g.op, param: g.param }, { step: 1, col: "gs", op: "flag", param: "growth_up_3y" });
for (const k of ["profitYears", "sales3", "profit3", "salesQ", "profitQg", "profitQ"]) assert.ok(RULES.some((r) => r.key === k), `${k} is still there`);
assert.equal(COMMON_RULES.growthUp, false, "Start with common rules does not tick the new box (existing common rules unchanged)");
assert.deepEqual(toParams(COMMON_RULES), { market_cap_min: 500, eps_positive: true, profit_years_min: 5, sales_cagr_3y_min: 10, profit_cagr_3y_min: 10, sales_growth_min: 10, profit_growth_min: 10, roe_min: 15, roce_min: 15, de_max: 1, pledge_max: 10, pe_max: 25 });

const COLS = ["mc", "eps", "py", "sgq", "pgq", "sg3", "pg3", "roe", "roce", "rna", "de", "pl", "vol", "vr", "dl", "pe", "gs"];
const row = (o: Record<string, number | null>): (number | null)[] => COLS.map((c) => (c in o ? o[c] : null));
const data: LadderData = {
  version: 1, as_of: "2026-11-19", fund_quarter_end: "2026-09-30", built_at: "2026-11-19T14:00:00Z", cols: COLS,
  rows: [
    row({ mc: 5000, eps: 5, gs: 1 }), row({ mc: 800, eps: 2, gs: 1 }), row({ mc: 9000, eps: 4, gs: 0 }), row({ mc: 7000, eps: 3, gs: null }),
    row({ mc: 6000, eps: -1, gs: null }), row({ mc: 100, eps: 1, gs: 1 }),
  ],
};
const on: Rules = { ...EMPTY_RULES, growthUp: true };
assert.equal(countAfter(data, EMPTY_RULES, 5), 6);
assert.equal(countAfter(data, on, 0), 6, "a step-1 rule does not count at step 0");
assert.equal(countAfter(data, on, 1), 3, "only stocks with a 1 pass; 0 and no figure are left out");
assert.equal(countAfter(data, { ...on, mcMin: "1000" }, 5), 1);
assert.deepEqual(countsByStep(data, { ...on, mcMin: "1000" }), [4, 1, 1, 1, 1, 1]);
assert.equal(countAfter({ ...data, cols: ["mc"], rows: [[1]] }, on, 5), 0, "an older file with no gs column matches nothing");
assert.equal(growthGap(data, on), 2, "two stocks have fewer than four annual figures");
assert.equal(growthGap(data, { ...on, mcMin: "1000" }), 2, "counted among the stocks that meet every other rule");
assert.equal(growthGap(data, EMPTY_RULES) >= 0, true);
assert.equal(growthGap({ ...data, cols: ["mc"], rows: [[1]] }, on), 0);
assert.equal(NO_GROWTH_LINE(2), "2 stocks have fewer than 4 years of annual figures and are left out of this rule");
assert.equal(NO_GROWTH_LINE(1), "1 stock has fewer than 4 years of annual figures and is left out of this rule");
assert.equal(NO_GROWTH_LINE(1281), "1,281 stocks have fewer than 4 years of annual figures and are left out of this rule");
// the shortlist, saved rules and Ask AI use the same rule
assert.deepEqual(toParams(on), { growth_up_3y: true });
assert.deepEqual(fromParams(toParams({ ...COMMON_RULES, growthUp: true }) as Record<string, unknown>), { ...COMMON_RULES, growthUp: true }, "a saved rule opens with the box ticked");
assert.equal(fromParams({ growth_up_3y: true }).growthUp, true);
assert.equal(fromParams({ growth_up_3y: "true" }).growthUp, false, "only a real true counts");
assert.equal(fromParams({}).growthUp, false);
assert.ok(isOn(on, g) && !isOn(EMPTY_RULES, g) && hasAnyRule(on));
assert.equal(activeTests(on, 0).length, 0);
assert.equal(activeTests(on, 1).length, 1);
assert.deepEqual(cardValues(on, { both_up_3y: true }), [{ label: "Sales and profit higher 3 years in a row", value: "Yes" }]);
assert.deepEqual(cardValues(on, { both_up_3y: false })[0].value, "No");
assert.deepEqual(cardValues(on, { both_up_3y: null })[0].value, "Not available");

// ---- the rules applied, in plain words
assert.deepEqual(describeRules(EMPTY_RULES), []);
assert.deepEqual(describeRules({ ...EMPTY_RULES, mcMin: "500", growthUp: true, profitQ: true, roe: "15" }), [
  "Market value at least 500 ₹ crore", "Profit in the latest quarter", "Sales and profit both higher than the year before, 3 years in a row", "Return on equity at least 15 %",
]);
assert.ok(describeRules({ ...EMPTY_RULES, vol: "calmer", volNum: "25" })[0].includes("calmer"));
assert.ok(sameRules(COMMON_RULES, { ...COMMON_RULES }) && !sameRules(COMMON_RULES, { ...COMMON_RULES, roe: "20" }) && !sameRules(EMPTY_RULES, on));
assert.ok(sameRules({ ...EMPTY_RULES, roe: "abc" }, EMPTY_RULES), "a typed value that is not used yet is not a change");

// ---- B. My rules: dates, counts, snapshot line, what Save does
assert.equal(fmtDay("2026-11-20T08:15:00Z"), "20 Nov 2026");
assert.equal(fmtDay("2026-01-05"), "5 Jan 2026");
assert.equal(fmtDay(null), null);
assert.equal(fmtDay("garbage"), null);
assert.equal(savedLine({ updated_at: "2026-11-20T08:15:00Z", created_at: "2026-11-01", stock_count: 52 }), "Saved 20 Nov 2026 · 52 stocks when saved");
assert.equal(savedLine({ updated_at: null, created_at: "2026-11-01T00:00:00Z", stock_count: 1 }), "Saved 1 Nov 2026 · 1 stock when saved");
assert.equal(savedLine({ created_at: "2026-11-01", stock_count: null }), "Saved 1 Nov 2026");
assert.equal(snapshotLine({ snapshot: null }), null);
assert.equal(snapshotLine({ snapshot: { at: "2026-11-20T08:00:00Z", as_of: "2026-11-19", count: 1234 } }), "Stock list saved as of 19 Nov 2026: 1,234 stocks");
assert.equal(saveAction(false, false), "new");
assert.equal(saveAction(true, true), "ask", "an opened rule that was changed: ask once");
assert.equal(saveAction(true, false), "replace");
assert.equal(REPLACE_OLD, "Replace the old rule");
assert.equal(SAVE_AS_NEW_RULE, "Save as a new rule");
assert.ok(REPLACE_QUESTION("Growers").includes('"Growers"'));
assert.equal(PLAN_LINE(1, 1), "Your plan keeps 1 saved rule. You have 1.");
assert.equal(PLAN_LINE(20, 3), "Your plan keeps 20 saved rules. You have 3.");
assert.ok(LIMIT_REACHED(5).includes("5 saved rules"));
assert.equal(SHOWING_RULE("My growers"), "Showing rule: My growers");
assert.deepEqual(diffLists(["A", "B", "C"], ["B", "C", "D", "E"]), { added: ["D", "E"], left: ["A"] });
assert.deepEqual(diffLists([], []), { added: [], left: [] });
assert.equal(RUN_AGAIN_RESULT("19 Nov 2026", { added: 2, left: 1 }), "Compared with the list saved as of 19 Nov 2026: 2 added, 1 no longer meets the rules.");
assert.equal(RUN_AGAIN_RESULT(null, { added: 0, left: 3 }), "Compared with the list saved: 0 added, 3 no longer meet the rules.");
assert.equal(copyName("", "Growers"), "Growers (new)");
assert.equal(copyName("Growers", "Growers"), "Growers (new)");
assert.equal(copyName("Other", "Growers"), "Other");
assert.ok(copyName("x".repeat(60), "x".repeat(60)).length <= 60);

// ---- D. Ask AI about the ticked stocks
assert.equal(ASK_GROUP_MAX, 8, "the existing lookup cap");
assert.deepEqual(toggleSelected([], "TCS"), { list: ["TCS"], capped: false });
assert.deepEqual(toggleSelected(["TCS", "INFY"], "TCS"), { list: ["INFY"], capped: false }, "ticking again removes it");
const eight = ["A", "B", "C", "D", "E", "F", "G", "H"];
assert.deepEqual(toggleSelected(eight, "I"), { list: eight, capped: true }, "the ninth is not added");
assert.deepEqual(toggleSelected(eight, "H").list.length, 7, "removing is always allowed");
assert.equal(joinNames(["A"]), "A");
assert.equal(joinNames(["A", "B"]), "A and B");
assert.equal(joinNames(["A", "B", "C"]), "A, B and C");
assert.deepEqual(GROUP_KEYS, ["points", "financials", "holders", "management", "price"], "the five questions");
assert.deepEqual([...ALL_AT_ONCE], ["price"], "only the price question is asked for all stocks at once (checked on production data 20 Nov 2026)");
const syms = ["HINDUNILVR", "TCS", "ITC"];
assert.equal(groupQuestion("points", syms, "TCS"), "List the points to watch for TCS.");
assert.equal(groupQuestion("points", syms, null), "List the points to watch for HINDUNILVR.", "no company chosen: the first one");
assert.equal(groupQuestion("points", syms, "NOPE"), "List the points to watch for HINDUNILVR.", "a company that is not selected is ignored");
assert.equal(groupQuestion("financials", syms, "ITC"), "Show ITC's sales, profit, margin and debt trend for the last 3 years.");
assert.equal(groupQuestion("holders", syms, "TCS"), "Show recent promoter, insider and bulk or block deal activity for TCS.");
assert.equal(groupQuestion("management", syms, "TCS"), "List the guidance, capex plans and risks mentioned in the latest concall and annual report for TCS.");
assert.equal(groupQuestion("price", syms, "TCS"), "Show the last 10 days of price change and delivery % for HINDUNILVR, TCS and ITC.");
assert.equal(groupQuestion("price", ["TCS"], "TCS"), "Show the last 10 days of price change and delivery % for TCS.", "one stock: no list of names");
assert.equal(groupQuestion("nope", syms, null), null);
assert.equal(groupQuestion("points", [], null), null);

// ---- C. the opened-rule view, B/D in the page source
const files = ["ShortlistLadder", "MyRulesCard", "RulesApplied", "AskAboutStocks"].map((f) => [f, strip(read(`components/app/stock-check/${f}.tsx`))] as const);
const src = Object.fromEntries(files);
const ladder = src.ShortlistLadder;
assert.ok(ladder.includes("SHOWING_RULE(shownFrom)") && ladder.includes('data-testid="showing-rule"') && ladder.includes("<RulesApplied rules={shownRules} />"), "Showing rule: <name> and the rules-applied card sit above the stocks");
assert.ok(ladder.indexOf("showing-rule") < ladder.indexOf('data-testid="ladder-cards"') && ladder.indexOf("<RulesApplied") < ladder.indexOf('data-testid="ladder-cards"'), "both are above the stock cards");
assert.ok(src.RulesApplied.includes("aria-expanded={open}") && src.RulesApplied.includes("RULES_APPLIED_NOTE") && !/<input|<textarea|onChange/.test(src.RulesApplied), "collapsible and read only");
assert.ok(src.MyRulesCard.includes("ladder-common") && src.MyRulesCard.includes("ladder-clear") && src.MyRulesCard.includes("saved-list") && src.MyRulesCard.includes("saved-open") && src.MyRulesCard.includes("saved-delete") && src.MyRulesCard.includes("save-rules-button") && src.MyRulesCard.includes("save-new-button"), "one card: common rules, saved rules, Open, Save, Save as new, Delete");
assert.ok(src.MyRulesCard.includes('data-testid="replace-ask"') && src.MyRulesCard.includes("saveAction(!!active, changed)"), "the ask-once prompt");
assert.ok(src.MyRulesCard.includes("savedLine(s)") && src.MyRulesCard.includes("snapshotLine(s)") && src.MyRulesCard.includes("RUN_AGAIN_BUTTON"), "name, date, stock count and Run again");
assert.ok(src.MyRulesCard.includes("limit !== null && saved.length >= limit") && src.MyRulesCard.includes("PLAN_LINE(limit, saved.length)"), "plan limits are kept");
assert.ok(!ladder.includes('data-testid="save-rules"') && !ladder.includes("Save my rules"), "no second Save my rules section");
assert.ok(!ladder.includes("ladder-step-6") && !ladder.includes("STEP6") && !src.AskAboutStocks.includes("SAMPLE_SYMBOL"), "Step 6 is gone and Ask AI no longer opens Hindustan Unilever");
assert.ok(ladder.indexOf("<AskAboutStocks") > ladder.indexOf('data-testid="ladder-cards"'), "Ask AI about these stocks comes after the stock list");
assert.ok(src.AskAboutStocks.includes("openWithStocks(selected)") && src.AskAboutStocks.includes("estimateFullCheck(selected") && src.AskAboutStocks.includes("startFullCheck(selected"), "Ask AI opens a new session; Ask all 5 estimates first, then starts");
const askAll = src.AskAboutStocks;
assert.ok(askAll.indexOf("estimateFullCheck(") < askAll.indexOf("startFullCheck(") && askAll.includes("costLine(estimate.total, estimate.items)") && askAll.includes('data-testid="ask-all-confirm"'), "the quota is shown and confirmed before anything runs");
assert.ok(askAll.includes("e.locked") && askAll.includes("<AskPreview />") && askAll.includes('reason === "plan_locked"'), "Free users keep the stored sample and the plan message");
assert.ok(askAll.includes("{!user ? (") && /!user \? \([\s\S]*?<AskPreview \/>/.test(askAll), "logged-out visitors keep the stored sample");
assert.ok(ladder.includes("toggleSelected(selected, symbol)") && ladder.includes("ASK_GROUP_MAX") && ladder.includes('data-testid="ladder-select"'), "stocks are ticked on the cards, up to the cap");
const ctx = read("lib/ask-panel/AskPanelContext.tsx");
assert.ok(ctx.includes("openWithStocks: (symbols: string[]) => void") && ctx.includes("setPendingQuestion(null)"), "context: a new session with stocks");
const panel = read("components/app/ask/AskRedixFi.tsx");
assert.ok(panel.includes("if (open && pendingStocks && user)") && panel.includes("startNewConversation();") && panel.includes("<StockGroupBlock"), "the panel starts a NEW session with the stocks and the five questions");
assert.ok(panel.includes("onQuestion={(q) => setInput(q)}"), "a suggestion is typed into the input, not sent");
console.log("rules release 1 tests: ok");
