// Create report, read-only rule page, Results shelf, pools wording and SEO (24 Nov 2026). Source and pure-function checks; the browser suites cover the screens.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as RF from "../src/lib/report-flow.ts";
import { EMPTY_RULES, rulesUpTo, typicalRules, SEO_TITLE } from "../src/lib/stock-check.ts";
import { ASK_GROUP_MAX } from "../src/lib/ask-group.ts";
import { PLAN_MATRIX } from "../src/data/plan-features.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ---- wording (exact where the owner gave the words)
assert.equal(RF.READONLY_LINE("My portfolio", 21, "15 Nov 2026"), "My portfolio · 21 stocks · 15 Nov 2026");
assert.equal(RF.NO_SAVED_RESULT, "No saved result yet");
assert.equal(RF.BACK_BUTTON, "Back");
assert.equal(RF.EDIT_RULE, "Edit rule");
assert.equal(RF.SEE_IN_RESULTS, "See details in Results");
assert.equal(RF.CREATE_REPORT, "Create report");
assert.equal(RF.CREATE_WITHOUT_AI, "Create without AI");
assert.equal(RF.CUSTOMISE, "Customise");
assert.equal(RF.USES_MONTH(12, 138), "This uses 12 questions. You will have 138 left this month.");
assert.equal(RF.USES_MONTH(1, 0), "This uses 1 question. You will have 0 left this month.");
assert.equal(RF.POOL_EMPTY("20 Dec 2026"), "You have used your report questions. They reset on 20 Dec 2026. Add-on questions work now.");
assert.equal(RF.ADD_AI_MORE, "Add AI for more stocks");
assert.equal(RF.OPEN_REPORT, "Open PDF");
assert.equal(RF.DOWNLOAD, "Download");
assert.equal(RF.SHELF_DELETE, "Delete");
assert.equal(RF.CUSTOM_TOTAL(10, 5), "10 stocks × 5 questions = 50 of 50 answers");
assert.equal(RF.offerLabel({ stocks: 6, questions: 5 }), "6 stocks × 5 questions");
assert.equal(RF.offerLabel({ stocks: 10, questions: 3 }), "10 stocks × 3 questions");
assert.ok(RF.FREE_UPGRADE_DOWNLOAD.includes("Basic and Pro") && RF.FREE_UPGRADE_REPORT.includes("Basic and Pro") && RF.FREE_UPGRADE_SAVE.includes("1 saved result") && RF.FREE_UPGRADE_QUESTIONS.includes("5 questions"), "Free upgrade messages");
assert.ok(!/log in/i.test(RF.FREE_UPGRADE_DOWNLOAD + RF.FREE_UPGRADE_REPORT + RF.FREE_UPGRADE_SAVE + RF.FREE_UPGRADE_QUESTIONS), "a logged-in Free user is never told to log in");

// ---- pure helpers
assert.deepEqual(RF.defaultStocks(["A", "B"]), ["A", "B"], "10 or fewer: all chosen");
assert.deepEqual(RF.defaultStocks(Array.from({ length: 11 }, (_, i) => `S${i}`)), [], "more than 10: none chosen for the person");
let sel: string[] = [];
for (let i = 0; i < 12; i += 1) sel = RF.toggleStock(sel, `S${i}`).list;
assert.equal(sel.length, 10, "at most 10 stocks");
assert.equal(RF.toggleStock(sel, "S11").capped, true);
assert.ok(RF.withinLimits(10, 5) && !RF.withinLimits(10, 6) && !RF.withinLimits(11, 1) && RF.withinLimits(6, 5) && RF.withinLimits(10, 3), "10 stocks and 50 answers");
assert.equal(ASK_GROUP_MAX, 10, "the Ask AI tick limit is 10 everywhere");
const t = typicalRules();
const early = rulesUpTo(t, 2);
assert.equal(early.roe, t.roe);
assert.equal(early.de, "", "a later step is left out of the names after an earlier step");
assert.equal(early.near52, "");
assert.deepEqual(rulesUpTo(t, 6), t);
assert.deepEqual(rulesUpTo(EMPTY_RULES, 3), EMPTY_RULES);

