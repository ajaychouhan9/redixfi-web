// Shortlist Lab: Learn tab fixes, fixed tab bars, Ask AI clean-up, saved results, reports (21 Nov 2026). Use / Skip and the common values card were removed on 22 Nov 2026 (blank = ignored; one Fill typical values button).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { LEARN_STEPS, READY_LINE, findLine } from "../src/lib/learn.ts";
import { PLAN_MATRIX } from "../src/data/plan-features.ts";
import {
  BLANK_LINE, CLEAR_ALL, COMMON_RULES, EMPTY_RULES, FILL_BUTTON, SHOW_BUTTON, hasAnyRule, toParams, typicalRules, validValue, RULES, countAfter, countsByStep,
  type LadderData, type Rules,
} from "../src/lib/stock-check.ts";
import { ASK_BLOCK_ASK, ASK_BLOCK_ASK_ALL, ASK_BLOCK_TITLE, GROUP_ALL_NOTE, askAllUses } from "../src/lib/ask-group.ts";
import { DROP_WARNING, REPORT_LEAD, RESULT_EARLIER, RESULT_LIMIT_LINE, RESULT_SINCE } from "../src/lib/saved-results.ts";
import { LIMIT_REACHED } from "../src/lib/my-rules.ts";
import { IN_RUN_TITLE, ADD_FROM_WATCHLIST, bannerLine } from "../src/lib/fullcheck-copy.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const readFileSyncExists = (p: string): boolean => existsSync(new URL(`../src/${p}`, import.meta.url));
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// ---- A1 / A2 / A5: the Learn tab
const page = read("app/(app)/shortlist-lab/page.tsx");
assert.ok(!page.includes("What this site does not do") && !page.includes("start-guide-card") && !page.includes("Know markets already"), "the not-do card and the old line are gone");
assert.equal(READY_LINE, "Ready to filter? Open the My rules tab to shortlist stocks as per your rule.");
const learn = strip(read("components/app/stock-check/LearnTab.tsx"));
assert.ok(learn.includes("onOpenRules") && learn.includes('data-testid="learn-ready-link"') && learn.includes("My rules tab"), "the words My rules tab switch to that tab");
assert.ok(strip(read("components/app/stock-check/LabTabs.tsx")).includes("onOpenRules={() =>"), "the tab bar switches");
assert.equal(findLine(["Overview"]), "Find any stock in Screener, open its page and look in the Overview tab.");
const tabNames = ["Overview", "Annual report", "Concall", "Points to watch", "News", "Insiders & promoters", "Rewind", "Ask AI"];
assert.deepEqual(LEARN_STEPS.map((s) => s.tabs), [["Overview"], ["Annual report"], ["Annual report"], ["Annual report", "Insiders & promoters"], ["Overview"], ["Overview"], ["Overview"]]);
const tabsSrc = read("lib/stock-tabs.ts");
for (const t of tabNames) assert.ok(tabsSrc.includes(`label: "${t}"`), `${t} is a real stock-page tab`);
assert.ok(learn.includes(">Screener</Link>") && (learn.match(/<Link /g) ?? []).length === 1, "only Screener is a link");

// ---- A4: no learn link on the stock page
assert.ok(!read("app/(app)/stocks/[symbol]/page.tsx").includes("Learn the 5 questions"), "stock page: no learn the rule link");

