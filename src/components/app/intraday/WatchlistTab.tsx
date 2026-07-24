"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getWatchlistStates } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { Chip } from "@/components/ui/Chip";
import { DeltaValue } from "@/components/ui/DeltaValue";
import type { WatchlistBehaviorRow } from "@/lib/api/types";

// GET /intraday/watchlist-states now exists (built in the Task 11 gap-fill
// session) — reuses alert_worker.classify_behavior() unchanged, which only
// ever returns "sustaining" | "fading" | null ("no_data" here). "Reversed"
// appears in the screen spec's prose but is not a value this endpoint
// produces — deliberately absent from BEHAVIOR_LABELS below, not an
// oversight.
const BEHAVIOR_LABELS: Record<string, { label: string; tone: "up" | "down" | "neutral" }> = {
  sustaining: { label: "Sustaining", tone: "up" },
  fading: { label: "Fading", tone: "down" },
  no_data: { label: "No data", tone: "neutral" },
};

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
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load watchlist behavior states.");
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
        to see behavior states on stocks you&apos;re watching.
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-down">{error}</p>;
  }

  return (
    <div>
      <p className="mb-2 text-xs text-foreground-faint">
        Behavior states describe intraday participation on stocks you&apos;re watching — factual, not a prediction.
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
            const behavior = BEHAVIOR_LABELS[r.state] ?? BEHAVIOR_LABELS.no_data;
            return (
              <li key={r.symbol}>
                <Link href={`/signals/${r.symbol}`} className="flex items-center justify-between py-2 text-sm hover:text-accent">
                  <span>
                    <span className="font-medium">{r.symbol}</span>{" "}
                    <span className="text-foreground-faint">{r.company_name}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    {r.last_price !== null && <span className="tabular-nums text-foreground-muted">₹{r.last_price.toLocaleString("en-IN")}</span>}
                    {r.day_pct !== null && <DeltaValue value={r.day_pct} kind="pct" />}
                    <Chip tone={behavior.tone}>{behavior.label}</Chip>
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
