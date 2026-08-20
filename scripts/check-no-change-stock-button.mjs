#!/usr/bin/env node
// Structural guard against the "Change stock" button reappearing in the
// Ask AI panel — a locked spec decision from the 2026-08-19 symbol-
// resolution session (docs/00_MASTER_CONTEXT.md: "no Change stock
// button/UI anywhere, under any condition... never appears, full stop").
// Stock context is 100% backend-resolved (page context / session drift /
// explicit mention); there is nothing left for the user to manually
// toggle, so no UI element may ever render that text.
//
// This regressed once already (2026-08-20 weighted-credit follow-up
// session) BEFORE this guard existed, caught only by manual review — this
// script makes a second silent reappearance structurally impossible
// instead of relying on someone noticing again. Run:
// node scripts/check-no-change-stock-button.mjs (wired to `npm run build`
// via `npm run check:no-change-stock`).
//
// Deliberately narrow: forbids the phrase only where it could actually
// RENDER (JSX text content or a string literal) — NOT inside a `//` line
// comment or a `/* ... */` block comment, since this file's own removal
// comment quotes "Change stock" to document that it's gone, and that
// documentation must stay allowed. A lightweight line-by-line
// block-comment tracker, not a full parser (same heuristic trade-off
// check-auth-fetch.mjs already makes elsewhere in this repo).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCAN_DIRS = ["src/app", "src/components"];

const FORBIDDEN_RE = /change\s*stock/i;

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
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      files.push({ full, rel });
    }
  }
  return files;
}

let allFiles = [];
for (const dir of SCAN_DIRS) {
  allFiles = allFiles.concat(walk(join(ROOT, dir)));
}

const errors = [];

for (const { full, rel } of allFiles) {
  const lines = readFileSync(full, "utf8").split("\n");
  let inBlockComment = false;
  lines.forEach((rawLine, i) => {
    const line = rawLine;
    const trimmed = line.trim();
    // Track /* ... */ spans BEFORE deciding whether this line counts as
    // "comment" — a line can open and close a block comment in the same
    // line (rare here, but handled), in which case code on it after the
    // close still counts.
    const wasInBlockComment = inBlockComment;
    const opens = (line.match(/\/\*/g) || []).length;
    const closes = (line.match(/\*\//g) || []).length;
    if (opens > closes) inBlockComment = true;
    else if (closes >= opens && wasInBlockComment) inBlockComment = false;

    const isLineComment = trimmed.startsWith("//") || trimmed.startsWith("*"); // `*` covers a /** ... */ doc-comment continuation line
    const isFullyCommentLine = wasInBlockComment || isLineComment;

    if (FORBIDDEN_RE.test(line) && !isFullyCommentLine) {
      errors.push(
        `${rel}:${i + 1}  "Change stock" text found outside a comment — this UI element is permanently banned (locked spec, docs/00_MASTER_CONTEXT.md 2026-08-19 symbol-resolution session: "no Change stock button/UI anywhere, under any condition"). Stock context is 100% backend-resolved; do not reintroduce a manual toggle.  ${trimmed.slice(0, 100)}`
      );
    }
  });
}

if (errors.length) {
  console.error(`\n✖ ${errors.length} "Change stock" regression(s):`);
  errors.forEach((e) => console.error("  " + e));
  process.exit(1);
}

console.log(`✓ No-Change-stock-button guard passed (0 violations).`);
