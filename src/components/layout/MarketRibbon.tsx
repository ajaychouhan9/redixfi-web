"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import type { MarketOverview } from "@/lib/api/types";
import { FreshnessDot } from "@/components/ui/FreshnessDot";
import { DeltaValue } from "@/components/ui/DeltaValue";

const POLL_MS = 60_000;

export function MarketRibbon() {
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [fresh, setFresh] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const env = await apiGet<MarketOverview>("/market/overview");
        if (!cancelled) {
          setOverview(env.data);
          setFresh(env.meta.data_fresh);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (error && !overview) {
    return (
      <div className="flex h-10 items-center border-b border-border bg-surface px-4 text-xs text-foreground-muted">
        Market data unavailable right now.
      </div>
    );
  }

  if (!overview) {
    return <div className="h-10 animate-pulse border-b border-border bg-surface" />;
  }

  const volatile = overview.india_vix_change_pct > 5;
  const eventRisk = overview.news_today.items_flagged_high > 0;

  return (
    <div className="flex h-10 items-center gap-4 overflow-x-auto whitespace-nowrap border-b border-border bg-surface px-4 text-xs">
      <StateChip state={overview.market_state} />
      <span className="font-medium text-foreground-muted">NIFTY</span>
      <span className="tabular-nums">{overview.nifty.close.toLocaleString("en-IN")}</span>
      <DeltaValue value={overview.nifty.change_pct} kind="pct" />
      <span className="font-medium text-foreground-muted">BANKNIFTY</span>
      <span className="tabular-nums">{overview.banknifty.close.toLocaleString("en-IN")}</span>
      <DeltaValue value={overview.banknifty.change_pct} kind="pct" />
      {volatile && (
        <span className="rounded-full bg-amber-bg px-2 py-0.5 font-medium text-amber">Volatility elevated</span>
      )}
      {eventRisk && (
        <span className="rounded-full bg-amber-bg px-2 py-0.5 font-medium text-amber">
          {overview.news_today.items_flagged_high} high-severity event(s) today
        </span>
      )}
      <span className="ml-auto flex items-center gap-3">
        <FreshnessDot fresh={fresh} />
      </span>
    </div>
  );
}

function StateChip({ state }: { state: string }) {
  const label = state === "OPEN" ? "Market open" : state === "PRE-OPEN" ? "Pre-open" : "Market closed";
  const tone = state === "OPEN" ? "bg-up-bg text-up" : "bg-neutral-bg text-neutral";
  return <span className={`rounded-full px-2 py-0.5 font-semibold ${tone}`}>{label}</span>;
}