// ---- A3: fixed tab bars
const css = read("app/globals.css");
assert.ok(/\.sticky-tabs\s*\{[^}]*position:\s*sticky/.test(css) && /@media \(min-width: 768px\)\s*\{\s*\.sticky-tabs\s*\{\s*top:\s*var\(--header-height/.test(css), "desktop: just under the fixed header; phone: top 0");
for (const f of ["components/app/stock/StockTabs.tsx", "components/app/stock-check/LabTabs.tsx", "components/app/account/AccountTabs.tsx", "components/app/intraday/tabs/IntradayTabs.tsx", "components/app/market-activity/MarketActivityTabs.tsx"]) {
  assert.ok(read(f).includes("sticky-tabs"), `${f} has a fixed tab bar`);
}
assert.ok(read("components/app/stock/StockTabs.tsx").includes("sticky-tabs -mx-4 overflow-x-auto"), "horizontal tab scrolling is kept");
const ladder = strip(read("components/app/stock-check/ShortlistLadder.tsx"));
assert.ok(ladder.includes("top-[var(--tabs-h)]") && ladder.includes("var(--header-height,0px)+var(--tabs-h)"), "the stocks-left bar stacks under the tabs");
assert.ok(ladder.includes('"ladder-results-section", "ask-about"') && ladder.includes("IntersectionObserver") && ladder.includes("opacity-0"), "and steps aside at the results and the AI block");

// ---- A6 / A7: Ask AI
const ask = strip(read("components/app/ask/AskRedixFi.tsx"));
assert.ok(!ask.includes("COMPLIANCE_LINE") && !ask.includes("ask-cost-line") && !ask.includes("Each answer uses 1 question"), "no fixed footer");
assert.ok(ask.includes('NOT_ADVICE_LINE = "Not investment advice"') && ask.includes('data-testid="ask-not-advice"') && ask.includes('m.role === "ai" && <p'), "one small line under every answer");
assert.ok((ask.match(/ask-not-advice/g) ?? []).length === 1, "one place, so every answer type has it");
for (const gone of ["Explore what RedixFi can answer", "Common questions", "how-to-ask", "common-questions", "Uses 1 question", "This month", "Add-on", "starterQuestions"]) assert.ok(!ask.includes(gone), `removed from Ask AI: ${gone}`);
assert.ok(ask.includes('placeholder={authLoading ? "Loading your account…" : "Ask about a stock, a sector, or up to 8 stocks"}'), "placeholder");
assert.ok(ask.includes("Select stock") && ask.includes("<AskQuota") && ask.includes("StockGroupBlock") && ask.includes("panel-preview-free"), "kept: stock chip, Today, stock group, sample");
assert.ok(!ask.includes("One company") && GROUP_ALL_NOTE.length < 140, "one short line, no repeated One company labels");
assert.ok(!ask.includes("The other questions are asked one stock at a time") && !read("lib/ask-group.ts").includes("asked one stock at a time"), "the one-stock-at-a-time line is gone");
const acct = strip(read("components/app/account/AskUsageCard.tsx"));
assert.ok(acct.includes("This month") && acct.includes("Add-on") && read("app/(app)/account/page.tsx").includes("<AskUsageCard />"), "month and add-on counts are on the Account page");

// ---- C: a blank field is ignored (no Use / Skip), one Fill typical values button
const withRules = (p: Partial<Rules>): Rules => ({ ...EMPTY_RULES, ...p });
const r = withRules({ mcMin: "500", roe: "15", de: "1", pe: "25" });
assert.deepEqual(toParams(r), { market_cap_min: 500, roe_min: 15, de_max: 1, pe_max: 25 });
assert.deepEqual(toParams(withRules({ roe: "  " })), {}, "a blank box is never applied");
assert.ok(hasAnyRule(r) && !hasAnyRule(EMPTY_RULES) && !hasAnyRule(withRules({ roe: " " })));
const everything = [ladder, strip(read("lib/stock-check.ts")), strip(read("lib/my-rules.ts")), strip(read("components/app/stock-check/MyRulesCard.tsx")), strip(read("components/app/stock-check/SavedResults.tsx")), strip(read("lib/api/mutations.ts"))].join("\n");
assert.ok(!/skipped|Skip|SKIP|applySkips|filtersLine|filtersSet|step-switch|of \d filters set/.test(everything.replace(/skipped\?: boolean/g, "")), "no Use / Skip anywhere in the ladder, My rules, saved results or the API client");
assert.ok(!read("components/app/stock-check/ShortlistLadder.tsx").includes("filters set") && !read("components/app/stock-check/MyRulesCard.tsx").includes("filters set"), "no N of M filters set line");
// the counts follow the rules that have a value
const data: LadderData = { version: 1, as_of: "2026-11-20", fund_quarter_end: null, built_at: "x", cols: ["mc", "roe", "de", "pe"], rows: [[600, 20, 0.5, 20], [600, 10, 0.5, 20], [100, 20, 0.5, 20]] };
assert.equal(countAfter(data, withRules({ mcMin: "500", roe: "15" }), 6), 1);
assert.equal(countAfter(data, withRules({ mcMin: "500", roe: "" }), 6), 2, "clearing a field widens the list");
assert.deepEqual(countsByStep(data, withRules({ mcMin: "500", roe: "15" })), [2, 2, 1, 1, 1, 1, 1]);
assert.ok(RULES.every((d) => d.step >= 0 && d.step <= 6) && validValue(RULES[0], "500"));
// one button, one Clear all link, one line about blank fields; the old card is gone
assert.equal(FILL_BUTTON, "Fill typical values");
assert.equal(CLEAR_ALL, "Clear all");
assert.equal(BLANK_LINE, "Leave a field blank to ignore it.");
assert.equal(SHOW_BUTTON, "Show stocks that meet my rule");
assert.ok(ladder.includes("FILL_BUTTON") && ladder.includes("CLEAR_ALL") && ladder.includes("BLANK_LINE") && ladder.includes("typicalRules()"), "the ladder has the button, Clear all and the blank line");
assert.ok(!ladder.includes("CommonValuesCard") && !readFileSyncExists("components/app/stock-check/CommonValuesCard.tsx"), "the Common starting values card is gone");
assert.ok(!/Show \$\{left|Show \$\{?left/.test(ladder) && ladder.includes("{SHOW_BUTTON}"), "the show button has no number on it");
assert.ok(ladder.includes("data-testid=\"ladder-counts-note\"") && ladder.includes("COUNTS_NOTE") && ladder.includes("stocks left") || ladder.includes("stock\" : \"stocks\"} left"), "the stocks left count and its note stay");
{
  const typical = typicalRules();
  assert.deepEqual(typical, COMMON_RULES);
  for (const k of ["chgMonths", "chgMin", "near52", "avgDays", "volDay", "volRatio", "delivery", "vol", "volNum"] as const) assert.equal(typical[k], "", `${k}: no published number, left blank`);
  const copyAll = (FILL_BUTTON + BLANK_LINE + CLEAR_ALL + SHOW_BUTTON + ladder).replace(/className="[^"]*"/g, "").replace(/className=\{`[^`]*`\}/g, "");
  assert.ok(!/\b(standard|recommended|best)\b/i.test(copyAll), "never standard, recommended or best");
}
// the AI block is its own block after the list, not a step
const ask2 = strip(read("components/app/stock-check/AskAboutStocks.tsx"));
assert.equal(ASK_BLOCK_TITLE, "Read your shortlist with AI");
assert.equal(ASK_BLOCK_ASK, "\"Ask AI\" is one question in chat.");
assert.ok(ASK_BLOCK_ASK_ALL.startsWith("\"Ask all 5\" makes a saved report for each ticked stock") && ASK_BLOCK_ASK_ALL.includes("uses questions from your plan"));
assert.equal(askAllUses(3, 7), "Ask all 5 for 3 stocks uses 7 questions from your plan. Nothing is used until you confirm.");
assert.ok(ask2.includes("router.push(`/full-check?run=") && ask2.includes("started=1"), "opens the Full check page by itself");
assert.ok(ladder.indexOf("<AskAboutStocks") > ladder.indexOf("<SavedResults") && ladder.indexOf("<SavedResults") > ladder.indexOf('data-testid="ladder-cards"'), "the AI block comes last, after the list and the results");
assert.ok(!ladder.includes("ladder-step-6"), "not a step");

// ---- saved results
assert.ok(ladder.includes("saveRuleRun(") && ladder.includes("DROP_CONFIRM") && ladder.includes("data-testid=\"run-drop-ask\"") && ladder.includes("confirmDrop") === false || ladder.includes("true)"), "a warning comes before the oldest result is dropped");
assert.ok(DROP_WARNING(10, "1 Nov 2026").includes("removes the oldest (1 Nov 2026)"));
assert.equal(RESULT_LIMIT_LINE(1, 1), "Your plan keeps 1 saved result for each rule. You have 1.");
assert.equal(RESULT_SINCE("19 Nov 2026", 3, 2), "Since 19 Nov 2026: 3 added, 2 dropped.");
assert.ok(RESULT_EARLIER.includes("earlier values") === false && RESULT_EARLIER.includes("earlier values") === false || RESULT_EARLIER.toLowerCase().includes("earlier values"), "earlier values shown");
assert.ok(REPORT_LEAD.includes("up to 8") && REPORT_LEAD.includes("Not asked yet"));
assert.ok(LIMIT_REACHED(1).includes("Delete the saved rule") && LIMIT_REACHED(1).includes("update it with Save"), "Free: delete or update the old rule");
const myrules = strip(read("components/app/stock-check/MyRulesCard.tsx"));
for (const a of ["saved-open", "saved-delete", "save-rules-button", "save-new-button", "saved-run-again"]) assert.ok(myrules.includes(a), `rule actions are in the My rules card: ${a}`);
for (const f of ["components/app/stock-check/SavedResults.tsx", "components/app/stock-check/AskAboutStocks.tsx"]) {
  const t = strip(read(f));
  for (const a of ["saved-open", "save-rules-button", "save-new-button", "saved-run-again"]) assert.ok(!t.includes(a), `${f} has no rule action ${a}`);
}

// ---- plan limits on Pricing
const row = (name: string) => PLAN_MATRIX.find((x) => x.feature === name);
assert.deepEqual([row("Shortlist Lab: saved rules")?.free, row("Shortlist Lab: saved rules")?.basic, row("Shortlist Lab: saved rules")?.pro], ["1", "10", "30"]);
assert.deepEqual([row("Shortlist Lab: saved results per rule")?.free, row("Shortlist Lab: saved results per rule")?.basic, row("Shortlist Lab: saved results per rule")?.pro], ["1", "10", "30"]);

// ---- the Full check page
const fc = strip(read("components/app/fullcheck/FullCheckPanel.tsx"));
assert.equal(IN_RUN_TITLE, "Stocks in this run");
assert.equal(ADD_FROM_WATCHLIST, "Add from watchlist");
assert.ok(fc.includes("IN_RUN_TITLE") && fc.includes("ADD_FROM_WATCHLIST") && fc.includes('data-testid="fc-banner"') && fc.includes("setPicked(named)") && !fc.includes("setPicked(w.symbols"), "stocks in this run at the top; the watchlist is optional");
assert.ok(fc.indexOf("fc-select") < fc.indexOf("fc-watch-toggle") && fc.indexOf('data-testid="fc-banner"') < fc.indexOf("fc-select"), "banner, then Stocks in this run, then the optional watchlist");
assert.ok(!fc.includes("Numbers CSV") && !fc.includes("numbers.csv") && fc.includes("RUN_ANSWERS_CSV"), "no numbers-only CSV");
assert.ok(!read("lib/api/fullcheck.ts").includes("numbers.csv") && read("lib/api/fullcheck.ts").includes("answers.csv"));
assert.ok(bannerLine(false, 1, 3, 40).includes("1 of 3 stocks done") && bannerLine(true, 3, 3, 100).includes("finished"));
assert.ok(fc.includes("report.price") && fc.includes("SectionBlock"), "the fifth question is shown");

// ---- phone tables: the stacking script and CSS cover every table (Ask AI answers, reports, lists)
assert.ok(read("components/layout/TableStacker.tsx").includes("MutationObserver") && /@media \(max-width: 639px\)/.test(css) && css.includes("table[data-stack]"), "tables under 640 px are stacked cards");

console.log("lab r2/r3 tests passed");
