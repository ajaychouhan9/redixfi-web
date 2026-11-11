"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountTabs } from "@/components/app/account/AccountTabs";
import { RequireAuth } from "@/components/app/account/RequireAuth";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { getWatchlist, removeFromWatchlist, getWatchlistAnomalies } from "@/lib/api/mutations";
import type { WatchlistResponse, AnomalyFlagDoc } from "@/lib/api/types";
import { stockPath } from "@/lib/seo/stock-symbol";

function WatchlistManager() {
  const { getToken } = useAuth();
  const [wl, setWl] = useState<WatchlistResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyFlagDoc[]>([]);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      setWl(await getWatchlist(token));
      getWatchlistAnomalies(token).then(setAnomalies).catch(() => setAnomalies([]));
    })();
  }, [getToken]);

  async function remove(symbol: string) {
    const token = await getToken();
    if (!token) return;
    const next = await removeFromWatchlist(token, symbol);
    setWl(next);
  }

  if (!wl) return <p className="text-sm text-foreground-muted">Loading…</p>;

  const anomalyBySymbol = new Map(anomalies.map((a) => [a.symbol, a]));
  // Flagged-first is a plain mechanical sort on a disclosed boolean (same
  // symbol carries the same anomaly regardless of who's viewing it) — not
  // a model-curated ranking, so it doesn't trip the CURATION TEST the way
  // an AI-chosen order would.
  const orderedSymbols = [...wl.symbols].sort((a, b) => {
    const af = anomalyBySymbol.has(a) ? 0 : 1;
    const bf = anomalyBySymbol.has(b) ? 0 : 1;
    return af - bf || a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      <Card title={`Watchlist (${wl.symbols.length}/${wl.limit})`}>
      {wl.symbols.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          No stocks yet.{" "}
          <Link href="/signals" className="font-medium text-accent">
            Browse the screener
          </Link>{" "}
          to add some — alerts fire on stocks you watch.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {orderedSymbols.map((s) => {
            const anomaly = anomalyBySymbol.get(s);
            return (
              <li key={s} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Link href={stockPath("/signals", s)} className="font-medium hover:text-accent">
                    {s}
                  </Link>
                  {anomaly && (
                    <span
                      title={anomaly.anomalies.map((a) => a.detail).join(" ")}
                      className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
                    >
                      Unusual activity today
                    </span>
                  )}
                </div>
                <button onClick={() => remove(s)} className="text-xs font-medium text-down">
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
      </Card>
    </div>
  );
}

export default function WatchlistPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Account</h1>
      <AccountTabs />
      <RequireAuth>
        <WatchlistManager />
      </RequireAuth>
    </div>
  );
}
