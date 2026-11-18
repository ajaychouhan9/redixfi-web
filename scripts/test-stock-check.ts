// "The 15-Minute Stock Check" tests (19 Nov 2026): wording guard on the new copy, the /start redirect, the live-count logic, the bank note and the stored Ask AI answers.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import samples from "../src/data/ask-samples.json" with { type: "json" };
import { ASK_PREVIEW } from "../src/lib/ask-samples.ts";
import {
  BANK_NOTE, BANK_WHY, COMMON_LABEL, COMMON_RULES, EMPTY_RULES, HOME_BUTTON, LADDER_TITLE, MENU_LABEL, NO_ROCE_LINE, PAGE_SUBTITLE, PAGE_TITLE, PAST_LINE,
  PRICE_NOTE, RULES, SEO_TITLE, STEPS, STOCK_BUTTON, activeTests, countAfter, countsByStep, fromParams, hasAnyRule, roceGap, toParams, validLadderData,
  type LadderData, type Rules,
} from "../src/lib/stock-check.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// ---- 1. names, labels and addresses
assert.equal(PAGE_TITLE, "The 15-Minute Stock Check");
assert.equal(PAGE_SUBTITLE, "Stock analysis, simplified.");
assert.equal(MENU_LABEL, "Stock Check");
assert.equal(HOME_BUTTON, "New to stocks? Start the 15-minute check");
assert.equal(STOCK_BUTTON, "Run the 15-minute check");
assert.equal(SEO_TITLE, "How to Analyse a Stock in 15 Minutes | RedixFi");
assert.equal(LADDER_TITLE, "Build Your Shortlist");
assert.equal(COMMON_LABEL, "Common rules from published methods. Change them.");
assert.equal(PAST_LINE, "Filters use past reported numbers. They do not tell what happens next.");
assert.equal(PRICE_NOTE, "A good company can still be priced high.");
const page = read("app/(app)/stock-check/page.tsx");
assert.ok(page.includes('canonical: "/stock-check"') && page.includes("https://www.redixfi.com/stock-check") && page.includes("title: SEO_TITLE"), "title tag and canonical");
assert.ok(page.includes("PAGE_TITLE") && page.includes("PAGE_SUBTITLE") && /export const revalidate = \d+/.test(page) && !/\b(cookies|headers)\(\)|searchParams|await |fetch\(/.test(strip(page)), "static page with the new title");
assert.ok(read("components/app/home/HomeBoxes.tsx").includes("New to stocks? Start the 15-minute check") && read("components/app/VisitorIntroStrip.tsx").includes(HOME_BUTTON), "home buttons");
const stockPage = read("app/(app)/stocks/[symbol]/page.tsx");
assert.ok(stockPage.includes("Run the 15-minute check") && stockPage.includes('href="/stock-check"') && !stockPage.includes("New to this? Read a company in 15 minutes"), "stock page button replaces the small link");
assert.ok(read("components/layout/FooterDisclaimer.tsx").includes("Stock Check") && read("components/layout/FooterDisclaimer.tsx").includes('href="/stock-check"'), "footer label");

// ---- 2. /start returns a single 301 to /stock-check; the sitemap, llms.txt and internal links follow
const cfg = read("../next.config.ts");
const rules = [...cfg.matchAll(/\{\s*source:\s*"([^"]+)",\s*destination:\s*"([^"]+)",\s*statusCode:\s*(\d+)\s*\}/g)].map((m) => ({ source: m[1], destination: m[2], status: Number(m[3]) }));
const start = rules.filter((r) => r.source === "/start");
assert.equal(start.length, 1, "exactly one redirect for /start");
assert.deepEqual(start[0], { source: "/start", destination: "/stock-check", status: 301 });
assert.ok(!rules.some((r) => r.source === "/stock-check"), "no chain: the destination is not redirected again");
assert.ok(!/restructure|renamed/.test("") && !read("lib/seo/restructure-redirects.ts").includes('"/start"'), "no second /start rule in the restructure list");
const sitemap = read("app/sitemap.xml/route.ts");
assert.ok(sitemap.includes('"/stock-check"') && !sitemap.includes('"/start"'), "sitemap lists /stock-check only");
assert.ok(read("app/llms.txt/route.ts").includes("https://www.redixfi.com/stock-check") && !read("app/llms.txt/route.ts").includes("redixfi.com/start"), "llms.txt");
for (const f of ["app/(app)/signals/page.tsx", "components/app/home/HomeBoxes.tsx", "components/app/VisitorIntroStrip.tsx", "app/(app)/stocks/[symbol]/page.tsx"]) {
  assert.ok(!/href="\/start"/.test(read(f)), `${f} has no link to /start`);
}

// ---- 3. live counts: pure, from anonymous rows
const COLS = ["mc", "eps", "py", "sgq", "pgq", "sg3", "pg3", "roe", "roce", "rna", "de", "pl", "vol", "vr", "dl", "pe"];
const row = (o: Record<string, number | null>): (number | null)[] => COLS.map((c) => (c in o ? o[c] : null));
const data: LadderData = {
  version: 1, as_of: "2026-11-19", fund_quarter_end: "2026-09-30", built_at: "2026-11-19T14:00:00Z", cols: COLS,
  rows: [
    row({ mc: 50000, eps: 5, py: 5, sg3: 12, roe: 25, roce: 30, rna: 0, de: 0.1, pl: 0, vol: 20, pe: 30 }),
    row({ mc: 800, eps: 2, py: 5, sg3: 15, roe: 18, roce: 16, rna: 0, de: 0.5, pl: 12, vol: 80, pe: 12 }),
    row({ mc: 20000, eps: 3, py: 4, sg3: 11, roe: 16, roce: null, rna: 1, de: null, pl: 0, vol: 30, pe: 9 }),   // a bank: no ROCE, no debt-to-equity
    row({ mc: 3000, eps: -1, py: 2, sg3: -3, roe: 4, roce: 5, rna: 0, de: 2, pl: 40, vol: 90, pe: null }),
    row({ mc: 9000, eps: 4, py: 5, sg3: 14, roe: 20, roce: null, rna: 0, de: 0.3, pl: 1, vol: 55, pe: 20 }),      // no ROCE figure, not a bank
  ],
};
assert.ok(validLadderData(data) && !validLadderData({ ...data, version: 2 }) && !validLadderData({ ...data, rows: [[1]] }) && !validLadderData(null));
assert.equal(countAfter(data, EMPTY_RULES, 5), 5, "no rules: every stock");
assert.equal(countAfter(data, { ...EMPTY_RULES, mcMin: "1000" }, 0), 4, "size rule");
assert.equal(countAfter(data, { ...EMPTY_RULES, mcMin: "1000" }, 1) , 4);
const common: Rules = { ...COMMON_RULES };
assert.deepEqual(countsByStep(data, common), [4, 2, 1, 1, 1, 1], "the count after each step only gets smaller");
assert.ok(countsByStep(data, common).every((n, i, a) => i === 0 || n <= a[i - 1]));
assert.equal(countAfter(data, { ...EMPTY_RULES, profitYears: "5" }, 0), 5, "a rule from a later step does not count in an earlier step");
assert.equal(countAfter(data, { ...EMPTY_RULES, profitYears: "5" }, 1), 3);
assert.equal(countAfter(data, { ...EMPTY_RULES, de: "1" }, 3), 3, "a stock with no debt-to-equity figure does not pass a debt rule");
assert.equal(countAfter(data, { ...EMPTY_RULES, roce: "15" }, 2), 2, "a stock with no ROCE figure does not pass a ROCE rule");
assert.equal(countAfter(data, { ...EMPTY_RULES, vol: "calmer", volNum: "40" }, 4), 2, "calmer: lower volatility rank");
assert.equal(countAfter(data, { ...EMPTY_RULES, vol: "calmer", volNum: "40" }, 3), 5, "price behaviour counts only from step 4");
assert.equal(countAfter(data, { ...EMPTY_RULES, vol: "active", volNum: "75" }, 4), 2, "more active: higher volatility rank");
assert.equal(countAfter(data, { ...EMPTY_RULES, pe: "15" }, 5), 2);
assert.equal(countAfter(data, { ...EMPTY_RULES, roe: "abc" }, 5), 5, "text that is not a number is no rule");
assert.equal(countAfter({ ...data, cols: ["mc"], rows: [[1]] }, { ...EMPTY_RULES, roe: "10" }, 5), 0, "a rule on a column the file does not carry matches nothing");
assert.deepEqual(roceGap(data, { ...EMPTY_RULES, mcMin: "1000", roce: "15" }), { noFigure: 2, notApplicable: 1 }, "no ROCE figure: 2 stocks, 1 of them a bank");
assert.equal(NO_ROCE_LINE(2), "2 stocks have no ROCE figure and are left out of this filter");
assert.equal(NO_ROCE_LINE(1), "1 stock has no ROCE figure and is left out of this filter");
assert.equal(NO_ROCE_LINE(1281), "1,281 stocks have no ROCE figure and are left out of this filter");
// the counts and the shortlist use the same rules: the same parameters the server filters on
assert.deepEqual(toParams(common), { market_cap_min: 1000, eps_positive: true, profit_years_min: 5, sales_cagr_3y_min: 10, roe_min: 15, roce_min: 15, de_max: 1, pledge_max: 10 });
assert.deepEqual(toParams({ ...EMPTY_RULES, vol: "calmer", volNum: "25" }), { volatility_max: 25 });
assert.deepEqual(toParams({ ...EMPTY_RULES, vol: "active", volNum: "75" }), { volatility_min: 75 });
assert.deepEqual(toParams(EMPTY_RULES), {});
assert.deepEqual(fromParams(toParams(common) as Record<string, unknown>), common, "saved rules come back as they were");
assert.deepEqual(fromParams(toParams({ ...common, vol: "active", volNum: "70", pe: "20" }) as Record<string, unknown>), { ...common, vol: "active", volNum: "70", pe: "20" });
assert.deepEqual(fromParams({ sector: "NIFTYIT", sort: "name" } as Record<string, unknown>), EMPTY_RULES, "filters the ladder has no rule for are ignored");
assert.ok(hasAnyRule(common) && !hasAnyRule(EMPTY_RULES));
assert.equal(activeTests(common, 0).length, 1, "step 0 carries one rule");
assert.ok(RULES.every((r) => r.param && r.col), "every rule has a server filter and a column");
assert.ok(COMMON_RULES.vol === "" && COMMON_RULES.pe === "", "price behaviour and P/E are choices, not starting rules");

// ---- 4. the bank note: exact text, on the ROCE step, the debt step and under the Screener ROCE filter
assert.equal(BANK_NOTE, "ROCE is not shown for banks, insurers and finance companies. Their business is borrowing and lending money, so the ROCE formula does not work for them.");
assert.ok(BANK_WHY.startsWith("ROCE asks: for every Rs 100 put into the business, how much operating profit did it earn?") && BANK_WHY.endsWith("Return on equity is shown on this page. The others are not on the page yet."), "the Why text");
assert.ok(BANK_WHY.includes("like steel for a car maker") && BANK_WHY.includes("the gap between what they earn on loans and pay on deposits"));
const ladder = strip(read("components/app/stock-check/ShortlistLadder.tsx"));
assert.ok(ladder.includes("{BANK_NOTE}") && ladder.includes("{BANK_WHY_LABEL}") && ladder.includes("{BANK_WHY}") && ladder.includes('data-testid="bank-why"'), "the note and a Why? that opens the text");
assert.ok(/step === 2 &&[\s\S]*?<BankNote \/>/.test(ladder) && /step === 3 && <BankNote testId="bank-note-debt" \/>/.test(ladder), "shown on the ROCE step and on the debt step");
assert.ok(ladder.includes("COMPARE_NOTE") && STEPS[2].why.includes("Compare a company with others of its own kind."), "step 2 compare line");
const funds = strip(read("components/app/signals/FundamentalFilters.tsx"));
assert.ok(funds.includes("<BankNote testId=\"bank-note-screener\" />"), "under the Screener ROCE filter");
assert.ok(ladder.includes("NO_ROCE_LINE(gap.noFigure)") && ladder.includes("NO_ROCE_LINE(roceCounts.no)"), "the no-figure line on the step and on the shortlist");

// ---- 5. the ladder: steps, buttons, no ranking, no fake filter
assert.deepEqual(STEPS.map((s) => s.title), ["Size and trading", "Is it earning?", "Is it using money well?", "Is it safe?", "How does the price behave?", "What you pay (optional)"]);
assert.ok(STEPS.every((s) => s.why.split(/(?<=[.!?])\s+/).length <= 4), "each why-this-rule is two to four short sentences");
assert.ok(ladder.includes("START_COMMON") && ladder.includes("CLEAR_ALL") && ladder.includes("COMMON_LABEL") && ladder.includes("ladder-bar") && ladder.includes("ladder-left") && /stocks?\"? : \"stocks\"|"stock" : "stocks"/.test(ladder));
assert.ok(!/\bfetch\(/.test(ladder) && ladder.includes("getLadderData()") && (ladder.match(/getSignals\(/g) ?? []).length === 1, "one figures file, one list call (only when asked)");
assert.ok(ladder.includes("Add to watchlist") && ladder.includes("Read this company") && ladder.includes("RESULTS_TITLE") && ladder.includes('value: "name"') === false);
assert.ok(ladder.includes("NUMBERS_AS_OF(asOf)"), "numbers as of <date>");
assert.equal(read("lib/stock-check.ts").includes("sort: \"composite"), false);
assert.ok(/Name, A to Z/.test(read("lib/stock-check.ts")) && ladder.includes("SORT_CHOICES[0]"), "A to Z unless the user chooses a column");

// ---- 6. stored Ask AI answers
assert.equal(samples.symbol, "HINDUNILVR");
assert.deepEqual(samples.answers.map((a) => a.id), ["points", "management", "numbers"]);
assert.deepEqual(samples.answers.map((a) => a.question), [
  "List the points to watch for this company, with sources",
  "What did management say in the latest concall and annual report? List guidance, capex plans and risks",
  "Show sales, profit, margin and debt for the last 3 years",
]);
for (const a of samples.answers) {
  assert.ok(a.sources.length >= 1 && a.sources.every((s) => s.label && /\d{4}/.test(s.date)), `${a.id}: a source filing with a date`);
}
assert.ok(samples.answers[2].table && samples.answers[2].table.columns.length === 4 && samples.answers[2].table.rows.length === 4, "the 3-year table");
assert.equal(ASK_PREVIEW.csvLocked, "Log in to download CSV");
assert.equal(ASK_PREVIEW.login, "Log in to ask your own question");
assert.equal(ASK_PREVIEW.note, "Sample, not a suggestion. Not advice.");
const preview = strip(read("components/app/stock-check/AskPreview.tsx"));
assert.ok(preview.includes("disabled") && preview.includes("ASK_PREVIEW.csvLocked") && preview.includes("ASK_PREVIEW.note") && preview.includes("ASK_PREVIEW.login") && preview.includes("Stored {when}"), "disabled CSV button, note, login line, stored date and source under each answer");
assert.ok(!/fetch\(|getSignals|sendAsk|apiMutate|openWithQuestion/.test(preview), "no model call and no request from the preview");
assert.ok(strip(read("components/app/stock-check/LoggedOutPreview.tsx")).includes("if (user) return null"), "logged-out only on the page");
const panel = read("components/app/ask/AskRedixFi.tsx");
assert.ok(panel.includes("panel-preview") && panel.includes("user.tier === \"free\"") && panel.includes("{open &&"), "in the Ask AI panel: logged-out and Free, only while it is open");
const stored = JSON.stringify(samples);
// a few numbers checked against the database and the filings on 19 Nov 2026 (see the report): sales, profit and debt for three years
for (const n of ["64,468", "61,328", "61,896", "15,040", "10,649", "10,277", "1,478", "1,648", "1,484", "0.54%", "22-24%"]) assert.ok(stored.includes(n), `stored figure ${n}`);

// ---- 7. wording guard on all new copy (the owner's banned list), and no risk labels
const copy = [
  strip(read("lib/stock-check.ts")), strip(read("lib/ask-samples.ts")), stored, strip(read("app/(app)/stock-check/page.tsx")).replace(/no buy or sell advice/g, ""),
  strip(read("components/app/stock-check/ShortlistLadder.tsx")).replace(/target="_blank"|e\.target/g, ""),
  preview.replace(/target="_blank"/g, ""), strip(read("components/app/stock-check/LoggedOutPreview.tsx")),
].join("\n").replace(/className="[^"]*"/g, "").replace(/className=\{`[^`]*`\}/g, "").replace(/data-testid="[^"]*"/g, "");
const BANNED = /\b(buy|buying|sell|selling|targets?|picks?|bullish|bearish|strong signal|catch a falling knife|skip|avoid|candidates?|high conviction|red flags?|turnaround|top stocks|best stocks|quality stocks)\b/gi;
assert.deepEqual((copy.match(BANNED) ?? []).map((h) => h.toLowerCase()), [], "banned words in the new copy");
assert.ok(!/\b(aggressive|conservative|risk appetite|risk profile|your risk)\b/i.test(copy), "no risk appetite and no aggressive or conservative labels");
assert.ok(!/\b(top|best)\b/i.test(copy.replace(/top-|top:/g, "")), "never top or best");
assert.ok(!/\b(will rise|will fall|will go up|will go down|going to)\b/i.test(copy), "no forecast wording");
assert.ok(copy.includes("points to watch") && !/red flag/i.test(copy), "points to watch, never red flag");
assert.ok(copy.includes("stocks that meet the rules you chose") || copy.includes("Stocks that meet the rules you chose"), "results are called stocks that meet the rules you chose");

console.log("stock check tests: ok");
