"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { getIntradaySession, getIntradaySectors, getIntradayRecap } from "@/lib/api/endpoints";
import type { IntradaySession, IntradaySectors, IntradayRecap } from "@/lib/api/types";
import { PremarketTable } from "./PremarketTable";
import { SectorHeatmap } from "./SectorHeatmap";
import { ScannerTab } from "./ScannerTab";
import { EventsTab } from "./EventsTab";
import { WatchlistTab } from "./WatchlistTab";
import { PostmarketRecap } from "./PostmarketRecap";

const POLL_MS = 60_000;
type LiveTab = "scanner" | "events" | "watchlist";

export function IntradayScreen() {
  const [session, setSession] = useState<IntradaySession | null>(null);
  const [sectors, setSectors] = useState<IntradaySectors | null>(null);
  const [recap, setRecap] = useState<IntradayRecap | null>(null);
  const [tab, setTab] = useState<LiveTab>("scanner");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const sessionEnv = await getIntradaySession();
        if (cancelled) return;
        setSession(sessionEnv.data);

        if (sessionEnv.data.state === "premarket") {
          const sectorsEnv = await getIntradaySectors();
          if (!cancelled) setSectors(sectorsEnv.data);
        } else if (sessionEnv.data.state === "postmarket") {
          const recapData = await getIntradayRecap();
          if (!cancelled) setRecap(recapData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (loading && !session) {
    return <p className="text-sm text-foreground-muted">Loading intraday session…</p>;
  }

  if (!session) {
    return <p className="text-sm text-foreground-muted">Intraday data unavailable right now.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <span className="rounded-full bg-neutral-bg px-2.5 py-1 font-semibold text-neutral">
          Session: {session.state === "live" ? "LIVE" : session.state === "premarket" ? "PRE-MARKET" : "CLOSED"}
        </span>
        {session.risk_off && <span className="rounded-full bg-amber-bg px-2.5 py-1 text-amber">Risk-off tone</span>}
        <span className="text-foreground-muted">{session.high_severity_events_today} high-severity event(s) today</span>
      </div>

      {session.state === "premarket" && (
        <>
          <PremarketTable />
          {sectors && <SectorHeatmap sectors={sectors.sectors} />}
        </>
      )}

      {session.state === "live" && (
        <div>
          <div className="mb-3 flex gap-1 border-b border-border">
            {(["scanner", "events", "watchlist"] as LiveTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  "border-b-2 px-3 py-2 text-sm font-medium capitalize",
                  tab === t ? "border-accent text-accent" : "border-transparent text-foreground-muted"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "scanner" && <ScannerTab />}
          {tab === "events" && <EventsTab />}
          {tab === "watchlist" && <WatchlistTab />}
        </div>
      )}

      {session.state === "postmarket" && <PostmarketRecap recap={recap} />}
    </div>
  );
}
