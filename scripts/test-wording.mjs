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
  "app/(app)/history/page.tsx",
];
const HISTORY_FORBIDDEN = /\b(chance|probabilit(?:y|ies)|likely|predict\w*|buy|sell|(?<!\.)targets?(?!=)|best|top picks?|breakout|setup|bullish|opportunit(?:y|ies)|momentum|red flags?)\b|strong stock|weak stock|matches today|same as today/i;
const HISTORY_ALLOWED = ["Trying many filters can produce good-looking numbers by chance.", "Not a forecast or a recommendation.", "checked against chance"];
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
const COMMON_FORBIDDEN = /\b(pattern found|signals?|setups?|edge|likely|tends? to|predicts?|bullish|bearish|buy|sell|outperform\w*)\b/i;
for (const rel of ["components/app/history/CommonReadings.tsx", "lib/history-common-copy.ts"]) {
  const t = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  const m = t.match(COMMON_FORBIDDEN);
  if (m) historyHits.push(`${rel}: ${m[0]}`);
}
const histCopy = readFileSync(join(ROOT, "lib/history-copy.ts"), "utf8");
for (const need of ["Many stocks move on the same market days; these days are not independent.", "Next session pending", "No days in this period", "Past record of measured data. Not a forecast or a recommendation.", "Trying many filters can produce good-looking numbers by chance.", "Examples to start with"]) {
  if (!histCopy.includes(need)) historyHits.push(`lib/history-copy.ts: required line missing: ${need}`);
}
const commonCopy = readFileSync(join(ROOT, "lib/history-common-copy.ts"), "utf8");
for (const need of ["Common readings", "What these days had in common, checked against chance. Not a forecast or a recommendation.", "Fewer than 30 days. Not enough for a comparison."]) {
  if (!commonCopy.includes(need)) historyHits.push(`lib/history-common-copy.ts: required line missing: ${need}`);
}
if (historyHits.length) {
  console.error("History Explorer wording problem:" + String.fromCharCode(10) + historyHits.join(String.fromCharCode(10)));
  process.exit(1);
}
console.log("Wording guard passed: replaced display phrases are absent.");
