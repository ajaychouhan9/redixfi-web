const UNSAFE_SUGGESTION_PATTERNS = [
  /\b(buy|sell|hold)\b/i,
  /\btarget\s+price\b/i,
  /\bprice\s+target\b/i,
  /\b(will|would|could)\b.{0,28}\b(rise|fall|go up|go down|return)\b/i,
  /\b(best|highest)\s+(investment\s+)?return\b/i,
  /\bshould\s+i\s+invest\b/i,
];

export const MARKET_STARTER_QUESTIONS = [
  "Which sectors are strongest in the latest market session?",
  "Which sectors have the weakest current readings?",
  "Show the 10 highest composite-score stocks.",
  "Which stocks have the strongest delivery today?",
  "Show stocks with strong composite scores and low promoter pledge.",
  "Which stocks have high delivery and low promoter pledge?",
  "Show companies with promoter pledge above 10%.",
  "Which companies have Red Flags?",
  "Show stocks with unusual market activity.",
  "Compare TCS and INFY using current measured signals.",
  "Show TCS's latest Annual Report insights.",
  "What did RELIANCE management say in its latest concall?",
  "What Red Flags does INFY have?",
  "Which companies have Annual Report coverage?",
  "Which companies have concall coverage?",
  "Show companies with low pledge and strong delivery.",
] as const;

const STOCK_STARTER_TEMPLATES = [
  "Explain {symbol}'s current composite score.",
  "What changed in {symbol}'s composite score?",
  "What are {symbol}'s strongest measured signals?",
  "What are {symbol}'s weakest measured signals?",
  "How does {symbol}'s delivery compare with recent levels?",
  "Summarize {symbol}'s latest Annual Report.",
  "What risks are discussed in {symbol}'s latest Annual Report?",
  "What did management say in {symbol}'s latest concall?",
  "What growth priorities did {symbol}'s management discuss?",
  "What risks or challenges did {symbol}'s management discuss?",
  "What Red Flags have been identified for {symbol}?",
  "How has {symbol}'s promoter pledge changed?",
  "What governance issues should an analyst examine for {symbol}?",
  "Compare {symbol}'s current signals with sector peers.",
  "How has {symbol}'s score changed over the last two weeks?",
  "What should an analyst investigate further about {symbol}?",
] as const;

export function isSafeAskSuggestion(question: string): boolean {
  return question.trim().length > 0 && !UNSAFE_SUGGESTION_PATTERNS.some((pattern) => pattern.test(question));
}

export function getStarterQuestions(symbol: string | null): string[] {
  const questions = symbol
    ? STOCK_STARTER_TEMPLATES.map((question) => question.replaceAll("{symbol}", symbol.toUpperCase()))
    : [...MARKET_STARTER_QUESTIONS];
  return questions.filter(isSafeAskSuggestion);
}
