#!/usr/bin/env node
// Structural guard against the recurring "fetch missing auth token" bug
// class — 4 confirmed occurrences as of 2026-08-08 (Signals paywall
// 2026-07-30, News/Events staleness 2026-08-04, Home's server-side news
// 2026-08-04, Signals CSV export 2026-08-08), all with the same root
// cause: a frontend fetch to a tier-aware backend endpoint silently went
// out anonymously, so the backend correctly-but-silently treated a real
// paying user as free-tier. Every prior fix patched one call site at a
// time; this script makes a 5th occurrence structurally difficult
// instead of reactive. Run: node scripts/check-auth-fetch.mjs (wired to
// `npm run build` via `npm run check:auth-fetch`).
//
// TWO rules enforced:
//
// RULE A — single wrapper. Every backend call must go through
// src/lib/api/client.ts's rawFetch (via apiGet/apiGetPaged/apiGetOptional/
// apiMutate), and every one of THOSE calls outside client.ts itself must
// go through a NAMED function in endpoints.ts or mutations.ts — no file
// may call apiGet*/apiMutate directly, and no file may call the raw
// fetch()/axios() global at all. This existed already in spirit (this
// codebase never adopted axios, and had exactly one raw fetch() call) but
// was NOT actually consistent — 7 call sites hand-rolled a duplicate of
// an endpoints.ts function that already existed for the same route,
// found and migrated in this same session. Enforcing it here keeps it
// that way.
//
// RULE B — declared + enforced auth requirement. Every exported function
// in endpoints.ts must carry an `@auth public` or `@auth required` tag
// in a comment directly above it (checked here, so a NEW endpoint
// literally cannot be added without its author declaring whether the
// backend route's behavior depends on the caller's tier/identity — this
// is the single source of truth the 4 known bugs never had). Every call
// site of an `@auth required` function, anywhere in the app, must either
// pass `token` in the call itself, or carry an explicit `// @auth-ok:
// <reason>` marker acknowledging a deliberately-anonymous call (the
// established pattern for Server Components, which cannot read the
// browser's localStorage-held token, and for public SEO pages, which
// must NEVER carry a visitor's personal token into a shared ISR cache).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCAN_DIRS = ["src/app", "src/components", "src/lib"];
const ENDPOINTS_FILE = "src/lib/api/endpoints.ts";
const CLIENT_FILE = "src/lib/api/client.ts";
const WRAPPER_FILES = new Set(["src/lib/api/client.ts", "src/lib/api/endpoints.ts", "src/lib/api/mutations.ts"]);

const WRAPPER_FN_NAMES = ["apiGet", "apiGetPaged", "apiGetOptional", "apiMutate"];
const AUTH_OK_MARKER = "@auth-ok";

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

