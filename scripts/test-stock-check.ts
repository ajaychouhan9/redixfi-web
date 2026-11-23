// "The 15-Minute Stock Check" tests (19 Nov 2026): wording guard on the new copy, the /start redirect, the live-count logic, the bank note and the stored Ask AI answers.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import samples from "../src/data/ask-samples.json" with { type: "json" };
import { ASK_PREVIEW, sampleIdFor } from "../src/lib/ask-samples.ts";
import { ASK_QUESTIONS } from "../src/lib/read-company.ts";
import {
  BANK_NOTE, BANK_WHY, COMMON_RULES, DEBT_NOTE, DEBT_WHY, EXAMPLES, exampleLine, ruleProblem, validValue, COUNTS_NOTE, EMPTY_RULES, HOME_BUTTON, LADDER_TITLE, MENU_LABEL, NO_ROCE_LINE, PAGE_SUBTITLE, PAGE_TITLE, PAST_LINE,
  RULES, SEO_TITLE, STEPS, activeTests, countAfter, countsByStep, fromParams, hasAnyRule, roceGap, toParams, validLadderData,
  type LadderData, type Rules,
} from "../src/lib/stock-check.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// ---- 1. names, labels and addresses
assert.equal(PAGE_TITLE, "Shortlist Lab");
assert.equal(PAGE_SUBTITLE, "Set your rules. Read the result.");
assert.equal(MENU_LABEL, "Shortlist Lab");
assert.equal(HOME_BUTTON, "New to stocks? Learn the 5 questions");
assert.equal(SEO_TITLE, "Shortlist Lab: set your rules, read the result | RedixFi");
assert.equal(LADDER_TITLE, "Build Your Shortlist");
assert.equal(PAST_LINE, "Filters use past reported numbers. They do not tell what happens next.");
const page = read("app/(app)/shortlist-lab/page.tsx");
assert.ok(page.includes('canonical: "/shortlist-lab"') && page.includes("https://www.redixfi.com/shortlist-lab") && page.includes("title: SEO_TITLE"), "title tag and canonical");
assert.ok(page.includes("PAGE_TITLE") && page.includes("PAGE_SUBTITLE") && /export const revalidate = \d+/.test(page) && !/\b(cookies|headers)\(\)|searchParams|await |fetch\(/.test(strip(page)), "static page with the new title");
assert.ok(read("components/app/home/HomeBoxes.tsx").includes("Shortlist Lab") && read("components/app/VisitorIntroStrip.tsx").includes(HOME_BUTTON), "home buttons");
const stockPage = read("app/(app)/stocks/[symbol]/page.tsx");
assert.ok(!stockPage.includes("Learn the 5 questions") && !stockPage.includes("run-check-button") && !stockPage.includes("New to this? Read a company in 15 minutes"), "the stock page has no learn link");
assert.ok(read("components/layout/FooterDisclaimer.tsx").includes("Shortlist Lab") && read("components/layout/FooterDisclaimer.tsx").includes('href="/shortlist-lab"'), "footer label");

// ---- 2. /start and /stock-check each return a single 301 to /shortlist-lab; the sitemap, llms.txt and internal links follow
const cfg = read("../next.config.ts");
const rules = [...cfg.matchAll(/\{\s*source:\s*"([^"]+)",\s*destination:\s*"([^"]+)",\s*statusCode:\s*(\d+)\s*\}/g)].map((m) => ({ source: m[1], destination: m[2], status: Number(m[3]) }));
const start = rules.filter((r) => r.source === "/start");
assert.equal(start.length, 1, "exactly one redirect for /start");
assert.deepEqual(start[0], { source: "/start", destination: "/shortlist-lab", status: 301 });
assert.deepEqual(rules.filter((r) => r.source === "/stock-check"), [{ source: "/stock-check", destination: "/shortlist-lab", status: 301 }], "the old address goes straight to Shortlist Lab");
assert.ok(!rules.some((r) => r.source === "/shortlist-lab"), "no chain: the destination is not redirected again");
assert.ok(!/restructure|renamed/.test("") && !read("lib/seo/restructure-redirects.ts").includes('"/start"'), "no second /start rule in the restructure list");
const sitemap = read("app/sitemap.xml/route.ts");
assert.ok(sitemap.includes('"/shortlist-lab"') && !sitemap.includes('"/stock-check"') && !sitemap.includes('"/start"'), "sitemap lists /shortlist-lab only");
assert.ok(read("app/llms.txt/route.ts").includes("https://www.redixfi.com/shortlist-lab") && !read("app/llms.txt/route.ts").includes("redixfi.com/start"), "llms.txt");
for (const f of ["app/(app)/signals/page.tsx", "components/app/home/HomeBoxes.tsx", "components/app/VisitorIntroStrip.tsx", "app/(app)/stocks/[symbol]/page.tsx"]) {
  assert.ok(!/href="\/start"/.test(read(f)), `${f} has no link to /start`);
}

// ---- 3. live counts: pure, from anonymous rows
const COLS = ["mc", "eps", "py", "sgq", "pgq", "sg3", "pg3", "roe", "roce", "rna", "de", "pl", "vol", "vr", "dl", "pe", "gs", "h52", "r1", "r3", "r6", "a50", "a200", "vd"];
const row = (o: Record<string, number | null>): (number | null)[] => COLS.map((c) => (c in o ? o[c] : null));
const data: LadderData = {
  version: 1, as_of: "2026-11-19", fund_quarter_end: "2026-09-30", built_at: "2026-11-19T14:00:00Z", cols: COLS,
  rows: [
    row({ mc: 50000, eps: 5, py: 5, sg3: 12, pg3: 12, sgq: 12, pgq: 15, roe: 25, roce: 30, rna: 0, de: 0.1, pl: 0, vol: 20, vr: 1.6, dl: 55, pe: 22 }),
    row({ mc: 800, eps: 2, py: 5, sg3: 15, pg3: 13, sgq: 11, pgq: 12, roe: 18, roce: 16, rna: 0, de: 0.5, pl: 12, vol: 80, vr: 1.2, dl: 60, pe: 12 }),
    row({ mc: 20000, eps: 3, py: 4, sg3: 11, roe: 16, roce: null, rna: 1, de: null, pl: 0, vol: 30, pe: 9 }),   // a bank: no ROCE, no debt-to-equity
    row({ mc: 3000, eps: -1, py: 2, sg3: -3, roe: 4, roce: 5, rna: 0, de: 2, pl: 40, vol: 90, pe: null }),
    row({ mc: 9000, eps: 4, py: 5, sg3: 14, pg3: 10, sgq: 11, pgq: 10, roe: 20, roce: null, rna: 0, de: 0.3, pl: 1, vol: 55, vr: 1.5, dl: 52, pe: 20 }),      // no ROCE figure, not a bank
  ],
};
assert.ok(validLadderData(data) && !validLadderData({ ...data, version: 2 }) && !validLadderData({ ...data, rows: [[1]] }) && !validLadderData(null));
assert.equal(countAfter(data, EMPTY_RULES, 6), 5, "no rules: every stock");
assert.equal(countAfter(data, { ...EMPTY_RULES, mcMin: "1000" }, 0), 4, "size rule");
assert.equal(countAfter(data, { ...EMPTY_RULES, mcMin: "1000" }, 1) , 4);
const common: Rules = { ...COMMON_RULES };
assert.deepEqual(countsByStep(data, common), [5, 3, 2, 1, 1, 1, 1], "the count after each step only gets smaller");
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
assert.deepEqual(toParams(common), { market_cap_min: 500, eps_positive: true, profit_years_min: 5, sales_cagr_3y_min: 10, profit_cagr_3y_min: 10, sales_growth_min: 10, profit_growth_min: 10, roe_min: 15, roce_min: 15, de_max: 1, pledge_max: 10, pe_max: 25 });
assert.deepEqual(toParams({ ...EMPTY_RULES, vol: "calmer", volNum: "25" }), { volatility_max: 25 });
assert.deepEqual(toParams({ ...EMPTY_RULES, vol: "active", volNum: "75" }), { volatility_min: 75 });
assert.deepEqual(toParams(EMPTY_RULES), {});
assert.deepEqual(fromParams(toParams(common) as Record<string, unknown>), common, "saved rules come back as they were");
assert.deepEqual(fromParams(toParams({ ...common, vol: "active", volNum: "70", pe: "20" }) as Record<string, unknown>), { ...common, vol: "active", volNum: "70", pe: "20" });
assert.deepEqual(fromParams({ sector: "NIFTYIT", sort: "name" } as Record<string, unknown>), EMPTY_RULES, "filters the ladder has no rule for are ignored");
assert.ok(hasAnyRule(common) && !hasAnyRule(EMPTY_RULES));
assert.equal(activeTests(common, 0).length, 1, "step 0 carries one rule");
assert.ok(RULES.every((r) => r.param && r.col), "every rule has a server filter and a column");
assert.ok(COMMON_RULES.vol === "" && COMMON_RULES.volNum === "", "calmer / more active is a choice and is not pre-set");
assert.deepEqual(
  { mc: COMMON_RULES.mcMin, py: COMMON_RULES.profitYears, s3: COMMON_RULES.sales3, p3: COMMON_RULES.profit3, sq: COMMON_RULES.salesQ, pq: COMMON_RULES.profitQg, roe: COMMON_RULES.roe, roce: COMMON_RULES.roce, de: COMMON_RULES.de, pl: COMMON_RULES.pledge, pe: COMMON_RULES.pe },
  { mc: "500", py: "5", s3: "10", p3: "10", sq: "10", pq: "10", roe: "15", roce: "15", de: "1", pl: "10", pe: "25" },
  "Start with common rules fills the example values",
);
for (const d of RULES.filter((r) => r.op !== "gt0" && r.op !== "flag" && r.step < 6)) {
  assert.ok(EXAMPLES[d.key], `${d.key} has an example`);
  if (d.step === 4) assert.equal(COMMON_RULES[d.key], "", `${d.key}: Start with common rules leaves Step 4 on No rule (the example stays as the placeholder)`);
  else assert.equal(COMMON_RULES[d.key], EXAMPLES[d.key].value, `${d.key} common value equals its example`);
}
assert.ok(COMMON_RULES.vol === "" && COMMON_RULES.volNum === "" && COMMON_RULES.volRatio === "" && COMMON_RULES.delivery === "", "Step 4 is not prefilled");
assert.equal(COUNTS_NOTE, "Counts come from last night's figures. The final list may differ by a few stocks.");
assert.equal(exampleLine(EXAMPLES.volRatio.text), "e.g. 1.5 times");
assert.equal(exampleLine(EXAMPLES.roce.text), "e.g. 15 (%)");
assert.ok(!/many people|most people|popular/i.test(JSON.stringify(EXAMPLES)), "no popularity claim");
assert.equal(EXAMPLES.mcMin.text, "500 (₹ crore)");

// ---- 4. the bank note: exact text, on the ROCE step, the debt step and under the Screener ROCE filter
assert.equal(BANK_NOTE, "ROCE is not shown for banks, insurers and finance companies. Their business is borrowing and lending money, so the ROCE formula does not work for them.");
assert.ok(BANK_WHY.startsWith("ROCE asks: for every Rs 100 put into the business, how much operating profit did it earn?") && BANK_WHY.endsWith("Return on equity is shown on this page. The others are not on the page yet."), "the Why text");
assert.ok(BANK_WHY.includes("like steel for a car maker") && BANK_WHY.includes("the gap between what they earn on loans and pay on deposits"));
// the ladder is the page component plus the cards it is made of (My rules, Rules applied, Ask AI about these stocks)
const ladder = ["ShortlistLadder", "MyRulesParts", "RulesApplied", "AskAboutStocks"].map((f) => strip(read(`components/app/stock-check/${f}.tsx`))).join("\n");
assert.ok(ladder.includes("{note}") && ladder.includes("{BANK_WHY_LABEL}") && ladder.includes("{why}") && ladder.includes("note = BANK_NOTE") && ladder.includes("why = BANK_WHY"), "the note and a Why? that opens the text");
assert.ok(/step === 2 &&[\s\S]*?<BankNote \/>/.test(ladder), "the ROCE note is shown on the ROCE step");
// Step 3 (debt to equity): its own note, not the ROCE note
assert.equal(DEBT_NOTE, "Debt to equity does not suit banks and finance companies. Borrowing is their business.");
assert.ok(DEBT_WHY.includes("Debt to equity compares what a company owes with what its owners put in.") && DEBT_WHY.includes("high by design"), "the debt Why text");
assert.ok(/step === 3 && num\(rules\.de\) !== undefined && <BankNote testId="bank-note-debt" note=\{DEBT_NOTE\} why=\{DEBT_WHY\}/.test(ladder), "the debt step carries the debt note");
assert.ok(!/step === 3 && <BankNote testId="bank-note-debt" \/>/.test(ladder), "the ROCE note is not on the debt step");
const funds = strip(read("components/app/signals/FundamentalFilters.tsx"));
assert.ok(funds.includes("<BankNote testId=\"bank-note-screener\" />"), "under the Screener ROCE filter");
assert.ok(ladder.includes("NO_ROCE_LINE(gap.noFigure)") && ladder.includes("NO_ROCE_LINE(roceCounts.no)"), "the no-figure line on the step and on the shortlist");

// ---- 5. the ladder: steps, buttons, no ranking, no fake filter
assert.deepEqual(STEPS.map((s) => s.title), ["Size and trading", "Earnings", "Returns", "Debt and pledge", "Price movement", "Price you pay", "Price and volume"]);
assert.ok(STEPS.every((s) => !("why" in s)), "no long why-this-rule text on the rules page (the Learn tab explains)");
for (const gone of ["Set the rules that matter to you", "The bar that stays on screen", "Why this rule", "Typical numbers from published methods", "With no rules set, every stock is listed"]) assert.ok(!ladder.includes(gone) && !read("lib/stock-check.ts").includes(gone), `removed from the rules page: ${gone}`);
assert.ok(ladder.includes("BLANK_LINE") && ladder.includes("PAST_LINE"), "the two lines that stay");
assert.ok(ladder.includes("typicalRules()") && ladder.includes("ladder-fill") && ladder.includes("ladder-bar") && ladder.includes("ladder-left") && ladder.includes("ABOUT_MATCH(left)"));
assert.ok(!/\bfetch\(/.test(ladder) && ladder.includes("getLadderData()") && (ladder.match(/getSignals\(/g) ?? []).length === 1, "one figures file and one list call (the saved result is made by the server)");
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
assert.ok(/Showing 3 of 11 items\. See all on the Points to watch tab\./.test(String(samples.answers[0].lead)) && samples.answers[0].table!.rows.length === 3, "points answer states the total");
assert.ok(JSON.stringify(samples.answers[2].notes).includes("discontinued operations") && samples.answers[2].table!.rows[2][0] === "Margin, all profit", "numbers answer names the discontinued items and labels the margin row");
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
  strip(read("lib/stock-check.ts")), strip(read("lib/ask-samples.ts")), stored, strip(read("app/(app)/shortlist-lab/page.tsx")).replace(/no buy or sell advice/g, ""),
  // the Use / Skip switch was removed on 22 Nov 2026: nothing is left out of this scan any more
  ladder.replace(/target="_blank"|e[.]target/g, ""), strip(read("lib/my-rules.ts")), strip(read("lib/ask-group.ts")),
  preview.replace(/target="_blank"/g, ""), strip(read("components/app/stock-check/LoggedOutPreview.tsx")),
].join("\n").replace(/className="[^"]*"/g, "").replace(/className=\{`[^`]*`\}/g, "").replace(/data-testid="[^"]*"/g, "");
const BANNED = /\b(buy|buying|sell|selling|targets?|picks?|bullish|bearish|strong signal|catch a falling knife|skip|avoid|candidates?|high conviction|red flags?|turnaround|top stocks|best stocks|quality stocks)\b/gi;
assert.deepEqual((copy.match(BANNED) ?? []).map((h) => h.toLowerCase()), [], "banned words in the new copy: " + JSON.stringify(copy.match(BANNED)) + copy.split(String.fromCharCode(10)).filter((l) => /\bskip\b/i.test(l)).join(" // "));
assert.ok(!/\b(aggressive|conservative|risk appetite|risk profile|your risk)\b/i.test(copy), "no risk appetite and no aggressive or conservative labels");
assert.ok(!/\b(top|best)\b/i.test(copy.replace(/top-|top:/g, "")), "never top or best");
assert.ok(!/\b(will rise|will fall|will go up|will go down|going to)\b/i.test(copy), "no forecast wording");
assert.ok(copy.includes("points to watch") && !/red flag/i.test(copy), "points to watch, never red flag");
assert.ok(ladder.includes('"stocks match"') && ladder.includes("your rule today"), "results are called stocks that match your rule today");

// ---- 5. examples in every input, chips that open the panel, the sticky bar button, the stored answers inside the panel
for (const d of RULES.filter((r) => r.op !== "gt0" && r.op !== "flag")) assert.ok(ladder.includes("EXAMPLES[d.key]") && ladder.includes("exampleLine(EXAMPLES[d.key].text)"), "every number input shows its example line");
assert.ok(ladder.includes("`e.g. ${EXAMPLES[d.key].value}`"), "an empty box shows a grey e.g. hint, never a bare number");
assert.ok(!copy.match(/many people use[^.]*(best|top|buy|sell|pick|target)/i), "examples are not recommendations");
const fundsSrc = read("components/app/signals/FundamentalFilters.tsx");
for (const [key, v] of [["peMax", "25"], ["roeMin", "15"], ["roceMin", "15"], ["profitGrowthMin", "10"], ["salesGrowthMin", "10"], ["deMax", "1"], ["pledgeMax", "10"], ["deliveryMin", "50"]] as const) {
  const at = fundsSrc.indexOf(`onChange({ ${key}: `);
  const seg = at < 0 ? "" : fundsSrc.slice(at, fundsSrc.indexOf("<Example", at));
  assert.ok(seg.includes(`placeholder="${v}"`) && fundsSrc.slice(at, at + seg.length + 120).includes("<Example"), `Screener ${key} shows the example ${v}`);
}
const explorer = read("components/app/signals/SignalsExplorer.tsx");
assert.ok(explorer.includes('placeholder="1.5"') && explorer.includes('<Example text="1.5 (times)" />'), "Screener volume vs usual example");
assert.ok(!/href=\{askHref/.test(ladder) && ladder.includes("openWithStocks(selected, { fromLab: true })") && !ladder.includes("ladder-step-6") && !ladder.includes("STEP6"), "Step 6 is gone; Ask AI opens a new session with the ticked stocks");
const readCo = read("components/app/stock-check/LearnTab.tsx");
assert.ok(!readCo.includes("askHref") && !readCo.includes("openWithStocks"), "the Learn tab no longer has an Ask AI button card");
assert.ok(ladder.includes('data-testid="ladder-bar-show"') && (ladder.match(/SHOW_BUTTON\}/g) ?? []).length === 1 && !ladder.includes('data-testid="ladder-show"'), "ONE Show button, inside the sticky bar");
const samplePanel = read("components/app/ask/SamplePanel.tsx");
assert.ok(samplePanel.includes("sampleIdFor(q, samples.answers, ALIASES)") && samplePanel.includes("LOGIN_FOR_OWN"), "the panel answers the sample questions and asks for a log-in for anything else");
const aliases = { [ASK_QUESTIONS.points]: "points", [ASK_QUESTIONS.financials]: "numbers", [ASK_QUESTIONS.management]: "management" };
const sq = samples.answers;
assert.equal(sampleIdFor("List the points to watch for this company, with sources", sq, aliases), "points");
assert.equal(sampleIdFor("  list the POINTS to watch for this company. ", sq, aliases), "points", "the page chip text matches");
assert.equal(sampleIdFor("Show sales, profit, margin and debt for the last 3 years", sq, aliases), "numbers");
assert.equal(sampleIdFor("Show this company's sales, profit, margin and debt trend for the last 3 years.", sq, aliases), "numbers");
assert.equal(sampleIdFor("What did management say in the latest concall and annual report? List guidance, capex plans and risks", sq, aliases), "management");
assert.equal(sampleIdFor("Show recent promoter, insider and bulk or block deal activity.", sq, aliases), null, "any other question needs a log-in");
assert.equal(sampleIdFor("", sq, aliases), null);
const ctx = read("lib/ask-panel/AskPanelContext.tsx");
assert.ok(ctx.includes("openWithQuestion: (question: string, symbol?: string) => void") && ctx.includes("pendingSymbol"), "the panel can carry a company with the question");
assert.ok(read("components/app/ask/AskRedixFi.tsx").includes("if (pendingSymbol) pickSymbol(pendingSymbol)") && read("components/app/ask/AskRedixFi.tsx").includes("<SamplePanel"), "panel: company context from a non-stock page; samples for logged-out visitors");
// ---- 6. values the server would refuse are not rules: not counted, not sent, and the person is told
const rd = (k: string) => RULES.find((d) => d.key === k)!;
assert.equal(validValue(rd("profitYears"), "5"), true);
assert.equal(validValue(rd("profitYears"), "1.5"), false, "profit years is a whole number");
assert.equal(validValue(rd("profitYears"), "6"), false);
assert.equal(validValue(rd("profitYears"), "-1"), false);
assert.equal(validValue(rd("de"), "-5"), false, "debt to equity cannot be negative");
assert.equal(validValue(rd("de"), "0"), true);
assert.equal(validValue(rd("pledge"), "101"), false);
assert.equal(validValue(rd("volRatio"), "25"), false);
assert.equal(validValue(rd("roe"), "999999999"), false);
assert.equal(validValue(rd("roe"), "-5"), true, "a negative minimum is allowed for ROE");
assert.equal(validValue(rd("roe"), "abc"), false);
assert.equal(validValue(rd("mcMin"), "999999999999"), true, "market value has no upper limit");
assert.equal(ruleProblem(rd("roe"), "abc"), "Enter a number. This is not used yet.");
assert.equal(ruleProblem(rd("profitYears"), "6"), "Enter a whole number from 0 to 5. This is not used yet.");
assert.equal(ruleProblem(rd("roe"), ""), null);
assert.equal(ruleProblem(rd("roe"), "15"), null);
assert.deepEqual(toParams({ ...EMPTY_RULES, profitYears: "10", de: "-5", roe: "abc", pledge: "5" }), { pledge_max: 5 }, "an unusable value is not sent");
assert.equal(countAfter(data, { ...EMPTY_RULES, profitYears: "10", de: "-5", roe: "abc" }, 5), 5, "an unusable value does not filter the count");
assert.ok(ladder.includes("ruleProblem(d, rules[d.key] as string)") && ladder.includes('data-testid="problem-volNum"'), "the problem line is shown");

assert.ok(/ladder-bar[\s\S]*ladder-bar-show[\s\S]*ladder-left[\s\S]*ladder-counts-note/.test(ladder) && ladder.includes("filled && ("), "the count and its note appear only once a field is filled, beside the one button");
assert.ok(ladder.includes('set({ vol: v, volNum: v === "" ? "" : v === "calmer" ? "25" : "75" })') && !ladder.includes("rules.volNum ||"), "switching between Calmer and More active resets the cut-off to that option's default (25 / 75)");
assert.ok(ctx.includes('matchMedia("(min-width: 1024px)")') && ctx.includes("if (!e.matches) setOpen(false)"), "the panel closes when the window goes from wide (docked) to narrow (drawer)");
console.log("stock check tests: ok");
