import type { SignalsListParams } from "@/lib/api/endpoints";

export interface CannedScreen {
  slug: string;
  title: string;
  description: string;
  params: SignalsListParams;
}

// 5-6 canned, measurable, non-curated screens (screen spec Part 0 web
// requirement #1) — every one maps to a real /signals sort or filter
// param, nothing model-ordered beyond what the screen's own name declares.
export const CANNED_SCREENS: CannedScreen[] = [
  {
    slug: "high-delivery-stocks-today",
    title: "High delivery stocks today",
    description: "Stocks with the highest delivery percentage today — share of traded volume taken as actual delivery rather than intraday.",
    params: { sort: "delivery_pct", order: "desc" },
  },
  {
    slug: "signal-score-gainers-today",
    title: "Signal score gainers today",
    description: "Stocks whose measured composite signal score rose the most versus the previous session.",
    params: { sort: "delta_1d", order: "desc" },
  },
  {
    slug: "signal-score-decliners-today",
    title: "Signal score decliners today",
    description: "Stocks whose measured composite signal score fell the most versus the previous session.",
    params: { sort: "delta_1d", order: "asc" },
  },
  {
    slug: "event-risk-stocks-today",
    title: "Stocks with event risk today",
    description: "Stocks with an AI-classified news event matched in the last 5 days.",
    params: { event_risk: true, sort: "name", order: "asc" },
  },
  {
    slug: "elevated-volume-stocks-today",
    title: "Elevated volume stocks today",
    description: "Stocks trading at the highest multiple of their 5-day average volume today.",
    params: { sort: "volume_ratio", order: "desc" },
  },
];

export function getCannedScreen(slug: string): CannedScreen | undefined {
  return CANNED_SCREENS.find((s) => s.slug === slug);
}