// ---------------------------------------------------------- RULE A ----
const rawFetchRe = /\bfetch\(/;
const axiosRe = /\baxios[.(]/;
const wrapperCallRe = new RegExp(`\\b(${WRAPPER_FN_NAMES.join("|")})\\(`);

for (const { full, rel } of allFiles) {
  if (WRAPPER_FILES.has(rel)) continue; // client.ts/endpoints.ts/mutations.ts are the sanctioned definition sites
  const lines = readFileSync(full, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (rawFetchRe.test(line)) {
      errors.push(`${rel}:${i + 1}  raw fetch() call outside src/lib/api/client.ts — add a named function to endpoints.ts/mutations.ts instead  ${line.trim().slice(0, 100)}`);
    }
    if (axiosRe.test(line)) {
      errors.push(`${rel}:${i + 1}  axios usage found — this codebase has never adopted axios; use the existing client.ts wrapper  ${line.trim().slice(0, 100)}`);
    }
    if (wrapperCallRe.test(line)) {
      errors.push(`${rel}:${i + 1}  direct ${line.match(wrapperCallRe)[1]}() call outside endpoints.ts/mutations.ts — add/use a named wrapper function instead of calling the raw client function  ${line.trim().slice(0, 100)}`);
    }
  });
}

// ---------------------------------------------------------- RULE B ----
const endpointsPath = join(ROOT, ENDPOINTS_FILE);
const endpointsLines = readFileSync(endpointsPath, "utf8").split("\n");
const exportRe = /^export\s+(const|async function|function)\s+(\w+)/;
const TAG_LOOKBACK = 8;

const requiredFns = new Set();
const publicFns = new Set();

// Track each export's line index so a tag window can stop at the PREVIOUS
// export line rather than a flat N-line lookback — otherwise two exports
// sitting close together (common in this file) let one function's tag
// bleed into its neighbor's window and silently mis-tag it.
let prevExportLine = -1;
endpointsLines.forEach((line, i) => {
  const m = line.match(exportRe);
  if (!m) return;
  const name = m[2];
  const start = Math.max(0, i - TAG_LOOKBACK, prevExportLine + 1);
  const preceding = endpointsLines.slice(start, i + 1).join("\n");
  const hasRequired = preceding.includes("@auth required");
  const hasPublic = preceding.includes("@auth public");
  prevExportLine = i;
  if (!hasRequired && !hasPublic) {
    errors.push(`${ENDPOINTS_FILE}:${i + 1}  exported function '${name}' has no "@auth public" or "@auth required" tag between it and the previous export (within ${TAG_LOOKBACK} lines) — every endpoints.ts export must declare whether its backend route's behavior depends on the caller's tier/identity`);
    return;
  }
  if (hasRequired) requiredFns.add(name);
  else publicFns.add(name);
});

if (requiredFns.size === 0) {
  errors.push(`${ENDPOINTS_FILE}: found zero "@auth required" functions — this almost certainly means the tag scan itself is broken (getSignals/getSignalDetail/getResearch/getNews/getWatchlistStates should all be tagged required), not that every endpoint really is public`);
}

if (requiredFns.size > 0) {
  const callRe = new RegExp(`\\b(${[...requiredFns].join("|")})\\(`);
  for (const { full, rel } of allFiles) {
    if (rel === ENDPOINTS_FILE) continue; // definitions, not call sites
    const lines = readFileSync(full, "utf8").split("\n");
    lines.forEach((line, i) => {
      const m = line.match(callRe);
      if (!m) return;
      const fnName = m[1];
      // Wide-ish window: a `token` argument is almost always on the call
      // line itself or 1-3 lines away (a `const token = await getToken()`
      // just above, or a wrapping Promise.all/.map), but an `@auth-ok`
      // marker explaining a deliberate anonymous SSR/SEO call is often a
      // multi-line comment block further above the call it documents —
      // matching this codebase's own commenting style. Heuristic, not a
      // parser (same trade-off check-compliance.mjs already makes) —
      // false positives are possible for a call site that happens to sit
      // near an unrelated 'token' several lines away; a real violation
      // (no token, no marker, anywhere nearby) is what this is tuned to
      // reliably catch.
      const windowStart = Math.max(0, i - 12);
      const windowEnd = Math.min(lines.length, i + 3);
      const window = lines.slice(windowStart, windowEnd).join("\n");
      if (!window.includes("token") && !window.includes(AUTH_OK_MARKER)) {
        errors.push(
          `${rel}:${i + 1}  calls '${fnName}()' (tagged @auth required in endpoints.ts) with no visible 'token' nearby and no "// ${AUTH_OK_MARKER}: <reason>" marker — this is exactly the bug class that has recurred 4 times (a tier-aware endpoint called anonymously by mistake). If this call is genuinely, deliberately anonymous (an SSR fetch with a client-side correction, or a public SEO page), add the marker; otherwise pass a real token.  ${line.trim().slice(0, 100)}`
        );
      }
    });
  }
}

// -------------------------------------------------------------------- --
if (errors.length) {
  console.error(`\n✖ ${errors.length} auth-fetch violation(s):`);
  errors.forEach((e) => console.error("  " + e));
  console.error(
    `\nSee the header comment in scripts/check-auth-fetch.mjs for the two rules this enforces, and docs/00_MASTER_CONTEXT.md's "Structural auth-fetch guard" completion note for the full history.`
  );
  process.exit(1);
}

console.log(`✓ Auth-fetch guard passed (${requiredFns.size} @auth-required endpoint(s), ${publicFns.size} @auth-public, 0 violations).`);
