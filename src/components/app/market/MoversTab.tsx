"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { DeltaValue } from "@/components/ui/DeltaValue";
import { useAuth } from "@/lib/auth/AuthContext";
import { getIntradayTab } from "@/lib/api/endpoints";
import type { IntradayTabData, IntradayUniverse } from "@/lib/api/types";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { closedMessage, LIQUID_NOTE } from "@/lib/intraday-copy";
import { VOLUME_STEPS, filterByVolume, volumePillLabel, volumeStepLabel } from "@/lib/intraday-volume-filter";
import { DEFAULT_UNIVERSE, MOVER_UNIVERSES, MOVERS_NOTE, moverRows, moversDateLabel, moversSource, volumeText } from "@/lib/market-today";
import { stockPath } from "@/lib/seo/stock-symbol";

const POLL_MS = 60_000;
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const PHASE_LABEL: Record<string, string> = {
  pre_market: "Before the open",
  live: "Market open",
  post_market: "After the close",
  weekend: "Market closed",
  holiday: "Market closed",
};

/**
 * Movers (17 Nov 2026): the Intraday lists on Market today. Which list shows is decided by the clock on the server (before the open, during the
 * session, after the close; a weekend or holiday shows the last session with its date). Row: company, change, price, volume. Tapping a row opens
 * the stock page. The data is fetched here, in the browser, so the page itself stays static.
 */
export function MoversTab() {
  const { user, loading, getToken } = useAuth();
  const [data, setData] = useState<IntradayTabData | null>(null);
  const [failed, setFailed] = useState(false);
  const [universe, setUniverse] = useState<IntradayUniverse>(DEFAULT_UNIVERSE);
  const [side, setSide] = useState<"up" | "down">("up");
  const [minVol, setMinVol] = useState<number | null>(null);
  const live = useRef(false);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    async function load() {
      try {
        const token = user ? await getToken() : null;
        const opts = token ? { token } : undefined;
        // One read tells the phase; the list for a phase other than the Live scan is a second read.
        const probe = await getIntradayTab("scan", opts);
        let env = probe;
        if (moversSource(probe.data.session.phase) === "morning") env = await getIntradayTab("morning", opts);
        if (cancelled) return;
        live.current = env.data.session.phase === "live";
        setData(env.data);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    void load();
    const id = setInterval(() => {
      if (live.current) void load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const morning = data?.tab === "morning";
  const all = moverRows(data, universe, side);
  const rows = morning ? all : filterByVolume(all.map((r) => ({ ...r, vr: r.ratio })), minVol);
  const dateLabel = moversDateLabel(data);
  const chip = (on: boolean) => `flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${focus} ${on ? "border-accent bg-accent/15 text-foreground" : "border-border text-foreground-muted hover:text-foreground"}`;

  return (
    <section className="space-y-3" aria-labelledby="movers-title" data-testid="movers-tab">
      <div>
        <h2 id="movers-title" className="text-base font-semibold">Movers</h2>
        {data && (
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
            <span className="rounded-full bg-neutral-bg px-2.5 py-0.5 font-semibold text-foreground" data-testid="movers-phase">{PHASE_LABEL[data.session.phase] ?? "Market closed"}</span>
            {dateLabel && <span data-testid="movers-asof">{dateLabel}</span>}
          </p>
        )}
        {data?.session.market_closed && (
          <p className="mt-1 text-sm text-foreground-muted" data-testid="movers-closed">{closedMessage(data.session.closed_reason, data.data_date_label ?? null)}</p>
        )}
      </div>

      {failed && !data && <p className="py-6 text-sm text-foreground-muted" data-testid="movers-unavailable">Movers are unavailable right now. Please try again in a minute.</p>}
      {!data && !failed && <p className="py-6 text-sm text-foreground-muted">Loading…</p>}

      {data && !data.available && <p className="py-6 text-sm text-foreground-muted" data-testid="movers-empty">The lists are not available yet. They are stored from the first update of the session.</p>}

      {data?.available && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="Rises or falls">
              {(["up", "down"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={side === s} onClick={() => setSide(s)} data-testid={`movers-side-${s}`}
                  className={`min-h-11 min-w-[88px] rounded-md px-4 text-sm font-medium ${focus} ${side === s ? "bg-accent/15 text-foreground ring-1 ring-accent" : "text-foreground-muted hover:text-foreground"}`}>
                  {s === "up" ? "Up" : "Down"}
                </button>
              ))}
            </div>
            {!morning && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Universe">
                {MOVER_UNIVERSES.map((u) => (
                  <button key={u.id} type="button" aria-pressed={universe === u.id} onClick={() => setUniverse(u.id)} data-testid={`movers-universe-${u.id}`} className={chip(universe === u.id)}>
                    {u.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!morning && (
            <div role="group" aria-label="Volume against the usual level" data-testid="movers-volume-filter">
              <p className="mb-1 text-xs font-medium text-foreground-muted">{minVol === null ? "Volume against its usual level" : volumeStepLabel(minVol)}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={minVol === null} onClick={() => setMinVol(null)} className={chip(minVol === null)}>All rows</button>
                {VOLUME_STEPS.map((n) => (
                  <button key={n} type="button" aria-pressed={minVol === n} onClick={() => setMinVol(minVol === n ? null : n)} className={chip(minVol === n)} data-testid={`movers-volume-${n}`}>
                    {volumePillLabel(n)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="py-6 text-sm text-foreground-muted" data-testid="movers-list-empty">
              {minVol !== null ? `No listed row has ${volumeStepLabel(minVol).toLowerCase()}.` : "No stock in this group has a change on this side."}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border" data-testid="movers-list">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-border bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                <span>Company</span>
                <span className="text-right">Change</span>
                <span className="w-20 text-right">Price ₹</span>
              </div>
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.symbol}>
                    <Link href={stockPath("/stocks", r.symbol)} data-testid="mover-row" className="block min-h-[56px] px-3 py-2 hover:bg-hover">
                      <span className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4">
                        <span className="min-w-0 truncate text-sm font-semibold">{displayName(r.name) || r.symbol}</span>
                        <span className="text-right text-sm tabular-nums"><DeltaValue value={r.change} kind="pct" /></span>
                        <span className="w-20 text-right text-sm tabular-nums">{r.price == null ? "-" : formatNumber(r.price, 2)}</span>
                      </span>
                      <span className="mt-0.5 flex justify-between gap-3 text-xs text-foreground-muted">
                        <span>{r.symbol}</span>
                        <span data-testid="mover-volume">{morning ? "Volume: -" : `Volume: ${volumeText(r.ratio)}`}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-foreground-muted">{MOVERS_NOTE}</p>
          <p className="text-xs text-foreground-muted">{LIQUID_NOTE}</p>
        </>
      )}
    </section>
  );
}
