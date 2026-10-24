"use client";

/**
 * "Quick read": one line of measured facts under the score header, built from values already on the page
 * (the score and its changes, delivery against its 20-day average, volume against its norm, the volatility rank).
 * A template, not generated text; past and measured facts only. Shown only when at least three parts exist, and
 * never for stocks on a corporate-action hold, limited-data stocks, BE/BZ stocks or when the score is missing.
 * The flag chips (state chips and computed-fact chips, one per topic, at most six) sit in the same card.
 * A change that is blank (including one blanked as a catch-up against stale prices) is simply not shown.
 */

import Link from "next/link";
import { useEffect, useState } from "react";

import { getVolatility } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { Chip } from "@/components/ui/Chip";
import { signalStateLabel, signalStateTone } from "@/lib/signal-state-labels";
import { quickReadChips, quickReadParts } from "@/lib/stock-clarity";
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
  const chips = quickReadChips(
    {
      signal_states: detail.signal_states,
      insight_chips: detail.insight_chips,
      delivery_pct: s?.delivery_pct,
      delivery_avg20: s?.delivery_avg20,
      volume_ratio_5d: s?.volume_ratio_5d,
      delivery_series: s?.delivery_series,
      series: vol?.series ?? null,
    },
    signalStateLabel,
    signalStateTone,
  );
  if (parts.length === 0 && chips.length === 0) return null;
  return (
    <div className="mt-2 rounded-lg border border-border bg-surface px-3 py-2" data-testid="quick-read-card">
      {parts.length > 0 && (
        <p className="text-[13px] leading-snug text-foreground">
          <span className="mr-1.5 font-mono text-[11px] uppercase tracking-wide text-foreground-faint">Quick read</span>
          {parts.join(" · ")}
        </p>
      )}
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="quick-read-chips">
          {chips.map((c) => (
            <Chip key={c.key} tone={c.tone}>{c.text}</Chip>
          ))}
        </div>
      )}
      <p className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] text-foreground-faint">
        <span>Measured market data, not investment advice.</span>
        <Link href="/how-it-works" className="font-medium text-accent underline">How is this score calculated?</Link>
      </p>
    </div>
  );
}
