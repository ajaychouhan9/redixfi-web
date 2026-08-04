"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/lib/api/client";
import { getSignalDetail, getWatchlistStates } from "@/lib/api/endpoints";
import { getWatchlist, addToWatchlist, removeFromWatchlist, getPortfolioBrief, getPortfolioAnalytics } from "@/lib/api/mutations";
import { PortfolioBriefCard, PortfolioAnalyticsCard } from "@/components/app/account/PortfolioCards";
import { Chip } from "@/components/ui/Chip";
import { DeltaValue } from "@/components/ui/DeltaValue";
import type { PortfolioAnalytics, PortfolioBrief, SignalDetail, WatchlistBehaviorRow } from "@/lib/api/types";

const BEHAVIOR_LABELS: Record<string, { label: string; tone: "up" | "down" | "neutral" }> = {
  sustaining: { label: "Sustaining", tone: "up" },
  fading: { label: "Fading", tone: "down" },
  no_data: { label: "No data", tone: "neutral" },
};

interface WatchlistRow {
  symbol: string;
  company_name: string | null;
  industry: string | null;
  composite_score: number | null;
  delta_1d: number | null;
  locked: boolean;
  behavior: WatchlistBehaviorRow | null;
}

/**
 * "THE product" for the long-term-holder persona (master context), not a
 * minor feature — this is the standalone, main-product-surface view.
 * /account/watchlist stays the lighter "management" list. Both share the
 * same underlying data/mutations (getWatchlist, add/removeFromWatchlist)
 * and, for the brief + analytics blocks, the EXACT SAME components
 * (PortfolioBriefCard/PortfolioAnalyticsCard from account/PortfolioCards)
 * already built for /account/portfolio — reused here rather than
 * reimplemented, per the "don't duplicate state" instruction.
 *
 * The per-row score/delta/industry can't come from a single bulk endpoint
 * (GET /signals has no exact-symbol-list filter, and its own pagination
 * cap of 200 can't guarantee covering a watchlist scattered across the
 * full ~750-symbol A–Z universe), so this fetches GET /signals/{symbol}
 * per watchlist symbol in parallel — correct for any watchlist size in
 * practice (tier-capped at 10/50) and reuses the same per-symbol B8
 * masking every other page already depends on.
 */
