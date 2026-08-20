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
 * grounded (concall/annual-report retrieval) -> 1-2, everything else -> 1.
 */

const TABULAR_MULTI_SYMBOL_RE = /\b(compare|vs\.?|versus)\b/i;
const TABULAR_RANGE_RE =
  /\b(last|past|previous)\s+\d+\s*(day|days|week|weeks|month|months)\b|\b(between|from)\b.+\b(and|to)\b.+\d{4}|\bover the (last|past)\b/i;
const DOCUMENT_GROUNDED_RE =
  /\b(concall|conference call|annual report|investor (presentation|call)|management (commentary|said|discussed)|transcript|10-?k|earnings call)\b/i;

export function estimateQuestionWeight(question: string): number {
  const q = question.trim();
  if (!q) return 1;

  const looksTabular = TABULAR_RANGE_RE.test(q);
  if (looksTabular) {
    return TABULAR_MULTI_SYMBOL_RE.test(q) ? 3 : 2;
  }
  if (DOCUMENT_GROUNDED_RE.test(q)) {
    return 2;
  }
  return 1;
}

export function questionWeightLabel(weight: number): string {
  if (weight <= 1) return "Uses 1 of your daily questions";
  if (weight === 2) return "Detailed question — uses up to 2 of your daily questions";
  return "Detailed comparison — uses up to 3 of your daily questions";
}
