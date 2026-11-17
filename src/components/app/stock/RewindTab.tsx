"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { runStockwise, type StockwiseDay, type StockwiseStock } from "@/lib/api/history";
import { REWIND_MOVES, REWIND_PERIODS, REWIND_FOOTER, REWIND_INTRO, rewindSummary, rewindRow, type RewindMove, type RewindPeriod } from "@/lib/rewind-simple";

// The full explorer (group by, cards or table, save a filter, CSV) is loaded only if "More options" is opened.
const StockwiseHistory = dynamic(() => import("@/components/app/history/StockwiseHistory").then((m) => m.StockwiseHistory), {
  ssr: false,
  loading: () => <p className="text-sm text-foreground-muted">Loading more options…</p>,
});

const PAGE = 25;

function Choice<T extends string | number>({ label, value, options, onChange, testId }: { label: string; value: T; options: { v: T; text: string }[]; onChange: (v: T) => void; testId: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5" data-testid={testId}>
      <span className="mr-1 text-sm font-medium">{label}</span>
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`min-h-[40px] rounded-lg border px-3 text-sm font-medium ${value === o.v ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground-muted hover:text-foreground"}`}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

/**
 * The Rewind tab of the stock page (17 Nov 2026), free for everyone. Two choices only: the size of the move (2%, 3%, 5%) and the period.
 * The numbers are fetched when the tab is first opened and again when a choice changes (the page itself carries none of this data, so it
 * stays static and cached). Everything else of the old Market Rewind sits under "More options".
 */
export function RewindTab({ symbol }: { symbol: string }) {
  const [move, setMove] = useState<RewindMove>(3);
  const [period, setPeriod] = useState<RewindPeriod>("3y");
  const [stock, setStock] = useState<StockwiseStock | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [shown, setShown] = useState(PAGE);
  const [more, setMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // a new choice starts a new read: show "Loading" and the first page again
    setState("loading"); // eslint-disable-line react-hooks/set-state-in-effect
    setShown(PAGE);
    // @auth-ok: the same public, anonymous history read the old stock Rewind page made (the API returns the same days to everyone).
    runStockwise({ symbols: [symbol], move, direction: "either", period, offsets: [-2, -1, 0], signals: [], match: "all", signal_offset: -1, group: "stock", sort: "newest" })
      .then((env) => {
        if (cancelled) return;
        setStock(env.data.stocks?.[0] ?? null);
        setState("ok");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, move, period]);

  const days: StockwiseDay[] = stock?.days ?? [];
  const rows = days.slice(0, shown).map(rewindRow);

  return (
    <section className="space-y-4" aria-labelledby="rewind-title" data-testid="rewind-tab">
      <div>
        <h2 id="rewind-title" className="text-base font-semibold">Rewind</h2>
        <p className="mt-1 text-sm text-foreground-muted" data-testid="rewind-intro">{REWIND_INTRO}</p>
      </div>
      <div className="space-y-2">
        <Choice label="Move size" value={move} options={REWIND_MOVES.map((v) => ({ v, text: `${v}%` }))} onChange={setMove} testId="rewind-move" />
        <Choice label="Period" value={period} options={REWIND_PERIODS.map((p) => ({ v: p.v, text: p.text }))} onChange={setPeriod} testId="rewind-period" />
      </div>

      {state === "loading" && <p className="text-sm text-foreground-muted" data-testid="rewind-loading">Loading…</p>}
      {state === "error" && <p className="text-sm text-foreground-muted">The past days could not be loaded right now. Try again in a moment.</p>}
      {state === "ok" && !stock && <p className="text-sm text-foreground-muted">No stored history for {symbol} yet.</p>}
      {state === "ok" && stock && (
        <>
          <p className="text-sm font-medium" data-testid="rewind-summary">{rewindSummary(symbol, move, period, stock)}</p>
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] text-sm" data-testid="rewind-table">
                <caption className="sr-only">Days {symbol} moved {move}% or more, with the numbers of the two days before</caption>
                <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-right">Move</th>
                    <th className="px-3 py-2">1 day before</th>
                    <th className="px-3 py-2">2 days before</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.date} className="border-t border-border align-top tabular-nums">
                      <td className="px-3 py-1.5 font-medium">{r.date}</td>
                      <td className="px-3 py-1.5 text-right">{r.move}</td>
                      <td className="px-3 py-1.5 text-xs text-foreground-muted">{r.before1}</td>
                      <td className="px-3 py-1.5 text-xs text-foreground-muted">{r.before2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {days.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground">
              Show {Math.min(PAGE, days.length - shown)} more days
            </button>
          )}
          <p className="text-xs text-foreground-muted">Each number line shows that day&apos;s change, volume against its usual level, and delivery share.</p>
        </>
      )}

      <p className="text-xs text-foreground-muted" data-testid="rewind-footer">{REWIND_FOOTER}</p>

      <div>
        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} data-testid="rewind-more" className="text-sm font-medium text-accent hover:underline">
          {more ? "Hide more options" : "More options"}
        </button>
        <p className="text-xs text-foreground-muted">Group by day, cards or table, save a filter, CSV.</p>
        {more && (
          <div className="mt-3">
            <StockwiseHistory initialSymbol={symbol} />
          </div>
        )}
      </div>
    </section>
  );
}
