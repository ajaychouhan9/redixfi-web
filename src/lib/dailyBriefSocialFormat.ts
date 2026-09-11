import { sentencesIn } from "./dailyBriefSplit";
import type { DailyBrief } from "./api/types";

// Same canonical wording as components/layout/FooterDisclaimer.tsx —
// shortened per platform's character budget, never re-authored. The
// medium/long footer is that exact sentence pair verbatim; the short
// (X-length) footer is a compressed version of the SAME two claims
// (measured-data-not-advice, not-yet-SEBI-registered), not new wording.
const FULL_FOOTER =
  "RedixFi provides measured market data and analytics only — not investment advice, recommendations, or predictions. We are not yet SEBI-registered as a Research Analyst.";
const SHORT_FOOTER = "Measured data only, not investment advice. Not yet SEBI-registered as a Research Analyst.";

function periodLabel(period: string): string {
  return period === "close" ? "Close" : "Morning";
}

function header(brief: DailyBrief): string {
  return `RedixFi Daily Brief — ${periodLabel(brief.period)}, ${brief.date}`;
}

/** Fills sentences into `budget` characters, never splitting one mid-way —
 * the last sentence that would overflow is dropped whole, not truncated,
 * so a compliance-relevant clause is never cut off mid-sentence. If even
 * the FIRST sentence alone doesn't fit, it's hard-truncated with an
 * ellipsis (rare — only for pathologically long single sentences). */
function fitSentences(rawSentences: string[], budget: number): string {
  // Trimmed once here: sentencesIn()'s split point lands right after the
  // punctuation, so every sentence AFTER the first naturally starts with
  // the original prose's inter-sentence space still attached — joining
  // with an explicit separator on top of that leading space produced a
  // real double-space artifact (found by manually tracing real output
  // against real body text before shipping this).
  const sentences = rawSentences.map((s) => s.trim()).filter(Boolean);
  let out = "";
  for (const s of sentences) {
    const candidate = out ? `${out} ${s}` : s;
    if (candidate.length > budget) break;
    out = candidate;
  }
  if (!out && sentences[0]) {
    out = budget > 1 ? `${sentences[0].slice(0, budget - 1)}…` : "";
  }
  return out;
}

export interface SocialVariant {
  key: "short" | "medium" | "long";
  label: string;
  platformNote: string;
  text: string;
  charCount: number;
  charLimit: number | null;
}

function buildVariant(
  brief: DailyBrief,
  opts: { key: SocialVariant["key"]; label: string; platformNote: string; footer: string; charLimit: number | null; fitToLimit: boolean }
): SocialVariant {
  const h = header(brief);
  const sentences = sentencesIn(brief.body);
  let body: string;
  if (opts.fitToLimit && opts.charLimit) {
    // header + 2 blank-line breaks (\n\n twice) + footer, reserved before
    // the body gets whatever's left.
    const reserved = h.length + 2 + opts.footer.length + 2;
    const budget = Math.max(0, opts.charLimit - reserved);
    body = fitSentences(sentences, budget);
  } else {
    body = brief.body.trim();
  }
  const text = `${h}\n\n${body}\n\n${opts.footer}`;
  return { key: opts.key, label: opts.label, platformNote: opts.platformNote, text, charCount: text.length, charLimit: opts.charLimit };
}

export function buildSocialVariants(brief: DailyBrief): SocialVariant[] {
  return [
    buildVariant(brief, {
      key: "short",
      label: "Short",
      platformNote: "X-length appropriate (~280 characters)",
      footer: SHORT_FOOTER,
      charLimit: 280,
      fitToLimit: true,
    }),
    buildVariant(brief, {
      key: "medium",
      label: "Medium",
      platformNote: "Instagram caption-appropriate (~2,200 characters)",
      footer: FULL_FOOTER,
      charLimit: 2200,
      fitToLimit: true,
    }),
    buildVariant(brief, {
      key: "long",
      label: "Long",
      platformNote: "Reddit text post / Facebook",
      footer: `${FULL_FOOTER} Full disclaimer: redixfi.com/more/disclaimer`,
      charLimit: null,
      fitToLimit: false,
    }),
  ];
}
