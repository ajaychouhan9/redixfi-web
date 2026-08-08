// Multi-tier restructure (2026-08-08) — Basic/Pro replace the single paid
// tier. Feature lists deliberately state each tier's FULL capability set
// rather than "everything in Basic, plus X" — Pro's Ask-AI cap (25/day)
// and compare cap (10 stocks) aren't "Basic's numbers plus something",
// they're different numbers entirely (core/plan_limits.py is the real
// source of truth these mirror; kept in sync manually, same established
// convention as this codebase's other cross-file duplicated constants —
// there is no API endpoint exposing capabilities_for() as data, so this
// prose can't be generated at runtime; it CAN be the single shared
// constant every card-rendering surface imports, which is what this file
// is for).
//
// Extracted out of CheckoutView.tsx (2026-08-08, homepage pricing reveal)
// so /pricing and the homepage's pricing section render byte-identical
// copy from one place, instead of two near-duplicate literals that could
// drift apart the same way this project's numeric configs repeatedly
// have.
export const BASIC_FEATURES = [
  "All 750+ stocks' measured signal scores — full data, no masking",
  "Unlimited Research Pro company lookups",
  "Same-day news (no 24h delay)",
  "Watchlist alerts: signal changes, event risk, market-wide events",
  "AI Daily Brief digest",
  "Ask-RedixFi AI: 10 questions/day",
  "Compare up to 2 stocks side by side",
  "View-only signal table — ask Ask-RedixFi to filter or sort for you",
];

export const PRO_FEATURES = [
  "All 750+ stocks' measured signal scores — full data, no masking",
  "Unlimited Research Pro company lookups",
  "Same-day news (no 24h delay)",
  "Watchlist alerts: signal changes, event risk, market-wide events",
  "AI Daily Brief digest",
  "Ask-RedixFi AI: 25 questions/day",
  "Compare up to 10 stocks side by side",
  "Full sort/filter/search + CSV export on the Signal Dashboard",
];
