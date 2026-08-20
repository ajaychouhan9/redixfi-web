/**
 * Weighted-credit system (weighted-credit session) — client-side PRE-SEND
 * estimate of a question's weight, shown inline before the user commits to
 * sending it (requirement 3). Deliberately a lightweight heuristic, not a
 * backend round-trip: the real weight (core/ask.py::compute_question_
 * weight) depends on which retrieval path actually fires server-side
 * (whether ChromaDB document_chunks were hit, how many symbols a tabular
 * query resolved to), which isn't knowable without running the real
 * pipeline — asking the backend to classify cheaply first would still cost
 * a network round-trip for every keystroke-driven estimate and could still
 * disagree with the real answer's path. This estimate is therefore always
 * labeled "expected"/"uses up to N" (see the composer's rendering), and the
 * per-message tag after a real answer (result.question_weight, exact, from
 * the server) is the source of truth — this is only a before-you-send hint.
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
 */

const TABULAR_MULTI_SYMBOL_RE = /\b(compare|vs\.?|versus)\b/i;
const TABULAR_RANGE_RE =
  /\b(last|past|previous)\s+\d+\s*(day|days|week|weeks|month|months)\b|\b(between|from)\b.+\b(and|to)\b.+\d{4}|\bover the (last|past)\b/i;
// Two DISTINCT document families, per core/document_retrieval.py's own
// doc_type vocabulary (annual_report vs concall_transcript) — a question
// naming one keyword from EACH group is asking for a genuinely combined
// retrieval (two separate underlying documents), not one lookup.
const DOCUMENT_SOURCE_RE_ANNUAL_REPORT = /\b(annual report|10-?k)\b/i;
const DOCUMENT_SOURCE_RE_CONCALL = /\b(concall|conference call|investor (presentation|call)|management (commentary|said|discussed)|transcript|earnings call)\b/i;

export function estimateQuestionWeight(question: string): number {
  const q = question.trim();
  if (!q) return 1;

  const looksTabular = TABULAR_RANGE_RE.test(q);
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