// ---- the rule page
const ladder = strip(read("components/app/stock-check/ShortlistLadder.tsx"));
const ro = ladder.slice(ladder.indexOf('data-testid="section-readonly"'), ladder.indexOf('data-testid="section-create"'));
assert.ok(ro.includes("BACK_BUTTON") && ro.includes('data-testid="edit-rule"') && ro.includes('data-testid="rule-result-button"') && ro.includes("VIEW_STOCKS") && ro.includes("EDIT_RULE"), "read-only: Back, Edit rule, View stocks");
assert.ok(!ro.includes("FillRow") && !ro.includes("save-name") && !ro.includes("rule-delete") && !ro.includes("ladder-bar") && !ro.includes("ABOUT_MATCH") && !ro.includes("SHOW_BUTTON}</button>"), "read-only: no Fill, Clear, name box, Save, Delete, Show or count box");
assert.ok((ro.match(/<button/g) ?? []).length === 5, "read-only page: Back, Edit rule, View stocks, and inside the card Create report and See details");
assert.ok(ro.includes("SEE_IN_RESULTS") && ro.includes("CREATE_REPORT") && !ro.includes("Download") && !ro.includes("Ask AI"), "the View stocks card has a link to Results and no downloads or Ask AI");
assert.ok(ladder.includes("READONLY_LINE(active.name, latest.count") && ladder.includes("NO_SAVED_RESULT"), "the one line: name, count and date from the latest saved result");
assert.ok(ladder.includes("setEditing(false)") && ladder.includes("setEditing(true)"), "a saved rule opens read-only; Edit rule makes it editable");
const ed = ladder.slice(ladder.indexOf('data-testid="section-create"'), ladder.indexOf('data-testid="section-results"'));
assert.ok(ed.includes("FillRow") && ed.includes("bottom()") && ed.includes("namesCard(") && ed.includes("step-view-stocks") && ed.includes("rulesUpTo") === false, "edit page: fill, bottom block, names after a step");
assert.ok(ladder.includes("liveLoader(upTo)") && ladder.includes("rulesUpTo(rules, upTo)") && ladder.includes("NAMES_PAGE") && ladder.includes("q: q.trim()"), "names after any step: the same rules up to that step, a search, pages of 30");
assert.ok(!ladder.includes("Your rule today") && !ladder.includes("ladder-cards") && !ladder.includes("askCard") && !ladder.includes("AskAboutStocks") && !ladder.includes("save-result-button"), "no live list, no ticking, no per-result Ask AI card and no separate Save this result");
assert.ok(ladder.includes("ReportSheet") && ladder.includes("ensure={ensure}") && ladder.includes("saveRuleRun(token, active.id, params, confirmDrop)") && ladder.includes("saveRuleWithResult"), "creating the report saves the result by itself");
const names = strip(read("components/app/stock-check/StockNames.tsx"));
assert.ok(names.includes("NAMES_SEARCH") && names.includes("NAMES_MORE") && names.includes("maxNote"), "names list: search box and Show more");
const parts = strip(read("components/app/stock-check/MyRulesParts.tsx"));
assert.ok(parts.includes('data-testid="save-name"') && parts.includes("rule-delete") && parts.includes("rule-result-button"), "the edit bottom block keeps the name box, Save, Delete and Show");

// ---- the report sheet
const sheet = strip(read("components/app/stock-check/ReportSheet.tsx"));
for (const a of ["CREATE_REPORT", "CREATE_WITHOUT_AI", "CUSTOMISE", "questionCheck(", "reportEstimate(", "reportCreate(", "reportJob(", "USES_MONTH", "USES_TODAY", "POOL_EMPTY", "OFFER_FITS", "withinLimits", "BUILDING_LEAVE", "FREE_UPGRADE_REPORT", "FREE_UPGRADE_QUESTIONS"]) assert.ok(sheet.includes(a), `report sheet: ${a}`);
assert.ok(sheet.includes("const MAX_STOCKS = 10") && sheet.includes("const MAX_ANSWERS = 50"), "10 stocks, 50 answers");
assert.ok(sheet.includes("total <= maxStocks") && sheet.includes("SHEET_TICK_UP_TO") && !/slice\(0, 10\)\.map|autoPick/.test(sheet), "10 or fewer: all chosen; more: the person ticks; nothing is chosen for them");
assert.ok(sheet.indexOf("questionCheck(token, q)") < sheet.indexOf("setCustom((c)"), "a typed question is checked before it is added");
assert.ok(!/log in/i.test(sheet), "no Log in text in the report sheet (a logged-in Free user sees upgrade messages)");

