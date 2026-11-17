"use client";

import { useEffect, useState } from "react";

import { DeltaValue } from "@/components/ui/DeltaValue";
import { MarketPulseCard } from "@/components/app/MarketPulseCard";
import { getIntradaySession, getMarketOverview } from "@/lib/api/endpoints";
import type { IntradaySession, MarketOverview } from "@/lib/api/types";
import { formatShortDate } from "@/lib/format";
import { LIVE_LABEL, atCloseLabel } from "@/lib/market-labels";

/** Pulse: the index levels, breadth and the Market Pulse card, each with its date. Loaded in the browser so the page stays static. */
export function PulseTab() {
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [session, setSession] = useState<IntradaySession | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getMarketOverview(), getIntradaySession()]).then(([o, s]) => {
      if (cancelled) return;
      if (o.status === "fulfilled") setOverview(o.value.data);
      if (s.status === "fulfilled") setSession(s.value.data);
      setState(o.status === "fulfilled" ? "ok" : "error");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const live = overview?.market_state === "OPEN";
  const basis = overview ? (live ? LIVE_LABEL : overview.as_of_date ? atCloseLabel(overview.as_of_date) : null) : null;
  const idx = (label: string, q?: { close: number; change_pct: number | null } | null) =>
    q ? (
      <div className="rounded-lg border border-border bg-surface p-3" data-testid="pulse-index">
        <p className="text-xs text-foreground-muted">{label}</p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums">{q.close.toLocaleString("en-IN")}</p>
        <p className="text-sm"><DeltaValue value={q.change_pct} kind="pct" /></p>
        {basis && <p className="text-[11px] text-foreground-faint">{basis}</p>}
      </div>
    ) : null;

  return (
    <section className="space-y-3" aria-labelledby="pulse-title" data-testid="pulse-tab">
      <h2 id="pulse-title" className="text-base font-semibold">Pulse</h2>
      {state === "loading" && <p className="py-6 text-sm text-foreground-muted">Loading…</p>}
      {state === "error" && <p className="py-6 text-sm text-foreground-muted">Market data is unavailable right now. Please try again in a minute.</p>}
      {state === "ok" && overview && (
        <>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            {idx("Nifty 50", overview.nifty)}
            {idx("Bank Nifty", overview.banknifty)}
          </div>
          {session?.breadth_line && (
            <p className="text-sm text-foreground-muted" data-testid="pulse-breadth">
              {session.breadth_line}
              {session.breadth_date ? <span className="text-[11px] text-foreground-faint"> · {atCloseLabel(session.breadth_date)}</span> : null}
            </p>
          )}
          <MarketPulseCard overview={overview} />
          {overview.as_of_date && <p className="text-xs text-foreground-muted">Index figures as of {formatShortDate(`${overview.as_of_date}T00:00:00Z`)}.</p>}
        </>
      )}
    </section>
  );
}
