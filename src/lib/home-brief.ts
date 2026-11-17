/**
 * Display rules for the Home AI brief (17 Nov 2026). The text itself is built and checked on the server (data-pipeline/home_brief_builder.py);
 * this file only decides what the page may show of it. A bullet that carries advice, a cause or a prediction is never shown, even if one
 * got into storage: the same guard runs here as the last gate. Pure functions, tested in scripts/test-restructure.ts.
 */
const ADVICE = /\b(buy|buys|buying|bought|sell|sells|selling|sold|target|targets|pick|picks|tip|tips|recommend\w*|advice|advise\w*|bullish|bearish)\b/i;
const CAUSE = /\b(because|due to|owing to|thanks to|on account of|as a result|driven by|led by|on worries|on fears|on hopes|on concerns|amid|following|triggered|caused)\b/i;
const FUTURE = /\b(may|might|could|likely|unlikely|expected|expects|will|would|should|set to|poised|forecast\w*|predict\w*|outlook|anticipate\w*)\b/i;

export function bulletIsSafe(text: string): boolean {
  // "no buy or sell advice" style disclaimers are not in the brief; any of these words in a bullet means it is not shown
  return !!text && !ADVICE.test(text) && !CAUSE.test(text) && !FUTURE.test(text);
}

/** Up to five bullets that pass the guard. */
export function shownBullets(bullets: unknown): string[] {
  if (!Array.isArray(bullets)) return [];
  return bullets.filter((b): b is string => typeof b === "string" && bulletIsSafe(b)).slice(0, 5);
}

export const BRIEF_NOT_ADVICE = "Facts from today's market data. Not a recommendation or a forecast.";

/** "Updated 12:30 IST" from the stored label; falls back to the stored time. */
export function updatedLine(label: string | null | undefined, iso: string | null | undefined): string | null {
  if (label) return `Updated ${label}`;
  const m = /T(\d{2}:\d{2})/.exec(iso ?? "");
  return m ? `Updated ${m[1]} IST` : null;
}
