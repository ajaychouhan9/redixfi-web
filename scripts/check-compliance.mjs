#!/usr/bin/env node
// Forbidden-words / tense CI sweep — see docs/00_MASTER_CONTEXT.md rules 1-6.
// Scans our own UI copy (app/components) for pre-RA compliance violations.
// Run: node scripts/check-compliance.mjs   (wired to `npm run check:compliance`)
//
// Kept in sync manually with src/lib/compliance/forbidden-words.ts (that
// module is TS/ESM for app code; this script runs standalone pre-build).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCAN_DIRS = ["src/app", "src/components"];
// lib/api mirrors backend field/collection names (e.g. predictions_snapshot)
// and lib/compliance defines the word lists themselves — neither is UI copy.
const EXCLUDE_SUBSTRINGS = ["src/lib/api", "src/lib/compliance", "openapi-reference"];
const IGNORE_MARKER = "compliance-ignore";

const FORBIDDEN_WORDS = [
  "\\bcalls?\\b(?<!put-call)(?!-heavy)(?!\\s*(us|api|endpoint|function|back|for))",
  "\\bpicks?\\b",
  "\\btips?\\b",
  "\\bpredictions?\\b",
  "\\bpredict(?:s|ed|ing)?\\b",
  "(?<!net )\\bbuy\\b(?!\\s+(streak|days?))",
  "(?<!net )\\bsell\\b(?!\\s+(streak|days?))",
  "\\btarget\\s*price\\b",
  "\\bstop[\\s-]?loss\\b",
  "\\baccuracy\\b",
];

const FORWARD_TENSE_WORDS = [
  "\\bexpected\\b",
  "\\boutlook\\b",
  "\\blikely\\b",
  "\\bwill\\s+(rise|fall|rally|drop|surge|crash|gain|lose)\\b",
  "\\bconfidence\\s+(level|score)?\\b",
  "\\bvalidity\\s+window\\b",
];

const NEGATION_RE = /\b(not|no|never|isn't|doesn't|nor)\b/i;

const forbiddenRe = new RegExp(FORBIDDEN_WORDS.join("|"), "gi");
const forwardRe = new RegExp(FORWARD_TENSE_WORDS.join("|"), "gi");

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (EXCLUDE_SUBSTRINGS.some((s) => rel.includes(s))) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

let errors = [];
let warnings = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes(IGNORE_MARKER)) return;
      const fMatches = line.match(forbiddenRe);
      if (fMatches) {
        if (NEGATION_RE.test(line)) {
          warnings.push(`${rel}:${i + 1}  negated forbidden word(s) [${fMatches.join(", ")}] — treated as compliant disclaimer language  ${line.trim().slice(0, 100)}`);
        } else {
          errors.push(`${rel}:${i + 1}  forbidden word(s) [${fMatches.join(", ")}]  ${line.trim().slice(0, 100)}`);
        }
      }
      const wMatches = line.match(forwardRe);
      if (wMatches) {
        warnings.push(`${rel}:${i + 1}  forward-tense word(s) [${wMatches.join(", ")}]  ${line.trim().slice(0, 100)}`);
      }
    });
  }
}

if (warnings.length) {
  console.warn(`\n⚠ ${warnings.length} warning(s):`);
  warnings.forEach((w) => console.warn("  " + w));
}

if (errors.length) {
  console.error(`\n✖ ${errors.length} forbidden-word violation(s):`);
  errors.forEach((e) => console.error("  " + e));
  console.error(
    `\nIf a match is a false positive (e.g. quoting third-party news verbatim), add a "// ${IGNORE_MARKER}" comment on that line.`
  );
  process.exit(1);
}

console.log(`✓ Compliance sweep passed (${warnings.length} warning(s), 0 errors).`);
