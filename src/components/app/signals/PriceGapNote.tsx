"use client";

import { isMarketOpenNow, istToday } from "@/lib/format";
import { priceGapNote } from "@/lib/price-gap";

/** The line under the header when the live price has moved a lot from the last close and the readings are still from that close. */
export function PriceGapNote({ pct, readingsDate }: { pct: number | null | undefined; readingsDate: string | null | undefined }) {
  const text = priceGapNote({ pct, readingsDate: readingsDate?.slice(0, 10), today: istToday(), marketOpen: isMarketOpenNow() });
  if (!text) return null;
  return (
    <p className="mt-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground-muted" data-testid="price-gap-note">
      {text}
    </p>
  );
}
