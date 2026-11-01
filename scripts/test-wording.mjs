#!/usr/bin/env node
/* Fails if a displayed phrase that was deliberately replaced comes back.
 * Comments and docstrings are ignored so internal notes/regexes may still
 * mention the old vocabulary; actual UI strings may not. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const OLD = [
  "Top Signal Changes",
  "Strongest",
  "Weakest",
  "Gainers",
  "Decliners",
  "Top gainers",
  "Top losers",
  "Top Movers",
  "Top decliner",
  "The AI that reads the entire market for you",
  "flags what institutional coverage misses",
  "Recovery Opportunity",
  // 2026-10-30: the composite measure is shown as "Conditions Reading" (short form "Reading")
  "Signal score",
  "Signal Score",
  "signal score",
  "Composite score",
  "Composite Score",
  "composite score",
  "Composite signal",
  "Composite Signal Score",
  "Score history",
  "Score change",
  "Min score",
  "Max score",
  "Biggest score change",
  "Why did this score change",
  // 2026-10-30: governance section is "Governance disclosures"; the investigation category label has no "Fraud"
  "Fraud / Investigation",
  "Red Flag Radar",
  "Red Flags",
  "Red flags",
  "Red flag",
  "red flags",
  // removed cue phrases (read as a recommendation)
  "Among the top-ranked",
  "Among the lowest-ranked",
  "top-ranked stocks",
  "Ranked near the top",
];

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(tsx?|jsx?|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

const hits = [];
for (const file of files(ROOT)) {
  const text = stripComments(readFileSync(file, "utf8"));
  for (const phrase of OLD) {
    if (text.includes(phrase)) hits.push(`${file}: ${phrase}`);
  }
}
if (hits.length) {
  console.error("Replaced display wording returned:\n" + hits.join("\n"));
  process.exit(1);
}
// The Signals list opens on a neutral order (Symbol A-Z), never on a model-derived one.
const explorer = readFileSync(join(ROOT, "components/app/signals/SignalsExplorer.tsx"), "utf8");
if (!explorer.includes('initialParams?.sort ?? "symbol"')) {
  console.error("Signals default sort must be Symbol (A-Z).");
  process.exit(1);
}
// 2026-10-30: the company report texts (sample page, buttons, copy) may not use recommendation language, and must carry the report disclaimer.
const REPORT_FILES = [
  "lib/report-copy.ts",
  "components/app/report/ReportActions.tsx",
  "app/(app)/sample-report/page.tsx",
];
const REPORT_FORBIDDEN = /\b(buy|sell|targets?(?!=)|best|top picks?|bullish|bearish|outperform\w*|opportunit(?:y|ies)|momentum|predict\w*|fraud\w*|scams?|hiding|manipulat\w*|avoid\w*)\b|will (?:rise|fall)/i;
const reportHits = [];
for (const rel of REPORT_FILES) {
  const text = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  const m = text.match(REPORT_FORBIDDEN);
  if (m) reportHits.push(`${rel}: ${m[0]}`);
}
const copy = readFileSync(join(ROOT, "lib/report-copy.ts"), "utf8");
if (!copy.includes("Measured data, not investment advice. Not a recommendation or a forecast.")) reportHits.push("lib/report-copy.ts: disclaimer line missing");
const sample = readFileSync(join(ROOT, "app/(app)/sample-report/page.tsx"), "utf8");
if (!sample.includes("REPORT_DISCLAIMER")) reportHits.push("sample-report page: disclaimer missing");
if (reportHits.length) {
  console.error("Company report wording problem:" + String.fromCharCode(10) + reportHits.join(String.fromCharCode(10)));
  process.exit(1);
}
// 2026-10-30: the History Explorer shows counts of past days only. Its texts may not use forecast or recommendation language.
// Two sentences are allowed as written by the owner: the "by chance" caution and the disclaimer ("Not a forecast").
const HISTORY_FILES = [
  "lib/history-copy.ts",
  "lib/api/history.ts",
  "lib/history-flag.ts",
  "components/app/history/HistoryExplorer.tsx",
  "components/app/history/HistoryTabs.tsx",
  "components/app/history/CommonReadings.tsx",
  "components/app/history/HowToRead.tsx",
  "components/app/history/ui.tsx",
  "lib/history-common-copy.ts",
  "components/app/history/StockwiseHistory.tsx",
  "components/app/history/HistoryLinks.tsx",
  "app/(app)/rewind/page.tsx",
];
const HISTORY_FORBIDDEN = /\b(chance|probabilit(?:y|ies)|likely|predict\w*|buy|sell|(?<!\.)targets?(?!=)|best|top picks?|breakout|setup|bullish|opportunit(?:y|ies)|momentum|red flags?)\b|strong stock|weak stock|matches today|same as today/i;
const HISTORY_ALLOWED = ["Trying many filters can produce good-looking numbers by chance.", "Not a forecast or a recommendation.", "checked against chance", "larger than chance alone would explain", "Chance Check"];
const historyHits = [];
for (const rel of HISTORY_FILES) {
  let text = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  for (const ok of HISTORY_ALLOWED) text = text.split(ok).join("");
  const m = text.match(HISTORY_FORBIDDEN);
  if (m) historyHits.push(`${rel}: ${m[0]}`);
}
// Stock-wise mode lists past days and their readings: it may not say that a later move followed, and has no rate language.
const STOCKWISE_EXTRA = /\b(followed|next[- ]day|hit rate|win rate|success|accura\w*|reliab\w*|edge|signal quality)\b/i;
for (const rel of ["components/app/history/StockwiseHistory.tsx", "components/app/history/HistoryTabs.tsx"]) {
  const t = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  const m = t.match(STOCKWISE_EXTRA);
  if (m) historyHits.push(`${rel}: ${m[0]}`);
}
// Common readings: no pattern, signal, setup, edge, likely, tends to, predicts, bullish, bearish, buy, sell or outperform wording.
const COMMON_FORBIDDEN = /\b(pattern found|signals?|setups?|edge|likely|tends? to|predicts?|bullish|bearish|buy|sell|outperform\w*)\b|inside information|insiders know|smart money/i;
for (const rel of ["components/app/history/CommonReadings.tsx", "components/app/history/HowToRead.tsx", "lib/history-common-copy.ts"]) {
  const t = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  const m = t.match(COMMON_FORBIDDEN);
  if (m) historyHits.push(`${rel}: ${m[0]}`);
}
const histCopy = readFileSync(join(ROOT, "lib/history-copy.ts"), "utf8");
for (const need of ["Many stocks move on the same market days; these days are not independent.", "Next session pending", "No days in this period", "Past record of measured data. Not a forecast or a recommendation.", "Trying many filters can produce good-looking numbers by chance.", "Examples to start with"]) {
  if (!histCopy.includes(need)) historyHits.push(`lib/history-copy.ts: required line missing: ${need}`);
}
const commonCopy = readFileSync(join(ROOT, "lib/history-common-copy.ts"), "utf8");
for (const need of ["Chance Check", "Base-rate comparison", "What these days had in common, checked against chance. Not a forecast or a recommendation.", "Fewer than 30 days. Not enough for a comparison."]) {
  if (!commonCopy.includes(need)) historyHits.push(`lib/history-common-copy.ts: required line missing: ${need}`);
}
// 2026-10-31 rename: the old names may not reappear in anything a user, crawler or AI model sees (all of src/).
// Allowed places: internal identifiers (they have no spaces), comments and the redirect table, none of which is user-visible.
const OLD_NAMES = /History Explorer|Conditions Readings?|Common readings/i;
function walkSrc(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkSrc(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}
for (const f of walkSrc(join(ROOT))) {
  const m = stripComments(readFileSync(f, "utf8")).match(OLD_NAMES);
  if (m) historyHits.push(`${f.replace(ROOT, "")}: old name "${m[0]}" in user-visible text`);
}
for (const need of ["Stock Condition", "Weighted combination of 8 measured readings. Not a probability, a rating or a forecast."]) {
  if (!readFileSync(join(ROOT, "lib/reading-copy.ts"), "utf8").includes(need)) historyHits.push(`lib/reading-copy.ts: required text missing: ${need}`);
}
// 2026-11-01: 7-Day Review. Price changes over the last sessions and measured readings only: no outlook, rating, hit rate, track record, "top picks" or
// recommendation wording, and no ranking claim beyond "biggest". The one sentence that says "Not a forecast or a recommendation" and the neutral Ask AI
// question ("Do not give a forecast or a recommendation") are allowed as written.
const REVIEW_FILES = [
  "lib/review-copy.ts",
  "components/app/review/ReviewTabs.tsx",
  "components/app/review/ReviewLists.tsx",
  "components/app/review/YourStocks.tsx",
  "components/app/review/MarketBlock.tsx",
  "components/app/review/ScChanges.tsx",
  "components/app/review/EventsBlock.tsx",
  "components/app/review/WeekPicker.tsx",
  "components/app/review/MineProvider.tsx",
  "app/(app)/signals/7-day-review/page.tsx",
];
const REVIEW_FORBIDDEN = /(buy|sell|targets?(?!=)|best|top picks?|picks?|tips?|bullish|bearish|outperform\w*|opportunit(?:y|ies)|momentum|predict\w*|forecasts?|recommend\w*|outlook|likely|expected|hit rates?|win rates?|accura\w*|track records?|strongest|weakest|gainers|losers|decliners|top gainers|top losers|winners|will (?:rise|fall|gain|drop))/i;
const REVIEW_ALLOWED = ["Not a forecast or a recommendation.", "Do not give a forecast or a recommendation.", "a forecast or a recommendation"];
const reviewHits = [];
for (const rel of REVIEW_FILES) {
  let text = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  for (const ok of REVIEW_ALLOWED) text = text.split(ok).join("");
  const m = text.match(REVIEW_FORBIDDEN);
  if (m) reviewHits.push(`${rel}: ${m[0]}`);
}
const reviewCopy = readFileSync(join(ROOT, "lib/review-copy.ts"), "utf8");
for (const need of ["Price change over the window.", "Log in to see your watchlist here", "Biggest gains and falls of the week", "7-Day Review - biggest gains and falls of the week | RedixFi"]) {
  if (!reviewCopy.includes(need)) reviewHits.push(`lib/review-copy.ts: required text missing: ${need}`);
}
const listsSrc = readFileSync(join(ROOT, "components/app/review/ReviewLists.tsx"), "utf8");
for (const need of ["Biggest gains", "Biggest falls", "Open in Market Rewind", "Research page"]) {
  if (!listsSrc.includes(need)) reviewHits.push(`ReviewLists.tsx: required text missing: ${need}`);
}
// Mobile navigation layout C: the bar is Home | Signals | Intraday | Research | Rewind, C is the default, and every More row is in the header menu.
const navCfg = readFileSync(join(ROOT, "lib/nav-config.ts"), "utf8");
if (!/NAV_MOBILE_LAYOUT === "A" \? "A" : process\.env\.NAV_MOBILE_LAYOUT === "B" \? "B" : "C"/.test(navCfg)) reviewHits.push("lib/nav-config.ts: layout C must be the default");
const side = readFileSync(join(ROOT, "components/layout/Sidebar.tsx"), "utf8");
const cStart = side.indexOf("  C: [");
const cBlock = side.slice(cStart, side.indexOf("],", cStart));
const cHrefs = [...cBlock.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]).join(",");
if (cHrefs !== "/,/signals,/intraday,/research" || !cBlock.includes("REWIND_ITEM")) reviewHits.push(`Sidebar.tsx: layout C bar must be Home, Signals, Intraday, Research, Rewind (found ${cHrefs} + ${cBlock.includes("REWIND_ITEM") ? "Rewind" : "no Rewind"})`);
if (!side.includes("sidebar-7day-review")) reviewHits.push("Sidebar.tsx: 7-Day Review sub-item under Signals is missing");
const more = readFileSync(join(ROOT, "lib/more-links.ts"), "utf8");
const moreHrefs = [...more.slice(more.indexOf("export const MORE_LINKS"), more.indexOf("export const MENU_GROUPS")).matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
const menuHrefs = new Set([...more.slice(more.indexOf("export const MENU_GROUPS")).matchAll(/href: "([^"]+)"/g)].map((m) => m[1]));
for (const h of moreHrefs) if (!menuHrefs.has(h)) reviewHits.push(`lib/more-links.ts: ${h} is on the More page but not in the header menu`);
for (const need of ["/watchlist", "/account/alerts", "/account", "/pricing", "/more/about-us", "/how-it-works", "/more/disclaimer"]) {
  if (!menuHrefs.has(need)) reviewHits.push(`lib/more-links.ts: header menu lacks ${need}`);
}
const sm = readFileSync(join(ROOT, "app/sitemap.xml/route.ts"), "utf8");
if (!sm.includes('"/signals/7-day-review"')) reviewHits.push("sitemap.xml/route.ts: /signals/7-day-review missing");
if (!readFileSync(join(ROOT, "app/llms.txt/route.ts"), "utf8").includes("/signals/7-day-review")) reviewHits.push("llms.txt/route.ts: 7-Day Review missing");
if (!readFileSync(join(ROOT, "app/(app)/signals/page.tsx"), "utf8").includes("ReviewTabs")) reviewHits.push("signals/page.tsx: Signals | 7-Day Review tabs missing");
// 2026-11-01: ONE Stock Condition visibility rule. Every component that shows a Stock Condition number must draw the locked state with the shared
// ProLock / ScValue (a small lock and "Pro", linked to the plans page), never its own blur or "Locked" text; the API already sends no number for those rows.
const SC_COMPONENTS = [
  "components/app/TopSignalChangesCard.tsx",
  "components/app/signals/MoversLists.tsx",
  "components/app/signals/SignalTableRow.tsx",
  "components/app/intraday/tabs/StockList.tsx",
  "components/app/review/ReviewLists.tsx",
  "components/app/review/ScChanges.tsx",
  "components/app/review/YourStocks.tsx",
  "components/app/watchlist/WatchlistMainView.tsx",
  "components/app/research/ResearchConditionCard.tsx",
  "app/(seo)/s/[slug]/page.tsx",
  "app/(seo)/screens/[slug]/page.tsx",
];
const scHits = [];
for (const rel of SC_COMPONENTS) {
  if (!readFileSync(join(ROOT, rel), "utf8").includes("@/components/ui/ScValue")) scHits.push(`${rel}: must use ProLock / ScValue for a locked Stock Condition`);
}
const scValue = readFileSync(join(ROOT, "components/ui/ScValue.tsx"), "utf8");
for (const need of ['href="/pricing"', "min-h-[44px]", "<Lock", "Pro"]) {
  if (!scValue.includes(need)) scHits.push(`components/ui/ScValue.tsx: required piece missing: ${need}`);
}
if (scHits.length) {
  console.error("Stock Condition visibility problem:" + String.fromCharCode(10) + scHits.join(String.fromCharCode(10)));
  process.exit(1);
}
// 2026-11-01: AI prompt pills and the Stock Condition history line on stock pages. Neutral wording, neutral colour, nothing sent without a tap on Send,
// and the line is never on Market Rewind.
const uxHits = [];
const UX_FORBIDDEN = /(buy|sell|targets?|breakouts?|candidates?|accelerat\w*|decelerat\w*|bullish|bearish|rising|falling|improving|worsening|upward|downward|trend(?:ing|s)?|hit rates?|success rates?|predict\w*|forecast\w*|rating|outperform\w*|underperform\w*)/i;
for (const rel of ["components/app/signals/AskPills.tsx", "components/app/signals/ConditionLine.tsx", "lib/condition-line.ts"]) {
  const text = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  const m = text.match(UX_FORBIDDEN);
  if (m) uxHits.push(`${rel}: ${m[0]}`);
}
const lineSrc = stripComments(readFileSync(join(ROOT, "components/app/signals/ConditionLine.tsx"), "utf8"));
if (/text-(up|down|success|danger|red|green|emerald|rose)|<(ArrowUp|ArrowDown|TrendingUp|TrendingDown|ChevronUp)/.test(lineSrc)) uxHits.push("ConditionLine.tsx: neutral colour only, no arrows");
if (!readFileSync(join(ROOT, "lib/condition-line.ts"), "utf8").includes("Stock Condition, last")) uxHits.push("lib/condition-line.ts: the plain caption is missing");
const pillsSrc = stripComments(readFileSync(join(ROOT, "components/app/signals/AskPills.tsx"), "utf8"));
if (!pillsSrc.includes("openWithQuestion") || /(sendMessage|submit|handleSend|requestSubmit)/.test(pillsSrc)) uxHits.push("AskPills.tsx: a pill must only fill the question in (openWithQuestion), never send it");
for (const [rel, need] of [["components/app/signals/SignalDetailView.tsx", "<AskPills"], ["components/app/signals/SignalDetailView.tsx", "<ConditionLine"], ["components/app/research/ResearchDetail.tsx", "<AskPills"], ["components/app/research/ResearchConditionCard.tsx", "<ConditionLine"]]) {
  if (!readFileSync(join(ROOT, rel), "utf8").includes(need)) uxHits.push(`${rel}: ${need} missing`);
}
function rewindFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) out.push(...rewindFiles(f));
    else if (/\.tsx?$/.test(e)) out.push(f);
  }
  return out;
}
for (const f of [...rewindFiles(join(ROOT, "components/app/history")), ...rewindFiles(join(ROOT, "app/(app)/rewind"))]) {
  if (/ConditionLine|AskPills/.test(readFileSync(f, "utf8"))) uxHits.push(`${f.replace(ROOT, "")}: the history line and the pills are not used on Market Rewind`);
}
if (uxHits.length) {
  console.error("Stock page pills / history line problem:" + String.fromCharCode(10) + uxHits.join(String.fromCharCode(10)));
  process.exit(1);
}
// 2026-11-01: Intraday tabs (Morning | Scan | Recap). Descriptive wording only: the largest gaps before the open, the largest moves so far, how the day
// ended. No trade-call words, and the Recap never counts how many listed stocks went which way. The two fixed sentences are required on every tab.
const INTRADAY_FILES = [
  "lib/intraday-copy.ts",
  "lib/intraday-volume-filter.ts",
  "components/app/intraday/tabs/IntradayTabs.tsx",
  "components/app/intraday/tabs/TabBodies.tsx",
  "components/app/intraday/tabs/StockList.tsx",
  "components/app/intraday/tabs/LegacyTools.tsx",
  "app/(app)/intraday/page.tsx",
];
const INTRADAY_FORBIDDEN = /\b(breakouts?|set-?ups?|signals?|targets?|stop-?loss|buy|sell|bullish|bearish|momentum play|stocks? to watch|top picks?|picks?|likely|expected|intraday tips?|tips?|predict\w*|recommend\w*|outlook|hit rates?|success rates?|accura\w*|track records?|win rates?|top gainers|top losers|gainers|losers|strongest|weakest|best)\b/i;
const intradayHits = [];
for (const rel of INTRADAY_FILES) {
  let text = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  for (const ok of ["Not a forecast or a recommendation.", "a forecast or a recommendation"]) text = text.split(ok).join("");
  text = text.split('"/signals"').join("").split("/signals").join("");     // the link path to a stock's page is not prose
  const m = text.match(INTRADAY_FORBIDDEN);
  if (m) intradayHits.push(`${rel}: ${m[0]}`);
}
const intradayCopy = readFileSync(join(ROOT, "lib/intraday-copy.ts"), "utf8");
for (const need of [
  "Past record of measured data. Not a forecast or a recommendation.",
  "Prices are delayed or as of the last update.",
  "Largest gaps before the open",
  "Largest moves so far",
  "How the day ended",
]) {
  if (!intradayCopy.includes(need)) intradayHits.push(`lib/intraday-copy.ts: required text missing: ${need}`);
}
const tabsSrc = readFileSync(join(ROOT, "components/app/intraday/tabs/IntradayTabs.tsx"), "utf8");
for (const need of ["DELAY_NOTE", "DISCLAIMER", "intraday-notes"]) {
  if (!tabsSrc.includes(need)) intradayHits.push(`IntradayTabs.tsx: both fixed sentences must be on every tab (${need} missing)`);
}
// The Recap tab never shows a count, share or success figure of the listed stocks.
const bodies = readFileSync(join(ROOT, "components/app/intraday/tabs/TabBodies.tsx"), "utf8");
const recapSrc = bodies.slice(bodies.indexOf("export function RecapBody"));
for (const bad of [/\.length\}/, /rows\.length/, /hit/i, /success/i, /went (?:up|down)/i, /how many/i, /% of (?:the )?(?:listed|stocks)/i]) {
  if (bad.test(recapSrc)) intradayHits.push(`TabBodies.tsx: the Recap must not count or summarise the listed stocks (${bad})`);
}
if (!readFileSync(join(ROOT, "app/(app)/intraday/page.tsx"), "utf8").includes('robots: withQuery ? { index: false')) intradayHits.push("intraday/page.tsx: ?tab= pages must be noindex");
if (intradayHits.length) {
  console.error("Intraday tabs wording problem:" + String.fromCharCode(10) + intradayHits.join(String.fromCharCode(10)));
  process.exit(1);
}
if (reviewHits.length) {
  console.error("7-Day Review wording / navigation problem:" + String.fromCharCode(10) + reviewHits.join(String.fromCharCode(10)));
  process.exit(1);
}
if (historyHits.length) {
  console.error("History Explorer wording problem:" + String.fromCharCode(10) + historyHits.join(String.fromCharCode(10)));
  process.exit(1);
}
console.log("Wording guard passed: replaced display phrases are absent.");
