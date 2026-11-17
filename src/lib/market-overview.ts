/**
 * Market Overview tags (18 Nov 2026). Pure functions: "Live" appears only on the Intraday card and only while the market is open; every other
 * card, and Intraday outside market hours, says "As of <date> close". Without a date no tag is shown (never an undated figure).
 */
import { formatShortDate } from "@/lib/format";

export type OverviewCardId = "intraday" | "pulse" | "activity" | "movers";
export const LIVE_TAG = "Live";

export function closeTag(asOfDate: string | null | undefined): string | null {
  if (!asOfDate) return null;
  const iso = asOfDate.length === 10 ? `${asOfDate}T00:00:00Z` : asOfDate;
  return `As of ${formatShortDate(iso)} close`;
}

export function cardTags(marketState: string | null | undefined, asOfDate: string | null | undefined): Record<OverviewCardId, string | null> {
  const close = closeTag(asOfDate);
  return {
    intraday: marketState === "OPEN" ? LIVE_TAG : close,
    pulse: close,
    activity: close,
    movers: close,
  };
}
