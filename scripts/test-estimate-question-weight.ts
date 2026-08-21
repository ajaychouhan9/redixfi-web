/**
 * Regression test — BUG 2 (2026-08-21): the pre-send weight estimate shown
 * in the confirm dialog must match what the backend actually charges.
 *
 * `estimateQuestionWeight` was missing two real preconditions the backend's
 * tabular gate enforces (core/ask.py::run_ask_open + core/tabular_ask.py::
 * is_tabular_question — see estimateQuestionWeight.ts's own BUG FIX
 * comment for the full trace): a TIER check (tabular mode is Pro-only) and
 * a FIELD-KEYWORD requirement (price/score/delivery/volume must actually
 * be named, not just a date range). This asserts the FIXED function
 * against the exact same question text used in the backend's own
 * regression suite (api/scripts/smoke_test_batch_20260821_bug2.py) so the
 * two sides can be compared directly, per tier, in the session's
 * completion note — not just asserted in isolation here.
 *
 * Run: node --experimental-strip-types scripts/test-estimate-question-weight.ts
 */
import { estimateQuestionWeight } from "../src/lib/ask-panel/estimateQuestionWeight.ts";

let failures = 0;

function check(label: string, actual: number, expected: number) {
  if (actual === expected) {
    console.log(`  PASS ${label} (estimate=${actual})`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label} — expected ${expected}, got ${actual}`);
  }
}

// The exact question used in the backend's matching test — see that
// script's own docstring. Field word "composite score" + range phrase
// "last 30 days" -> real server weight is 2 for Pro (single-symbol
// tabular), 1 for Basic (tabular is Pro-only, falls through to a normal
// single-symbol answer with no document retrieval hit).
const TABULAR_SINGLE = "What is TCS's composite score over the last 30 days?";
check("tabular+field, Pro -> 2 (matches real server tabular weight for Pro)", estimateQuestionWeight(TABULAR_SINGLE, true), 2);
check("tabular+field, Basic -> 1 (tabular is Pro-only; matches real server fallback weight for Basic)", estimateQuestionWeight(TABULAR_SINGLE, false), 1);

// Multi-symbol tabular (compare/vs) -> 3, Pro only.
const TABULAR_MULTI = "Compare TCS and INFY composite score over the last 2 weeks";
check("tabular+field+compare, Pro -> 3", estimateQuestionWeight(TABULAR_MULTI, true), 3);
check("tabular+field+compare, Basic -> 1 (same Pro-only gate)", estimateQuestionWeight(TABULAR_MULTI, false), 1);

// BUG FIX regression — a date-range phrase with NO field keyword must NOT
// estimate tabular weight for ANY tier (core/tabular_ask.py::
// is_tabular_question requires parse_fields(q) non-empty FIRST; this
// question has no price/score/delivery/volume word at all).
const RANGE_NO_FIELD = "How has ABB performed over the last 30 days?";
check("range phrase, NO field keyword, Pro -> 1 (was incorrectly 2 before this fix)", estimateQuestionWeight(RANGE_NO_FIELD, true), 1);
check("range phrase, NO field keyword, Basic -> 1", estimateQuestionWeight(RANGE_NO_FIELD, false), 1);

// Document-grounded — tier-independent (per-symbol document retrieval is
// NOT tier-gated server-side, confirmed by reading core/ask.py::
// build_fact_packet directly — only the GENERAL/no-symbol path gates it to
// Pro). Same estimate for Basic and Pro.
const CONCALL_ONLY = "What did management say on ABB's last concall?";
check("concall keyword, Pro -> 2", estimateQuestionWeight(CONCALL_ONLY, true), 2);
check("concall keyword, Basic -> 2 (document retrieval isn't tier-gated per-symbol)", estimateQuestionWeight(CONCALL_ONLY, false), 2);

const BOTH_DOC_SOURCES = "Summarize the latest concall and annual report of ABB";
check("concall + annual report (2 distinct sources), Pro -> 3", estimateQuestionWeight(BOTH_DOC_SOURCES, true), 3);
check("concall + annual report (2 distinct sources), Basic -> 3", estimateQuestionWeight(BOTH_DOC_SOURCES, false), 3);

// Confirm-dialog-skipped investigation (2026-08-21) — the EXACT reported
// question text. Confirms the estimate itself was never the bug (returns
// 3, correctly, for both tiers) — the real root cause was the quick-
// prompt/follow-up chips calling send() directly instead of
// handleSendClick(), bypassing whatever this function returns entirely.
// See AskRedixFi.tsx's own fix comment at both chip onClick handlers.
const REPORTED_QUESTION = "ABB annual report and concall summary";
check("EXACT reported text, Pro -> 3 (estimate was already correct)", estimateQuestionWeight(REPORTED_QUESTION, true), 3);
check("EXACT reported text, Basic -> 3", estimateQuestionWeight(REPORTED_QUESTION, false), 3);

// Plain question -> 1, always.
check("plain question, Pro -> 1", estimateQuestionWeight("What is TCS's composite score today?", true), 1);
check("plain question, Basic -> 1", estimateQuestionWeight("What is TCS's composite score today?", false), 1);

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
