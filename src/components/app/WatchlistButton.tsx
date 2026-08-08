"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/api/mutations";

/**
 * Copy fix (2026-08-08 threshold-alerts audit): this button's label used
 * to say "🔔 Alert me on changes" — but this component only ever toggles
 * WATCHLIST membership; it doesn't create any kind of alert or threshold
 * rule. That copy was accurate in spirit (watchlist membership does gate
 * the 5 existing broadcast-style alert triggers — signal-delta, news,
 * behavior-state — via alerts_opt_in) but read as if clicking it opens a
 * real alert-creation flow, which never existed. Reworded to describe
 * what this button actually does; the genuine alert-creation flow is
 * AlertCreateButton (src/components/app/alerts/), a separate control.
 */
export function WatchlistButton({ symbol }: { symbol: string }) {
  const { user, getToken } = useAuth();
  const router = useRouter();
  const [inWatchlist, setInWatchlist] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const wl = await getWatchlist(token);
      setInWatchlist(wl.symbols.includes(symbol));
    })();
  }, [user, symbol, getToken]);

  async function toggle() {
    if (!user) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) return;
      if (inWatchlist) {
        await removeFromWatchlist(token, symbol);
        setInWatchlist(false);
      } else {
        await addToWatchlist(token, symbol);
        setInWatchlist(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent disabled:opacity-50"
    >
      {inWatchlist ? "★ On watchlist" : "☆ Add to watchlist"}
    </button>
  );
}
