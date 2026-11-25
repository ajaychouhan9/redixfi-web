import type { MarketOverview } from "@/lib/api/types";
import { humanDate } from "@/lib/human-date";

/** "As of 3:30 pm" while the market is open (the time of the index snapshot), "As of 25 Nov 2026 close" otherwise. No date, no label. */
export function stripAsOf(o: Pick<MarketOverview, "as_of_date" | "market_session" | "india_vix">): string | null {
  if (o.market_session?.phase === "live" && o.india_vix?.as_of) {
    const t = new Date(o.india_vix.as_of);
    if (!Number.isNaN(t.getTime())) return `As of ${t.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toLowerCase()}`;
  }
  return o.as_of_date ? `As of ${humanDate(o.as_of_date)} close` : null;
}
