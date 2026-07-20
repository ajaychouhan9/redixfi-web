// The live `sector` field on /signals rows uses its own inconsistent
// taxonomy (verified against all 751 rows) — different from
// /intraday/sectors' cleanly-spaced names (e.g. "NIFTY INFRA"). Filter
// options are built from what /signals actually returns, not the nicer
// list, so every option is guaranteed to match at least one row.
export const SIGNAL_SECTORS = [
  "BANKNIFTY",
  "NIFTY",
  "NIFTY AUTO",
  "NIFTY ENERGY",
  "NIFTY FMCG",
  "NIFTY MEDIA",
  "NIFTY METAL",
  "NIFTY PHARMA",
  "NIFTY REALTY",
  "NIFTYINFRA",
  "NIFTYIT",
] as const;
