"use client";

/**
 * Volatility ranking — the most and least volatile stocks by the 21-session standard deviation of daily moves.
 *
 * The page renders both lists on the server (first 20 each, what Free and anonymous visitors may read).
 * Signed-in callers on a higher tier reload with their token and can page through more rows; the server
 * decides the range, and a symbol outside it arrives as a locked placeholder with no numbers.
 * Describes past price movement only.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Lock, Search } from "lucide-react";

import { getVolatilityBoard } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { stockPath } from "@/lib/seo/stock-symbol";
import type { VolatilityBoard as Board, VolatilityBoardRow } from "@/lib/api/types";

type Which = "top" | "bottom";
const PAGE = 50;

function move(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function Row({ r }: { r: VolatilityBoardRow }) {
  if (r.locked) {
    return (
      <li className="relative overflow-hidden rounded-lg border border-border px-3 py-2">
        <div className="flex select-none items-center justify-between text-xs opacity-40 blur-[3px]" aria-hidden>
          <span className="font-semibold">{r.symbol}</span>
          <span>•••</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          <Lock size={11} className="text-foreground-faint" />
          <span className="text-[10px] font-medium text-foreground-muted">{r.symbol} · Locked</span>
        </div>
      </li>
    );
  }
  return (
    <li className="rounded-lg border border-border px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-foreground-faint">#{r.vol_rank}</span>
          <Link href={stockPath("/stocks", r.symbol)} className="truncate text-sm font-semibold text-foreground hover:text-accent">
            {r.symbol}
          </Link>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{r.std_21?.toFixed(2)}%</span>
      </div>
      <p className="mt-0.5 pl-11 text-[11px] text-foreground-muted">
        Down {r.down} · Up {r.up} of 21 sessions · Largest {move(r.max_up_pct)} / {move(r.max_down_pct)} · Avg range{" "}
        {r.avg_range_pct == null ? "—" : `${r.avg_range_pct.toFixed(1)}%`}
      </p>
    </li>
  );
}

export function VolatilityBoard({ initialTop, initialBottom }: { initialTop: Board | null; initialBottom: Board | null }) {
  const { user, getToken } = useAuth();
  const [tab, setTab] = useState<Which>("top");
  const [lists, setLists] = useState<Record<Which, Board | null>>({ top: initialTop, bottom: initialBottom });
  const [more, setMore] = useState<Record<Which, boolean>>({ top: false, bottom: false });
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Board | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);

  // Signed-in callers: reload page 1 with their token, so a higher tier sees its larger range.
  const tierKey = user?.tier ?? "";
  useEffect(() => {
    if (!user || user.tier === "free") return;
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        const [top, bottom] = await Promise.all([
          getVolatilityBoard({ which: "top", page: 1, size: PAGE }, { token }),
          getVolatilityBoard({ which: "bottom", page: 1, size: PAGE }, { token }),
        ]);
        if (alive) setLists({ top: top.data, bottom: bottom.data });
      } catch { /* keep the server-rendered lists */ }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierKey]);

  const loadMore = useCallback(async (which: Which) => {
    const cur = lists[which];
    if (!cur) return;
    setMore((m) => ({ ...m, [which]: true }));
    try {
      const token = await getToken();
      const next = Math.floor(cur.rows.length / PAGE) + 1;
      const res = await getVolatilityBoard({ which, page: next, size: PAGE }, { token });
      setLists((l) => ({ ...l, [which]: { ...res.data, rows: [...(l[which]?.rows ?? []), ...res.data.rows] } }));
    } catch { setFailed(true); }
    finally { setMore((m) => ({ ...m, [which]: false })); }
  }, [lists, getToken]);

  // Search by symbol (debounced). Results come from the full ranked list; rows outside the caller's range are locked.
  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true);
      setFailed(false);
      try {
        const token = await getToken();
        const res = await getVolatilityBoard({ which: "top", page: 1, size: 30, q: term }, { token });
        if (mine === seq.current) setFound(res.data);
      } catch { if (mine === seq.current) setFailed(true); }
      finally { if (mine === seq.current) setBusy(false); }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const capped = (lists.top?.cap ?? 20) > 0;

  const renderList = (which: Which) => {
    const b = lists[which];
    if (!b || !b.available) return <p className="text-sm text-foreground-muted">The ranking is not available right now.</p>;
    return (
      <>
        <ul className="space-y-2">{b.rows.map((r) => <Row key={r.symbol} r={r} />)}</ul>
        {b.rows.length < b.total && (
          <button type="button" onClick={() => loadMore(which)} disabled={more[which]}
            className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-xs font-medium text-accent hover:bg-hover disabled:opacity-60">
            {more[which] ? "Loading…" : `Show more (${b.rows.length} of ${b.total.toLocaleString("en-IN")})`}
          </button>
        )}
      </>
    );
  };

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search a symbol</span>
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.toUpperCase())}
          placeholder="Search a symbol, e.g. TCS"
          inputMode="text"
          autoCapitalize="characters"
          maxLength={20}
          className="w-full rounded-lg border border-border bg-surface py-2 pl-8 pr-3 text-sm outline-none focus:border-accent"
        />
      </label>

      {q.trim() ? (
        <div className="mt-4">
          {busy && <p className="text-xs text-foreground-muted">Searching…</p>}
          {failed && !busy && <p className="text-xs text-foreground-muted">Could not search right now.</p>}
          {found && !busy && found.rows.length === 0 && (
            <p className="text-sm text-foreground-muted">
              No ranked stock matches “{q.trim()}”. A stock that is on hold for a corporate action, has limited data, fewer than 21
              stored sessions or trades in the BE or BZ series is not ranked.
            </p>
          )}
          {found && found.rows.length > 0 && <ul className="space-y-2">{found.rows.map((r) => <Row key={r.symbol} r={r} />)}</ul>}
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Which list" className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1 sm:hidden">
            {(["top", "bottom"] as Which[]).map((w) => (
              <button key={w} type="button" role="tab" aria-selected={tab === w} onClick={() => setTab(w)}
                className={clsx("rounded-md px-2 py-1.5 text-xs font-medium", tab === w ? "bg-accent text-accent-foreground" : "text-foreground-muted")}>
                {w === "top" ? "Most volatile" : "Least volatile"}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <section className={clsx(tab === "top" ? "block" : "hidden", "min-w-0 sm:block")} aria-labelledby="vol-top">
              <h2 id="vol-top" className="mb-2 text-sm font-semibold">Most volatile{capped ? " — top 20" : ""}</h2>
              {renderList("top")}
            </section>
            <section className={clsx(tab === "bottom" ? "block" : "hidden", "min-w-0 sm:block")} aria-labelledby="vol-bottom">
              <h2 id="vol-bottom" className="mb-2 text-sm font-semibold">Least volatile{capped ? " — bottom 20" : ""}</h2>
              {renderList("bottom")}
            </section>
          </div>

          {capped && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <p className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                <Lock size={12} className="text-foreground-faint" />
                The full ranked list is included with Pro.
              </p>
              <Link href="/pricing" className="text-[11px] font-medium text-accent">See plans →</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
