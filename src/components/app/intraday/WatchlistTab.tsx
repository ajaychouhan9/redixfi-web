"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getWatchlistStates } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { intradayPointsLine } from "@/lib/intraday-points";
import { DeltaValue } from "@/components/ui/DeltaValue";
import type { WatchlistBehaviorRow } from "@/lib/api/types";
import { stockPath } from "@/lib/seo/stock-symbol";
import { displayName } from "@/lib/company-name";

export function WatchlistTab() {
  const { user, getToken } = useAuth();
  const [rows, setRows] = useState<WatchlistBehaviorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setError(null);
      const token = await getToken();
      if (!token) return;
      try {
        const env = await getWatchlistStates({ token });
        if (!cancelled) setRows(env.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load the watchlist.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  if (!user) {
    return (
      <p className="text-sm text-foreground-muted">
        <Link href="/login" className="font-medium text-accent">
          Log in
        </Link>{" "}
        to see intraday readings for stocks you&apos;re watching.
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-down">{error}</p>;
  }

  return (
    <div>
      <p className="mb-2 text-xs text-foreground-faint">
        The change from the day&apos;s open at two points of the session, for the stocks you&apos;re watching. Measured, not a prediction.
      </p>
      {rows === null ? (
        <p className="text-sm text-foreground-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          Your watchlist is empty.{" "}
          <Link href="/signals" className="font-medium text-accent">
            Browse signals
          </Link>{" "}
          to add stocks.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const line = intradayPointsLine(r.points ?? null);
            return (
              <li key={r.symbol}>
                <Link href={stockPath("/signals", r.symbol)} className="flex items-center justify-between py-2 text-sm hover:text-accent">
                  <span>
                    <span className="font-medium">{r.symbol}</span>{" "}
                    <span className="text-foreground-faint">{displayName(r.company_name)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    {r.last_price !== null && <span className="tabular-nums text-foreground-muted">₹{r.last_price.toLocaleString("en-IN")}</span>}
                    {r.day_pct !== null && <DeltaValue value={r.day_pct} kind="pct" />}
                    <span className="hidden text-xs text-foreground-muted sm:inline">{line ?? "Under three 15-minute candles so far"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