// ---- the shelf
const shelf = strip(read("components/app/stock-check/SavedResults.tsx"));
for (const a of ["OPEN_REPORT", "DOWNLOAD", "ADD_AI_MORE", "SHELF_DELETE", "OPEN_ON_SCREEN", "FREE_UPGRADE_DOWNLOAD", "reportOnScreen(", "reportsActive(", "BUILDING_LEAVE", "SAMPLE_PDF_PATH"]) assert.ok(shelf.includes(a), `shelf: ${a}`);
assert.ok(!shelf.includes("type=\"checkbox\"") && !shelf.includes("Select for Ask AI") && !shelf.includes("renderAsk"), "no ticking and no per-result Ask AI card on the shelf");
assert.ok(!/log in/i.test(shelf) && !/log in/i.test(strip(read("components/app/stock-check/PlanLimitDialog.tsx"))), "no Log in text where a Free user hits a limit");
const dlg = strip(read("components/app/stock-check/PlanLimitDialog.tsx"));
assert.ok(dlg.includes("SAVE_REPLACE_FREE") && dlg.includes("FREE_UPGRADE_SAVE") && dlg.includes("DELETE_OTHER") && dlg.includes("DialogDownloads") && dlg.includes('href="/pricing"'), "plan limit dialog: warning, downloads, delete a different result, pricing link");

// ---- Account, chat, Pricing, SEO
const acct = strip(read("components/app/account/AskUsageCard.tsx"));
assert.ok(acct.includes("Reports, this month") && acct.includes("Chat, this month") && acct.includes("Pools reset on") && acct.includes("report_limit"), "Account card: both pools and the reset date");
assert.ok(strip(read("components/app/ask/AskRedixFi.tsx")).includes("Chat questions this month:"), "chat shows the chat pool and its reset date");
assert.deepEqual(PLAN_MATRIX.filter((r) => /Ask AI/.test(r.feature)).map((r) => r.feature), ["Ask AI chat", "Ask AI reports", "Ask AI chat history kept"]);
assert.ok(!SEO_TITLE.includes("RedixFi"), "the brand is added once, by the site title template");
const page = read("app/(app)/shortlist-lab/page.tsx");
assert.ok(page.includes("images: [SHARE_IMAGE]") && page.includes("twitter:") && page.includes("images: [SHARE_IMAGE.url]"), "og:image and twitter:image on /shortlist-lab");
const sitemap = read("app/sitemap.xml/route.ts");
assert.ok(sitemap.includes('"/shortlist-lab"') && !sitemap.includes('"/stock-check"') && !sitemap.includes('"/start"'), "sitemap lists /shortlist-lab only");

// ---- wording guard on the new copy
const copy = [strip(read("lib/report-flow.ts")), ro, ed, sheet, shelf, dlg, names].join("\n")
  .replace(/className="[^"]*"/g, "").replace(/className=\{`[^`]*`\}/g, "").replace(/data-testid="[^"]*"/g, "").replace(/target="_blank"/g, "").replace(/e\.target/g, "");
const BANNED = /\b(recommended?|best|strong|standard|buy|buying|sell|selling|targets?|picks?|bullish|bearish|skip|avoid|candidates?|safe|score|verdict)\b/gi;
assert.deepEqual((copy.match(BANNED) ?? []).map((h) => h.toLowerCase()), [], "banned words in the new copy: " + JSON.stringify(copy.match(BANNED)));
assert.ok(!/\b(will rise|will fall|going to)\b/i.test(copy), "no forecast wording");
console.log("report flow tests: ok");
