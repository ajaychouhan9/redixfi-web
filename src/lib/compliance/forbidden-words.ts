// Source of truth: docs/00_MASTER_CONTEXT.md "Hard compliance rules" (esp.
// rule 6, the forbidden-word list) + the TENSE TEST / MIND-READING TEST.
// Used by scripts/check-compliance.mjs (CI sweep) at build time.
//
// "signal"/"signals" is NOT banned — it's the product's own vocabulary
// (Signal Dashboard, composite_score). What's banned is using it to mean
// a trade call, which the phrase-level entry below catches without
// flagging every legitimate use of the word "signal".
//
// A few standard financial-vocabulary compounds are excluded by pattern
// (FII "net buy" streaks, PCR "call-heavy"/"put-heavy" bands) — these
// describe already-observed measurements in the third person, not advice,
// and appear on essentially every stock page in this app.

export const FORBIDDEN_WORDS: string[] = [
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
  "\\bsignals?\\s+(say|show|suggest)s?\\s+(buy|sell)\\b",
];

// TENSE TEST / MIND-READING TEST — forward-looking or verdict language.
// These are warnings, not hard failures, since some may appear in quoted
// third-party news headlines rendered verbatim (that's fine — the rule
// applies to OUR copy, not to quoted source material).
export const FORWARD_TENSE_WORDS: string[] = [
  "\\bexpected\\b",
  "\\boutlook\\b",
  "\\blikely\\b",
  "\\bwill\\s+(rise|fall|rally|drop|surge|crash|gain|lose)\\b",
  "\\bconfidence\\s+(level|score)?\\b",
  "\\bvalidity\\s+window\\b",
  "\\btarget\\s+date\\b",
];

/** A forbidden-word match on a line that also negates it ("not a prediction", "no advice") is compliant, not a violation — this IS the required disclaimer pattern. */
export const NEGATION_PATTERN = "\\b(not|no|never|isn't|doesn't|nor)\\b";

export const COMPLIANCE_IGNORE_MARKER = "compliance-ignore";
