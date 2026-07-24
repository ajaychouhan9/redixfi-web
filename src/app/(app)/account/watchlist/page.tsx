"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountTabs } from "@/components/app/account/AccountTabs";
import { RequireAuth } from "@/components/app/account/RequireAuth";
import { Card } from "@/components/ui/Card";
import { WatchlistSummaryCard } from "@/components/app/education/SummaryCard";
import { useAuth } from "@/lib/auth/AuthContext";
import { getWatchlist, removeFromWatchlist, getWatchlistSummary } from "@/lib/api/mutations";
import type { WatchlistResponse, WatchlistSummary } from "@/lib/api/types";

function WatchlistManager() {
  const { getToken } = useAuth();
  const [wl, setWl] = useState<WatchlistResponse | null>(null);
  const [summary, setSummary] = useState<WatchlistSummary | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      setWl(await getWatchlist(token));
      getWatchlistSummary(token).then(setSummary).catch(() => setSummary(null));
    })();
  }, [getToken]);

  async function remove(symbol: string) {
    const token = await getToken();
    if (!token) return;
    const next = await removeFromWatchlist(token, symbol);
    setWl(next);
  }

  if (!wl) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      {summary && <WatchlistSummaryCard data={summary} />}
      <Card title={`Watchlist (${wl.symbols.length}/${wl.limit})`}>
      {wl.symbols.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          No stocks yet.{" "}
          <Link href="/signals" className="font-medium text-accent">
            Browse the Signal Dashboard
          </Link>{" "}
          to add some — alerts fire on stocks you watch.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {wl.symbols.map((s) => (
            <li key={s} className="flex items-center justify-between py-2 text-sm">
              <Link href={`/signals/${s}`} className="font-medium hover:text-accent">
                {s}
              </Link>
              <button onClick={() => remove(s)} className="text-xs font-medium text-down">
                Remove
              </button>
            </li>
          ))}
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
