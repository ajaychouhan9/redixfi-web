/**
 * Regression test — Ask-RedixFi panel fresh-vs-resume-on-reopen rule
 * (`src/lib/ask-panel/freshStartRule.ts::shouldStartFreshOnReopen`).
 *
 * WHY THIS EXISTS: this exact behavior has regressed and needed re-fixing
 * more than once (built in the 2026-08-20 UI polish batch as an inline
 * `useEffect` condition; a 2026-08-21 session reported it silently broken
 * again). This repo has no JS/TS test framework installed (checked
 * package.json first — no jest/vitest/testing-library), so this exercises
 * the REAL exported function directly via Node's own TypeScript support
 * (no new dependency) rather than being skipped for lack of one.
 *
 * Run: node --experimental-strip-types scripts/test-ask-fresh-start.ts
 */
import { shouldStartFreshOnReopen } from "../src/lib/ask-panel/freshStartRule.ts";

let failures = 0;

function check(label: string, actual: boolean, expected: boolean) {
  if (actual === expected) {
    console.log(`  PASS ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label} — expected ${expected}, got ${actual}`);
  }
}

// Scenario from the task brief, verbatim: "open panel on a stock page,
// close it, navigate to a different page, reopen -> fresh conversation."
check(
  "close on /signals/TCS, navigate to /watchlist, reopen -> FRESH",
  shouldStartFreshOnReopen({ open: true, hasClosedBefore: true, closedAtPath: "/signals/TCS", currentPath: "/watchlist" }),
  true
);

// "reopen without navigating -> same conversation resumes."
check(
  "close on /signals/TCS, reopen on /signals/TCS (no navigation) -> RESUME",
  shouldStartFreshOnReopen({ open: true, hasClosedBefore: true, closedAtPath: "/signals/TCS", currentPath: "/signals/TCS" }),
  false
);

// An app's very first-ever open has nothing to compare against yet
// (hasClosedBefore=false) -> old resume-by-default behavior, unaffected.
check(
  "never closed before (first-ever open) -> RESUME (nothing to compare against)",
  shouldStartFreshOnReopen({ open: true, hasClosedBefore: false, closedAtPath: null, currentPath: "/signals/TCS" }),
  false
);

// Toggling open/closed rapidly on the SAME page multiple times must keep
// resuming every time, not just the first reopen.
check(
  "close/reopen on the SAME page twice in a row -> RESUME both times",
  shouldStartFreshOnReopen({ open: true, hasClosedBefore: true, closedAtPath: "/watchlist", currentPath: "/watchlist" }),
  false
);

// The panel navigating while still CLOSED must not itself trigger a fresh
// start — only a REOPEN (open:true) does; this guards against a bug class
// where the effect's `pathname` dependency fires the check while `open`
// is still false.
check(
  "navigated while panel is still closed (open:false) -> never fresh (nothing to reopen yet)",
  shouldStartFreshOnReopen({ open: false, hasClosedBefore: true, closedAtPath: "/signals/TCS", currentPath: "/watchlist" }),
  false
);

// closedAtPath explicitly null (shouldn't happen once hasClosedBefore is
// true in the real component, but the guard itself must hold defensively).
check(
  "hasClosedBefore true but closedAtPath still null -> RESUME (defensive)",
  shouldStartFreshOnReopen({ open: true, hasClosedBefore: true, closedAtPath: null, currentPath: "/signals/TCS" }),
  false
);

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
