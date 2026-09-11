import type { SignalsListParams } from "@/lib/api/endpoints";
import { SIGNAL_SECTORS } from "@/data/sectors";

export interface CannedScreen {
  slug: string;
  title: string;
  description: string;
  params: SignalsListParams;
}

// 5-6 canned, measurable, non-curated screens (screen spec Part 0 web
// requirement #1) — every one maps to a real /signals sort or filter
// param, nothing model-ordered beyond what the screen's own name declares.
const BASE_SCREENS: CannedScreen[] = [
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

// Programmatic SEO expansion (2026-09-11): cross 3 of the base metrics —
// the ones a sector filter narrows meaningfully, not all 5 (event-risk and
// elevated-volume are already low-density per sector; crossing them too
// would produce thin, often-empty pages, the exact anti-pattern
// programmatic SEO is supposed to avoid) — with every real sector value
// /signals actually returns (SIGNAL_SECTORS, verified against live rows,
// not the nicer /intraday taxonomy). Generated once at module load, not
// hand-maintained, so adding a sector to SIGNAL_SECTORS automatically
// grows the screen set. `sector` is passed through to the same
// SignalsListParams.sector the manual Signals Dashboard filter already
// uses — no new backend param.
const SECTOR_METRICS: Array<{ suffix: string; title: (s: string) => string; description: (s: string) => string; params: Omit<SignalsListParams, "sector"> }> = [
  {
    suffix: "high-delivery",
    title: (s) => `High delivery stocks in ${s}`,
    description: (s) => `${s} stocks with the highest delivery percentage today.`,
    params: { sort: "delivery_pct", order: "desc" },
  },
  {
    suffix: "signal-score-gainers",
    title: (s) => `Signal score gainers in ${s}`,
    description: (s) => `${s} stocks whose measured composite signal score rose the most versus the previous session.`,
    params: { sort: "delta_1d", order: "desc" },
  },
  {
    suffix: "event-risk",
    title: (s) => `Stocks with event risk in ${s}`,
    description: (s) => `${s} stocks with an AI-classified news event matched in the last 5 days.`,
    params: { event_risk: true, sort: "name", order: "asc" },
  },
];

function slugifySector(sector: string): string {
  return sector.toLowerCase().replace(/\s+/g, "-");
}

const SECTOR_SCREENS: CannedScreen[] = SIGNAL_SECTORS.flatMap((sector) =>
  SECTOR_METRICS.map((m) => ({
    slug: `${m.suffix}-in-${slugifySector(sector)}`,
    title: m.title(sector),
    description: m.description(sector),
    params: { ...m.params, sector },
  }))
);

export const CANNED_SCREENS: CannedScreen[] = [...BASE_SCREENS, ...SECTOR_SCREENS];

export function getCannedScreen(slug: string): CannedScreen | undefined {
  return CANNED_SCREENS.find((s) => s.slug === slug);
}
