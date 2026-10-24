"use client";

/**
 * "Quick read": one line of measured facts under the score header, built from values already on the page
 * (the score and its changes, delivery against its 20-day average, volume against its norm, the volatility rank).
 * A template, not generated text; past and measured facts only. Shown only when at least three parts exist, and
 * never for stocks on a corporate-action hold, limited-data stocks, BE/BZ stocks or when the score is missing.
 * A change that is blank (including one blanked as a catch-up against stale prices) is simply not shown.
 */

import { useEffect, useState } from "react";

import { getVolatility } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { quickReadParts } from "@/lib/stock-clarity";
import type { SignalDetail, VolatilityResponse } from "@/lib/api/types";

export function QuickRead({ detail }: { detail: SignalDetail }) {
  const { getToken } = useAuth();
  const [vol, setVol] = useState<VolatilityResponse | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        const res = await getVolatility(detail.symbol, { token });
        if (alive) setVol(res.data);
      } catch {
        /* the line is built without the volatility part */
      } finally {
        if (alive) setSettled(true);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.symbol]);

  // wait for the volatility answer so a BE/BZ stock is never shown a line first and then loses it
  if (!settled) return null;
  const s = detail.signals;
  const ranked = !!vol && vol.available && vol.eligible && !vol.locked;
  const parts = quickReadParts({
    composite_score: detail.composite_score,
    delta_1d: detail.delta_1d,
    delta_5d: detail.delta_5d,
    delivery_pct: s?.delivery_pct,
    delivery_avg20: s?.delivery_avg20,
    delivery_series: s?.delivery_series,
    volume_ratio_5d: s?.volume_ratio_5d,
    vol_rank: ranked ? vol?.vol_rank : null,
    ranked_of: ranked ? vol?.ranked_of : null,
    series: vol?.series ?? null,
    corporate_action_status: detail.corporate_action?.status ?? null,
    limited_data: detail.limited_data,
  });
  if (parts.length === 0) return null;
  return (
    <div className="mt-2 rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-[13px] leading-snug text-foreground">
        <span className="mr-1.5 font-mono text-[11px] uppercase tracking-wide text-foreground-faint">Quick read</span>
        {parts.join(" · ")}
      </p>
      <p className="mt-1 text-[10px] text-foreground-faint">Measured market data, not investment advice.</p>
    </div>
  );
}
