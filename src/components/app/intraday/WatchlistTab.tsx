"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getWatchlist } from "@/lib/api/mutations";

// GET /intraday/watchlist-states from the screen spec doesn't exist in the
// live API yet (verified: 404) — Task 04's classify_behavior only feeds
// alert_worker's internal cache, never a read endpoint. Rather than fake
// behavior states, this shows the watchlist itself and says so plainly.
export function WatchlistTab() {
  const { user, getToken } = useAuth();
  const [symbols, setSymbols] = useState<string[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const wl = await getWatchlist(token);
      setSymbols(wl.symbols);
    })();
  }, [user, getToken]);

  if (!user) {
    return (
      <p className="text-sm text-foreground-muted">
        <Link href="/login" className="font-medium text-accent">
          Log in
        </Link>{" "}
        to see behavior states on stocks you&apos;re watching.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs text-amber">
        Live behavior-state tracking (sustaining / fading / reversed) isn&apos;t wired to a read endpoint in this build
        yet — showing your watchlist symbols only.
      </p>
      {symbols === null ? (
        <p className="text-sm text-foreground-muted">Loading…</p>
      ) : symbols.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          Your watchlist is empty.{" "}
          <Link href="/signals" className="font-medium text-accent">
            Browse signals
          </Link>{" "}
          to add stocks.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {symbols.map((s) => (
            <li key={s}>
              <Link href={`/signals/${s}`} className="block py-2 text-sm font-medium hover:text-accent">
                {s}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
