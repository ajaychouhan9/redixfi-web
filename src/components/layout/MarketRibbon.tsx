"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, User } from "lucide-react";
import { getMarketOverview } from "@/lib/api/endpoints";
import type { MarketOverview } from "@/lib/api/types";
import { FreshnessDot } from "@/components/ui/FreshnessDot";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AskRedixFi } from "@/components/app/ask/AskRedixFi";
import { useAuth } from "@/lib/auth/AuthContext";

const POLL_MS = 60_000;

/**
 * CLS fix (2026-08-08) — this ribbon sits directly above `<main>` in
 * app/(app)/layout.tsx's shared flex column, and used to start every
 * render with `overview: null` (a small pulse skeleton), fetching
 * `/market/overview` purely client-side. Once that fetch resolved a few
 * hundred ms later, the ribbon grew from a slim placeholder to its full
 * multi-badge width/height, pushing `<main>` down — Lighthouse's
 * layout-shifts audit attributed essentially the entire measured CLS
 * (0.249, "needs improvement") to `<main>` itself, even though `<main>`'s
 * OWN content never changed — it just moved because its sibling above it
 * grew. Root-caused via Lighthouse's `layout-shifts` audit + reading
 * layout.tsx to confirm the DOM structure matched the flagged element's
 * selector exactly (`body > div.flex > div.flex > main.mb-14`).
 *
 * Fix: `layout.tsx` now fetches the SAME public, unauthenticated
 * `/market/overview` (already confirmed `@auth public` — identical for
 * every tier, no cloaking-relevant branch) server-side, once per request,
 * and seeds this component with real initial data — same `initial*`-prop
 * convention already established for EventRiskCard/SignalUnlockGate/
 * ResearchViewGate. The client-side poll below is UNCHANGED (still
 * refreshes every 60s for a long-lived tab) — this only removes the
 * skeleton flash on FIRST paint, which is what was causing the shift.
 */
export function MarketRibbon({
  initialOverview = null,
  initialFresh = true,
  initialSignalsAsOf = null,
}: {
  initialOverview?: MarketOverview | null;
  initialFresh?: boolean;
  initialSignalsAsOf?: string | null;
}) {
  const { user } = useAuth();
  const [overview, setOverview] = useState<MarketOverview | null>(initialOverview);
  const [fresh, setFresh] = useState(initialFresh);
  const [signalsAsOf, setSignalsAsOf] = useState<string | null>(initialSignalsAsOf);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const env = await getMarketOverview();
        if (!cancelled) {
          setOverview(env.data);
          setFresh(env.meta.data_fresh);
          setSignalsAsOf(env.meta.signals_as_of ?? null);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }
    // Initial data already came from the server (initialOverview) — the
    // first client-side call is the 60s-later refresh, not a duplicate
    // of work layout.tsx already did.
    const id = setInterval(load, POLL_MS);
    if (!initialOverview) load();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const volatile = !!overview && overview.india_vix_change_pct > 5;
  const eventRisk = !!overview && overview.news_today.items_flagged_high > 0;

  return (
    <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 text-xs sm:px-6">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {error && !overview && <span className="text-foreground-muted">Market data unavailable right now.</span>}
        {!overview && !error && <span className="h-4 w-40 animate-pulse rounded bg-hover" />}
        {overview && (
          <>
            <StateChip state={overview.market_state} />
            <span className="flex items-center gap-2 font-mono">
              <span className="font-sans font-medium text-foreground-muted">NIFTY</span>
              <span className="tabular-nums">{overview.nifty.close.toLocaleString("en-IN")}</span>
              <DeltaValue value={overview.nifty.change_pct} kind="pct" />
            </span>
            <span className="hidden items-center gap-2 font-mono sm:flex">
              <span className="font-sans font-medium text-foreground-muted">BANKNIFTY</span>
              <span className="tabular-nums">{overview.banknifty.close.toLocaleString("en-IN")}</span>
              <DeltaValue value={overview.banknifty.change_pct} kind="pct" />
            </span>
            {volatile && <span className="rounded-full bg-amber-bg px-2 py-0.5 font-medium text-amber">Volatility elevated</span>}
            {eventRisk && (
              <span className="rounded-full bg-amber-bg px-2 py-0.5 font-medium text-amber">
                {overview.news_today.items_flagged_high} high-severity event(s) today
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-foreground-faint sm:gap-3">
        {/* Task 10 A3: signals_as_of tells the user which session's
            composite scores they're looking at (e.g. "Scores as of 21 Jul
            close") — measured_signals now runs post-close (16:30), so
            "today" vs "yesterday" is no longer obvious from the clock alone. */}
        {signalsAsOf && <span className="hidden font-mono md:inline">{signalsAsOf}</span>}
        {overview && <FreshnessDot fresh={fresh} />}

        <AskRedixFi />

        <Link href="/account/inbox" aria-label="Inbox" className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-hover">
          <Bell size={13} />
        </Link>

        {user && (
          <Link
            href="/account"
            className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase"
            style={
              user.tier === "free"
                ? { background: "var(--down-bg)", color: "var(--down)" }
                : { background: "var(--up-bg)", color: "var(--up)" }
            }
          >
            <User size={10} /> {user.tier}
          </Link>
        )}

        <ThemeToggle />
      </div>
    </div>
  );
}

function StateChip({ state }: { state: string }) {
  const label = state === "OPEN" ? "Market open" : state === "PRE-OPEN" ? "Pre-open" : "Market closed";
  const tone = state === "OPEN" ? "bg-up-bg text-up" : "bg-neutral-bg text-neutral";
  return <span className={`rounded-full px-2 py-0.5 font-semibold ${tone}`}>{label}</span>;
}
