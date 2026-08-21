/**
 * Weighted-credit system (weighted-credit session) — client-side PRE-SEND
 * estimate of a question's weight, shown inline before the user commits to
 * sending it (requirement 3). Deliberately a lightweight heuristic, not a
 * backend round-trip: the real weight (core/ask.py::compute_question_
 * weight) depends on which retrieval path actually fires server-side
 * (whether ChromaDB document_chunks were hit), which isn't knowable
 * without running the real pipeline — asking the backend to classify
 * cheaply first would still cost a network round-trip for every keystroke-
 * driven estimate and could still disagree with the real answer's path.
 * This estimate is therefore always labeled "expected"/"uses up to N" (see
 * the composer's rendering), and the per-message tag after a real answer
 * (result.question_weight, exact, from the server) is the source of truth
 * — this is only a before-you-send hint.
 *
 * Mirrors compute_question_weight's three tiers from plain text signal:
 * tabular-shaped (multi-symbol / multi-day comparison) -> 2-3, document-
 * grounded (concall/annual-report retrieval) -> 1-2 for a single document
 * family, 3 once TWO distinct document families are both named in one
 * question (see the two DOCUMENT_SOURCE_RE_* groups below) — everything
 * else -> 1.
 *
 * BUG FIX (2026-08-20) — a real "latest concall and annual report of ABB"
 * question, spanning BOTH document families in one request, was under-
 * estimated at a flat 2 (the single DOCUMENT_GROUNDED_RE this replaces
 * matched "concall" and stopped there, never checking whether a SECOND,
 * distinct document type was also named). core/ask.py::
 * compute_question_weight had the identical gap server-side — it only
 * ever saw "document_chunks present", never how many distinct doc_types
 * were actually retrieved — and now charges 3 for this real shape via a
 * new `distinct_doc_types` signal; this heuristic is updated to match, so
 * the pre-send estimate doesn't undersell what a combined-source question
 * actually costs.
 *
 * BUG FIX (2026-08-21, confirm-dialog/charge-mismatch investigation) — this
 * function was missing TWO real preconditions core/ask.py::run_ask_open's
 * tabular branch actually enforces before it ever charges weight 2/3 for a
 * "tabular-shaped" question, both confirmed by direct source read:
 *
 * 1. TIER: `run_ask_open` only attempts tabular_ask at all when
 *    `resolve_tier(auth.tier) == PRO` (core/tabular_ask.py's own module
 *    docstring: "TIER: Pro-only... Basic/Free asking the same question
 *    keep getting today's existing (LLM, single-snapshot) answer"). This
 *    function had NO tier awareness at all — a Basic caller asking "TCS
 *    score over the last 30 days" was estimated at weight 2 (showing
 *    "uses up to 2 of your daily questions") even though Basic can NEVER
 *    reach the tabular path server-side; the real answer costs 1. Exactly
 *    the reported "Basic: shows up to 2, charges 1" bug. Now requires an
 *    explicit `isPro` argument — false for every non-Pro caller collapses
 *    this branch to never fire, matching the real server-side gate.
 * 2. FIELD KEYWORD: `core/tabular_ask.py::is_tabular_question` requires
 *    BOTH a date-range phrase AND a recognized field word (price/score/
 *    delivery/volume, `_FIELD_PATTERNS`) — `parse_fields(q)` must be
 *    non-empty FIRST, checked before the date-range check even runs. This
 *    function only ever checked for a date-range phrase, with no field
 *    requirement at all — a question like "How has ABB performed over the
 *    last 30 days?" (no field word) was estimated at weight 2 even though
 *    `is_tabular_question` returns false for it server-side (no field
 *    match), so the real answer costs 1 — the same client/server
 *    divergence, independent of tier, plausibly the PRO-side half of the
 *    reported bug. `TABULAR_FIELD_RE` below mirrors `_FIELD_PATTERNS`
 *    verbatim (same 4 field groups, same regex shapes).
 *
 * Residual, INHERENT gap (not fixed, not fixable client-side, and already
 * honestly hedged by "uses up to N" rather than a bare "uses N"): the
 * document-grounded branch's real weight still depends on whether ChromaDB
 * genuinely has indexed chunks for the named symbol/document — that can
 * only be known by actually running the retrieval, which this
 * deliberately-lightweight heuristic does not do. Tabular's two gates
 * above were both deterministic, code-only preconditions with no such
 * runtime dependency, which is why those two (and only those two) could be
 * closed exactly.
 */

const TABULAR_MULTI_SYMBOL_RE = /\b(compare|vs\.?|versus)\b/i;
const TABULAR_RANGE_RE =
  /\b(last|past|previous)\s+\d+\s*(day|days|week|weeks|month|months)\b|\b(between|from)\b.+\b(and|to)\b.+\d{4}|\bover the (last|past)\b/i;
// Verbatim mirror of core/tabular_ask.py::_FIELD_PATTERNS' 4 field groups
// (price/composite score/delivery/volume) — kept in sync manually, same
// established cross-file-duplication convention as this codebase's other
// backend/frontend constant pairs (e.g. AskRedixFi.tsx's own DAILY_LIMIT_
// LABEL comment on core/plan_limits.py's AskLimits table).
const TABULAR_FIELD_RE = /\bprice\b|\bopen(ing)?\b|\bclos(e|ing)\b|\bcomposite(\s+score)?\b|\bscore\b|\bdelivery\b|\bvolume\b/i;
// Two DISTINCT document families, per core/document_retrieval.py's own
// doc_type vocabulary (annual_report vs concall_transcript) — a question
// naming one keyword from EACH group is asking for a genuinely combined
// retrieval (two separate underlying documents), not one lookup.
const DOCUMENT_SOURCE_RE_ANNUAL_REPORT = /\b(annual report|10-?k)\b/i;
const DOCUMENT_SOURCE_RE_CONCALL = /\b(concall|conference call|investor (presentation|call)|management (commentary|said|discussed)|transcript|earnings call)\b/i;

export function estimateQuestionWeight(question: string, isPro: boolean): number {
  const q = question.trim();
  if (!q) return 1;

  const looksTabular = isPro && TABULAR_FIELD_RE.test(q) && TABULAR_RANGE_RE.test(q);
  if (looksTabular) {
    return TABULAR_MULTI_SYMBOL_RE.test(q) ? 3 : 2;
  }
  const hasAnnualReport = DOCUMENT_SOURCE_RE_ANNUAL_REPORT.test(q);
  const hasConcall = DOCUMENT_SOURCE_RE_CONCALL.test(q);
  if (hasAnnualReport && hasConcall) return 3;
  if (hasAnnualReport || hasConcall) return 2;
  return 1;
}

export function questionWeightLabel(weight: number): string {
  if (weight <= 1) return "Uses 1 of your daily questions";
  if (weight === 2) return "Detailed question — uses up to 2 of your daily questions";
  // Covers BOTH weight-3 shapes (a tabular multi-symbol comparison, or a
  // single combined multi-document-source request) with one generic label
  // — deliberately not "comparison"-specific wording, since the second
  // shape isn't a comparison at all.
  return "This detailed request uses up to 3 of your daily questions";
}
