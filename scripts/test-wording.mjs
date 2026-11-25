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
  // 2026-11-11: judgment words and the old registration wording may not return in displayed text
  "oversold",
  "overbought",
  "Smart Money",
  "Smart money",
  "smart money",
  "Needs attention",
  "not yet SEBI-registered",
  "Not yet SEBI-registered",
  "directional research",
  "SEBI RA registration",
  // 2026-11-11: the combined score and everything built on it were removed from the product; none of its names may appear in displayed text
  "Stock Condition",
  "Stock condition",
  "stock condition",
  "Conditions Reading",
  "composite",
  "Composite",
  "track record",
  "Track record",
  "Track Record",
  "signal history",
  "Signal history",
  "outperformed",
  "beat the sector",
  "Beat the sector",
  "Signal Dashboard",
  "Signal dashboard",
  // 2026-11-11: labels that judge a news item or a day's news
  "high-severity",
  "High-severity",
  "Event risk",
  "event risk",
  "Event Risk",
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

// 26 Nov 2026: the owner asked for Gainers and Losers tabs on the Home movers card (HomeMovers.tsx).
// 18 Nov 2026: the owner asked for a "Top Gainers & Losers" page and card by that name (the Market Overview card and its page). The phrase is allowed
// in exactly those files and nowhere else: every other page keeps "largest price rises / falls".
const GAINERS_OK = ["app/(app)/gainers-losers/page.tsx", "components/app/market/MarketOverviewCards.tsx", "components/app/market/TopMovers.tsx", "components/app/home/HomeMovers.tsx", "app/(app)/how-it-works/page.tsx", "app/llms.txt/route.ts"];
const GAINERS_PHRASES = new Set(["Gainers", "Top gainers", "Top losers"]);
const hits = [];
for (const file of files(ROOT)) {
  const rel = file.slice(ROOT.length).replaceAll("\\", "/");
  // identifiers of the API fields that no longer carry data (composite_score and the like) are not displayed text
  const text = stripComments(readFileSync(file, "utf8")).replace(/\w*composite_score\w*/g, "");
  for (const phrase of OLD) {
    if (GAINERS_PHRASES.has(phrase) && GAINERS_OK.includes(rel)) continue;
    if (text.includes(phrase)) hits.push(`${file}: ${phrase}`);
  }
}
if (hits.length) {
  console.error("Replaced display wording returned:\n" + hits.join("\n"));
  process.exit(1);
}
// The Signals/Home price labels must never use a bare "Live" (the market
// tab is still "Live scan", and "Today's session" is allowed).
const BARE_LIVE = /(?:>|["'`])Live(?:<|["'`])/;
// 18 Nov 2026 (phase 1c): the market-hours tag is now "Live · 15 min delayed", so no file needs an exemption any more; a bare "Live" label is banned everywhere.
const LIVE_OK = [];
for (const file of files(ROOT)) {
  if (LIVE_OK.includes(file.slice(ROOT.length).replaceAll("\\", "/"))) continue;
  if (BARE_LIVE.test(stripComments(readFileSync(file, "utf8")))) {
    console.error(`Bare Live label is not allowed: ${file}`);
    process.exit(1);
  }
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
// One sentence is allowed as written by the owner: the disclaimer ("Not a forecast"). 13 Nov 2026: "Chance Check" became "Past occurrences"; chance, probability, odds and likelihood wording is not allowed anywhere on the Market Rewind page.
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
  "components/app/stock/RewindTab.tsx",
  "lib/rewind-simple.ts",
];
const HISTORY_FORBIDDEN = /\b(chance|chances|probabilit(?:y|ies)|odds|likelihood|likely|predict\w*|buy|sell|(?<!\.)targets?(?!=)|best|top picks?|breakout|setup|bullish|opportunit(?:y|ies)|momentum|red flags?)\b|strong stock|weak stock|matches today|same as today/i;
const HISTORY_ALLOWED = ["Not a forecast or a recommendation."];
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
for (const need of ["Many stocks move on the same market days; these days are not independent.", "Next session pending", "No days in this period", "Past record of measured data. Not a forecast or a recommendation.", "Trying many filters can produce good-looking numbers that are only coincidence.", "Examples to start with"]) {
  if (!histCopy.includes(need)) historyHits.push(`lib/history-copy.ts: required line missing: ${need}`);
}
const commonCopy = readFileSync(join(ROOT, "lib/history-common-copy.ts"), "utf8");
for (const need of ["Past occurrences", "Base-rate comparison", "What these days had in common, compared with all days. Not a forecast or a recommendation.", "Fewer than 30 days. Not enough for a comparison."]) {
  if (!commonCopy.includes(need)) historyHits.push(`lib/history-common-copy.ts: required line missing: ${need}`);
}
// 2026-10-31 rename: the old names may not reappear in anything a user, crawler or AI model sees (all of src/).
// Allowed places: internal identifiers (they have no spaces), comments and the redirect table, none of which is user-visible.
const OLD_NAMES = /History Explorer|Conditions Readings?|Common readings|Chance[ -]?Checks?/i;
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
// 2026-11-01: 7-Day Review. Price changes over the last sessions and measured readings only: no outlook, rating, hit rate, track record, "top picks" or
// recommendation wording, and no ranking claim beyond "biggest". The one sentence that says "Not a forecast or a recommendation" and the neutral Ask AI
// question ("Do not give a forecast or a recommendation") are allowed as written.
const REVIEW_FILES = [
  "lib/review-copy.ts",
  "components/app/review/ReviewLists.tsx",
  "components/app/review/YourStocks.tsx",
  "components/app/review/MarketBlock.tsx",
  "components/app/review/EventsBlock.tsx",
  "components/app/review/WeekPicker.tsx",
  "components/app/review/MineProvider.tsx",
  "app/(app)/signals/7-day-review/page.tsx",
];
const REVIEW_FORBIDDEN = /\b(buy|sell|targets?(?!=)|best|top picks?|picks?|tips?|bullish|bearish|outperform\w*|opportunit(?:y|ies)|momentum|predict\w*|forecasts?|recommend\w*|outlook|likely|expected|hit rates?|win rates?|accura\w*|track records?|strongest|weakest|gainers|losers|decliners|top gainers|top losers|winners|will (?:rise|fall|gain|drop))\b/i;
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
for (const need of ["Biggest gains", "Biggest falls", "Open in Rewind", "Stock page"]) {
  if (!listsSrc.includes(need)) reviewHits.push(`ReviewLists.tsx: required text missing: ${need}`);
}
// 17 Nov 2026 menu: Home | Screener | Market today | 7-Day Review | Ask AI | Me, for the sidebar and the phone bar (lib/nav-items.ts). Research, Pro, Rewind and
// Intraday are not menu items. Every More row is still in the header menu, and the personal rows (Watchlist, Alerts, Account, Checkout) are under Me.
const navItems = readFileSync(join(ROOT, "lib/nav-items.ts"), "utf8");
const hrefsOf = (from, to) => [...navItems.slice(navItems.indexOf(from), navItems.indexOf(to)).matchAll(/href: ("[^"]+"|null)/g)].map((m) => m[1]).join(",");
const navHrefs = hrefsOf("export const NAV_ITEMS", "export const BOTTOM_ITEMS");
if (hrefsOf("export const BOTTOM_ITEMS", "export const ACCOUNT_ITEMS") !== '"/","/shortlist-lab","/signals","/market",null') reviewHits.push("nav-items.ts: the phone bar must be Home, Shortlist Lab, Screener, Markets, Account");
if (hrefsOf("export const ACCOUNT_ITEMS", "const REVIEW") !== '"/account","/watchlist","/account/alerts","/pricing"') reviewHits.push("nav-items.ts: the account menu must be Profile and plan, Watchlist, Alerts, Billing (then Log out)");
if (navHrefs !== '"/","/shortlist-lab","/signals","/signals/7-day-review","/market",null,"/pricing"') reviewHits.push(`nav-items.ts: the side menu must be Home, Shortlist Lab, Screener, 7-Day Review, Market Overview, Ask AI, Pricing (found ${navHrefs})`);
if (/Research|Rewind|Intraday|"Pro"/.test(navItems.replace(/\/\*[\s\S]*?\*\//g, ""))) reviewHits.push("nav-items.ts: Research, Pro, Rewind and Intraday are not menu items");
const side = readFileSync(join(ROOT, "components/layout/Sidebar.tsx"), "utf8");
if (!side.includes("NAV_ITEMS.map") || !side.includes("export function BottomNav") || !side.includes("BOTTOM_ITEMS.map")) reviewHits.push("Sidebar.tsx: the sidebar must read NAV_ITEMS and the phone bar BOTTOM_ITEMS");
const sm = readFileSync(join(ROOT, "app/sitemap.xml/route.ts"), "utf8");
if (!sm.includes('"/signals/7-day-review"')) reviewHits.push("sitemap.xml/route.ts: /signals/7-day-review missing");
if (!readFileSync(join(ROOT, "app/llms.txt/route.ts"), "utf8").includes("/signals/7-day-review")) reviewHits.push("llms.txt/route.ts: 7-Day Review missing");
if (readFileSync(join(ROOT, "app/(app)/signals/page.tsx"), "utf8").includes("ReviewTabs")) reviewHits.push("signals/page.tsx: the Screener | 7-Day Review tabs were removed (18 Nov 2026) and must not come back");
// 2026-11-01: AI prompt pills and the Stock Condition history line on stock pages. Neutral wording, neutral colour, nothing sent without a tap on Send,
// and the line is never on Market Rewind.
const uxHits = [];
const UX_FORBIDDEN = /\b(buy|sell|targets?|breakouts?|candidates?|accelerat\w*|decelerat\w*|bullish|bearish|rising|falling|improving|worsening|upward|downward|trend(?:ing|s)?|hit rates?|success rates?|predict\w*|forecast\w*|rating|outperform\w*|underperform\w*)\b/i;
for (const rel of ["components/app/signals/AskPills.tsx"]) {
  const text = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  const m = text.match(UX_FORBIDDEN);
  if (m) uxHits.push(`${rel}: ${m[0]}`);
}
const pillsSrc = stripComments(readFileSync(join(ROOT, "components/app/signals/AskPills.tsx"), "utf8"));
if (!pillsSrc.includes("openWithQuestion") || /\b(sendMessage|submit|handleSend|requestSubmit)\b/.test(pillsSrc)) uxHits.push("AskPills.tsx: a pill must only fill the question in (openWithQuestion), never send it");
for (const [rel, need] of [["components/app/stock/AskAiTab.tsx", "<AskPills"]]) {
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
for (const f of [...rewindFiles(join(ROOT, "components/app/history")), join(ROOT, "components/app/stock/RewindTab.tsx")]) {
  if (/ConditionLine|AskPills/.test(readFileSync(f, "utf8"))) uxHits.push(`${f.replace(ROOT, "")}: the history line and the pills are not used on Market Rewind`);
}
if (uxHits.length) {
  console.error("Stock page pills / history line problem:" + String.fromCharCode(10) + uxHits.join(String.fromCharCode(10)));
  process.exit(1);
}
// 2026-11-02 (Intraday clean-up): the tab labels are Pre-open / Live scan / After close, and no user-facing file may carry the old signal-like wording.
const internalFiles = new Set(["lib/api/types.ts"]);
const oldNameHits = [];
const FORBIDDEN_UI = [
  [/\bbreakouts?\b/i, "breakout"], [/>\s*VWAP|<\s*VWAP/, "> VWAP / < VWAP"], [/VWAP side/i, "VWAP side"], [/Range-break/i, "Range-break"],
  [/>\s*Live\s*</, "Live as a label"], [/\b(Morning|Scan|Recap) (tab|lists)\b/, "old tab name"],
];
for (const file of files(ROOT)) {
  const rel = file.slice(ROOT.length).replace(/\\/g, "/");
  if (internalFiles.has(rel)) continue;
  const text = stripComments(readFileSync(file, "utf8"));
  for (const [rx, name] of FORBIDDEN_UI) {
    const m = text.match(rx);
    if (m) oldNameHits.push(`${rel}: ${name} (${m[0]})`);
  }
}
const tabLabels = readFileSync(join(ROOT, "lib/intraday-copy.ts"), "utf8").split("TAB_LABEL")[1]?.split(String.fromCharCode(10))[0] ?? "";
if (!/Pre-open/.test(tabLabels) || !/Live scan/.test(tabLabels) || !/After close/.test(tabLabels) || /"(Morning|Scan|Recap)"/.test(tabLabels)) oldNameHits.push("lib/intraday-copy.ts: TAB_LABEL must be Pre-open, Live scan, After close");
if (oldNameHits.length) {
  console.error("Old tab names or signal-like wording in user-facing files:" + String.fromCharCode(10) + oldNameHits.join(String.fromCharCode(10)));
  process.exit(1);
}
// 2026-11-02: no sign-up call to action may render for a logged-in user. A file that prints one must gate it (GuestOnly) or check the user itself.
const ctaHits = [];
const CTA_TEXT = ["Sign up free", "Create a free account", "mode=signup"];
const CTA_ALLOWED = new Set(["app/(app)/login/page.tsx", "components/app/VisitorIntroStrip.tsx", "lib/nav-items.ts"]);   // nav-items only builds the address; the callers check who is logged in
for (const file of files(ROOT)) {
  const rel = file.slice(ROOT.length).replace(/\\/g, "/");
  if (CTA_ALLOWED.has(rel)) continue;
  const raw = readFileSync(file, "utf8");
  const text = stripComments(raw);
  if (!CTA_TEXT.some((t) => text.includes(t))) continue;
  if (!/GuestOnly|useAuth\(/.test(raw)) ctaHits.push(rel);
}
if (ctaHits.length) {
  console.error("Sign-up call to action without a logged-in check (wrap it in GuestOnly):" + String.fromCharCode(10) + ctaHits.join(String.fromCharCode(10)));
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
for (const bad of [/\.length\}/, /rows\.length/, /\bhit\b/i, /success/i, /went (?:up|down)/i, /how many/i, /% of (?:the )?(?:listed|stocks)/i]) {
  if (bad.test(recapSrc)) intradayHits.push(`TabBodies.tsx: the Recap must not count or summarise the listed stocks (${bad})`);
}
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
