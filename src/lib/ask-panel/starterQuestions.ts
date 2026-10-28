const UNSAFE_SUGGESTION_PATTERNS = [
  /\b(buy|sell|hold)\b/i,
  /\btarget\s+price\b/i,
  /\bprice\s+target\b/i,
  /\b(will|would|could)\b.{0,28}\b(rise|fall|go up|go down|return)\b/i,
  /\b(best|highest)\s+(investment\s+)?return\b/i,
  /\bshould\s+i\s+invest\b/i,
];

// Used only when GET /ask/suggestions can't be reached. Same wording as the
// backend's tested market templates (api/app/core/ask_suggestions.py). There
// is deliberately no stock fallback: whether a stock's question can be
// answered depends on that stock's data, which only the server knows.
export const FALLBACK_MARKET_SUGGESTIONS = [
  "Which stocks have the largest score increases today?",
  "Show the 10 stocks with the highest composite scores.",
  "Which sectors have the highest readings in the latest market session?",
  "Show stocks with unusual market activity.",
  "Which F&O stocks have the highest put/call ratio?",
] as const;

export function isSafeAskSuggestion(question: string): boolean {
  return question.trim().length > 0 && !UNSAFE_SUGGESTION_PATTERNS.some((pattern) => pattern.test(question));
}

/** The server's list once loaded (null = not loaded or failed); otherwise the market fallback for a market-wide chat. */
export function getStarterQuestions(serverSuggestions: string[] | null, symbol: string | null): string[] {
  const questions = serverSuggestions ?? (symbol ? [] : [...FALLBACK_MARKET_SUGGESTIONS]);
  return questions.filter(isSafeAskSuggestion);
}
