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
console.log("Wording guard passed: replaced display phrases are absent.");
