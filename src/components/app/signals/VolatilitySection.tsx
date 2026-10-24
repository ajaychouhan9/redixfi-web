"use client";

/**
 * Volatility — collapsible section on the stock page, directly under Score history.
 *
 * Describes PAST price movement only: how many sessions closed up or down, the average and largest daily
 * moves and the average daily range, measured once per trading day on prices adjusted for splits, bonus
 * issues and consolidations. The server decides what each tier may read; a window the caller cannot read
 * arrives as a locked placeholder with no numbers. A stock that is not ranked shows the server's note
 * instead of numbers.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronDown, Lock } from "lucide-react";

import { VolatilityRankLines } from "@/components/app/signals/VolatilityRankLines";
import { getVolatility } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatShortDate } from "@/lib/format";
import type { VolatilityResponse, VolatilityWindow } from "@/lib/api/types";

const WINDOW_ORDER: { key: "w21" | "w15" | "w5"; sessions: number }[] = [
  { key: "w21", sessions: 21 },
  { key: "w15", sessions: 15 },
  { key: "w5", sessions: 5 },
];

export function fmtMove(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function MoveBars({ moves }: { moves: [string, number][] }) {
  if (moves.length < 2) return null;
  const W = 300, H = 64, P = 4;
  // One scale for every bar, clipped at ±10% so a single large day does not flatten the rest.
  const cap = Math.max(2, Math.min(10, Math.max(...moves.map(([, v]) => Math.abs(v)))));
  const mid = H / 2;
  const slot = (W - 2 * P) / moves.length;
  const barW = Math.max(2, slot - 2);
  return (
    <div className="mb-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" preserveAspectRatio="none" aria-hidden>
        <line x1={P} x2={W - P} y1={mid} y2={mid} stroke="currentColor" className="text-border" strokeWidth="1" />
        {moves.map(([d, v], i) => {
          const h = Math.max(1, (Math.min(Math.abs(v), cap) / cap) * (mid - P));
          return (
            <rect
              key={d}
              x={P + i * slot + (slot - barW) / 2}
              y={v >= 0 ? mid - h : mid}
              width={barW}
              height={h}
              className={v > 0 ? "fill-up" : v < 0 ? "fill-down" : "fill-neutral"}
            />
          );
        })}
      </svg>
      <p className="mt-1 flex items-center justify-between text-[10px] text-foreground-faint">
        <span>{formatShortDate(moves[0][0])}</span>
        <span>Daily close-to-close moves (scale ±{cap.toFixed(0)}%)</span>
        <span>{formatShortDate(moves[moves.length - 1][0])}</span>
      </p>
      <p className="sr-only">
        Daily closing moves over the last {moves.length} sessions, from {fmtMove(moves[0][1])} on{" "}
        {formatShortDate(moves[0][0])} to {fmtMove(moves[moves.length - 1][1])} on{" "}
        {formatShortDate(moves[moves.length - 1][0])}.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] text-foreground-faint">{label}</dt>
      <dd className="text-xs font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function WindowCard({ sessions, w }: { sessions: number; w: VolatilityWindow | null | undefined }) {
  if (!w) return null;
  if (w.locked) {
    return (
      <li className="relative overflow-hidden rounded-lg border border-border px-3 py-3">
        <div className="select-none text-xs opacity-40 blur-[3px]" aria-hidden>
          <p className="font-medium">Last {sessions} sessions</p>
          <p className="mt-1">Down on •• of {sessions} sessions · •••</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          <Lock size={11} className="text-foreground-faint" />
          <span className="text-[10px] font-medium text-foreground-muted">
            Last {sessions} sessions · Locked · {w.unlock ?? "Pro"}
          </span>
        </div>
      </li>
    );
  }
  return (
    <li className="rounded-lg border border-border px-3 py-2">
      <p className="text-xs font-semibold text-foreground">Last {sessions} sessions</p>
      <p className="mt-0.5 text-[12px] text-foreground-muted">
        Down on {w.down} of {sessions} sessions, up on {w.up}
        {w.flat ? `, unchanged on ${w.flat}` : ""}.
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
        <Stat label="Average up move" value={fmtMove(w.avg_up_pct)} />
        <Stat label="Average down move" value={fmtMove(w.avg_down_pct)} />
        <Stat label="Largest up move" value={fmtMove(w.max_up_pct)} />
        <Stat label="Largest down move" value={fmtMove(w.max_down_pct)} />
        <Stat label="Average daily range" value={w.avg_range_pct == null ? "—" : `${w.avg_range_pct.toFixed(2)}%`} />
      </dl>
    </li>
  );
}

export function VolatilitySection({ symbol }: { symbol: string }) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<VolatilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Fetch once per symbol when first opened; getToken is read through a ref so a profile refresh cannot
  // cancel the in-flight request.
  const startedRef = useRef(false);
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    let alive = true;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const token = await getTokenRef.current();
        const res = await getVolatility(symbol, { token });
        if (alive) setData(res.data);
      } catch {
        if (alive) setFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, symbol]);

  const ranked = !!data && data.available && data.eligible && !data.locked;
  const lockedWindows = ranked ? WINDOW_ORDER.filter((o) => data?.windows?.[o.key]?.locked) : [];

  return (
    <section className="mt-3 rounded-xl border border-border bg-surface-raised shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`volatility-${symbol}`}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">Volatility</span>
          <span className="block text-[11px] text-foreground-faint">
            {ranked ? data?.band_text : "Past price movement over the last 21 sessions"}
          </span>
        </span>
        <ChevronDown size={16} className={clsx("shrink-0 text-foreground-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id={`volatility-${symbol}`} className="border-t border-border px-4 pb-4 pt-3">
          {loading && <p className="text-xs text-foreground-muted">Loading…</p>}
          {failed && !loading && <p className="text-xs text-foreground-muted">Could not load volatility right now.</p>}

          {data?.locked && (
            <p className="text-xs text-foreground-muted">Volatility is available on the full stock page for this symbol.</p>
          )}

          {data && !data.locked && !data.available && (
            <p className="text-xs text-foreground-muted">{data.note ?? "Volatility has not been measured for this stock yet."}</p>
          )}

          {data && !data.locked && data.available && !data.eligible && (
            <p className="text-xs text-foreground-muted">{data.note}</p>
          )}

          {ranked && data && (
            <>
              <p className="text-[11px] text-foreground-faint">Data as of {formatShortDate(data.as_of ?? "")}</p>
              <div className="mt-2"><VolatilityRankLines data={data} /></div>

              <div className="mt-3">
                <MoveBars moves={data.moves ?? []} />
              </div>

              <ul className="space-y-2">
                {WINDOW_ORDER.map((o) => (
                  <WindowCard key={o.key} sessions={o.sessions} w={data.windows?.[o.key]} />
                ))}
              </ul>

              {lockedWindows.length > 0 && data.next_tier && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                    <Lock size={12} className="text-foreground-faint" />
                    Upgrade to {data.next_tier} to read more windows.
                  </p>
                  <Link href="/pricing" className="text-[11px] font-medium text-accent">Upgrade →</Link>
                </div>
              )}
            </>
          )}

          {ranked && (
            <p className="mt-3 text-[11px] text-foreground-muted">
              Average daily range: the average gap between a day&apos;s high and low, which shows movement inside the day.
            </p>
          )}

          {data && !data.locked && (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-foreground-faint">
              <span>{data.disclaimer}</span>
              <span aria-hidden>·</span>
              <Link href="/volatility#how" className="text-accent underline decoration-dotted underline-offset-2">
                How volatility is measured
              </Link>
              <span aria-hidden>·</span>
              <Link href="/volatility" className="text-accent underline decoration-dotted underline-offset-2">
                Volatility ranking
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
