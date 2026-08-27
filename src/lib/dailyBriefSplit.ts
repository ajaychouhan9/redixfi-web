export interface DailyBriefSplit {
  summary: string;
  rest: string;
}

/**
 * Splits prose only at actual sentence-ending punctuation. In particular,
 * a decimal point between digits (for example, ``0.03%`` or ``₹123.45``)
 * is part of the number, never a sentence boundary.
 */
function sentencesIn(body: string): string[] {
  const sentences: string[] = [];
  let start = 0;

  for (let index = 0; index < body.length; index += 1) {
    const current = body[index];
    const previous = body[index - 1] ?? "";
    const next = body[index + 1] ?? "";
    const isDecimalPoint = current === "." && /\d/.test(previous) && /\d/.test(next);
    const isPunctuation = current === "." || current === "!" || current === "?";

    if (!isPunctuation || isDecimalPoint) continue;

    let end = index + 1;
    while (body[end] === "." || body[end] === "!" || body[end] === "?") end += 1;
    if (end < body.length && !/\s/.test(body[end])) continue;

    sentences.push(body.slice(start, end));
    start = end;
    index = end - 1;
  }

  if (start < body.length) sentences.push(body.slice(start));
  return sentences.filter((sentence) => sentence.trim());
}

export function splitDailyBriefSummary(body: string, maxSentences = 3): DailyBriefSplit {
  const sentences = sentencesIn(body);
  if (sentences.length <= maxSentences) return { summary: body.trim(), rest: "" };
  return {
    summary: sentences.slice(0, maxSentences).join("").trim(),
    rest: sentences.slice(maxSentences).join("").trim(),
  };
}

export interface DailyBriefBullets {
  visible: string[];
  rest: string[];
}

/**
 * Same sentence boundaries as splitDailyBriefSummary(), kept as separate
 * bullets instead of being rejoined into paragraph prose. This is a
 * heuristic split of unstructured, LLM-written prose (daily_brief_builder.py
 * has no structured {label, value} fact list) — it produces reasonable
 * bullets for the builder's current sentence-per-topic style, but a symbol
 * with a mid-sentence period edge case could still land awkwardly. A
 * durable fix belongs in the builder emitting structured facts.
 */
export function splitDailyBriefBullets(body: string, maxVisible = 3): DailyBriefBullets {
  const sentences = sentencesIn(body)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return { visible: sentences.slice(0, maxVisible), rest: sentences.slice(maxVisible) };
}