export function WatchlistMainView() {
  const { user, getToken } = useAuth();
  const [symbols, setSymbols] = useState<string[] | null>(null);
  const [limit, setLimit] = useState<number>(10);
  const [rows, setRows] = useState<WatchlistRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [brief, setBrief] = useState<PortfolioBrief | null>(null);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [addInput, setAddInput] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const wl = await getWatchlist(token);
    setSymbols(wl.symbols);
    setLimit(wl.limit);
    getPortfolioBrief(token).then(setBrief).catch(() => setBrief(null));
    getPortfolioAnalytics(token).then(setAnalytics).catch(() => setAnalytics(null));
  }, [getToken]);

  useEffect(() => {
    if (!user) return;
    reload();
  }, [user, reload]);

  useEffect(() => {
    if (!user || symbols === null) return;
    if (symbols.length === 0) {
      setRows([]);
      setRowsLoading(false);
      return;
    }
    let cancelled = false;
    setRowsLoading(true);
    (async () => {
      const token = await getToken();
      if (!token) return;
      const [statesEnv, ...detailResults] = await Promise.all([
        getWatchlistStates({ token }).catch(() => ({ data: [] as WatchlistBehaviorRow[] })),
        ...symbols.map((s) => getSignalDetail(s, 1, { token }).catch(() => null)),
      ]);
      if (cancelled) return;
      const behaviorBySymbol = new Map(statesEnv.data.map((r) => [r.symbol, r]));
      const next: WatchlistRow[] = symbols.map((sym, i) => {
        const detail = detailResults[i]?.data as SignalDetail | undefined;
        return {
          symbol: sym,
          company_name: detail?.company_name ?? null,
          industry: detail?.industry ?? null,
          composite_score: detail?.locked ? null : detail?.composite_score ?? null,
          delta_1d: detail?.locked ? null : detail?.delta_1d ?? null,
          locked: detail?.locked ?? false,
          behavior: behaviorBySymbol.get(sym) ?? null,
        };
      });
      setRows(next);
      setRowsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, symbols, getToken]);

  async function handleAdd() {
    const sym = addInput.trim().toUpperCase();
    if (!sym) return;
    setAddBusy(true);
    setAddError(null);
    try {
      const token = await getToken();
      if (!token) return;
      await addToWatchlist(token, sym);
      setAddInput("");
      await reload();
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : "Couldn't add that symbol.");
    } finally {
      setAddBusy(false);
    }
  }

  async function handleRemove(symbol: string) {
    const token = await getToken();
    if (!token) return;
    await removeFromWatchlist(token, symbol);
    await reload();
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-6 text-center">
        <p className="text-sm text-foreground-muted">
          Log in to build a watchlist — alerts, your portfolio brief and portfolio analytics are all built from it.
        </p>
        <Link href="/login" className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Your Watchlist</h1>
        {symbols !== null && (
          <span className="font-mono text-xs text-foreground-faint">
            {symbols.length}/{limit}
          </span>
        )}
      </div>
      <p className="text-xs text-foreground-faint">
        The stocks RedixFi watches for you — alerts, portfolio analytics and your personalized brief are all built from this list.
      </p>

      <div className="flex items-center gap-2">
        <input
          value={addInput}
          onChange={(e) => setAddInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a symbol (e.g. RELIANCE)"
          disabled={addBusy}
          className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={addBusy || !addInput.trim()}
          className="flex items-center gap-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {addError && <p className="text-xs text-down">{addError}</p>}

      <PortfolioBriefCard brief={brief} />

      {analytics ? (
        <PortfolioAnalyticsCard data={analytics} />
      ) : (
        <p className="text-sm text-foreground-muted">Loading portfolio analytics…</p>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-foreground-faint">
                <th className="px-4 py-3">Symbol</th>
                <th className="hidden px-3 py-3 sm:table-cell">Industry</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Behavior</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {symbols === null || rowsLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-foreground-muted">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-foreground-muted">
                    No stocks yet.{" "}
                    <Link href="/signals" className="font-medium text-accent">
                      Browse the Signal Dashboard
                    </Link>{" "}
                    to add some.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const behavior = r.behavior ? BEHAVIOR_LABELS[r.behavior.state] ?? BEHAVIOR_LABELS.no_data : null;
                  return (
                    <tr key={r.symbol} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/signals/${r.symbol}`} className="flex items-center gap-1.5 font-mono font-semibold hover:text-accent">
                          {r.symbol}
                        </Link>
                        <div className="text-xs text-foreground-faint">{r.company_name ?? "—"}</div>
                      </td>
                      <td className="hidden px-3 py-3 text-xs text-foreground-muted sm:table-cell">{r.industry ?? "—"}</td>
                      <td className="px-3 py-3">
                        {r.locked ? (
                          <span className="text-xs text-foreground-faint">Locked</span>
                        ) : r.composite_score === null ? (
                          <span className="text-xs text-foreground-faint">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold">{r.composite_score}</span>
                            {r.delta_1d !== null && <DeltaValue value={r.delta_1d} className="text-[11px]" />}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {behavior ? (
                          <Chip tone={behavior.tone}>{behavior.label}</Chip>
                        ) : (
                          <span className="text-xs text-foreground-faint">Not available</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemove(r.symbol)}
                          aria-label={`Remove ${r.symbol} from watchlist`}
                          className="text-xs font-medium text-foreground-faint hover:text-down"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rows.some((r) => r.behavior?.state === "sustaining" || r.behavior?.state === "fading") && (
        <p className="flex items-start gap-1.5 text-xs text-foreground-faint">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          Behavior states describe intraday participation on stocks you&apos;re watching — factual, not a prediction.
        </p>
      )}
    </div>
  );
}
