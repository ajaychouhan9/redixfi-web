"use client";

import { useEffect, useState } from "react";

import { DeltaValue } from "@/components/ui/DeltaValue";
import { getIntradayCheck, searchResearch } from "@/lib/api/endpoints";
import { getWatchlist } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import type { IntradayCheck, IntradayTabId, ResearchSearchRow } from "@/lib/api/types";

const money = (v: number | null | undefined) => (typeof v === "number" ? `₹${formatNumber(v, 2)}` : "-");

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  );
}

/**
 * "Check a stock" (one liquid stock at a time) on all three Intraday tabs: search by symbol or company name, and for a signed-in user the watchlist as
 * chips. Pre-open: the NSE pre-open price, the previous close and the gap. Live scan: price, change, volume against its usual level so far, the day's
 * average traded price (VWAP) and the price against it as a plain signed percentage in neutral colour. After close: the last price and NSE's official
 * day average. Not part of any list; nothing is sorted or filtered by the average. No Stock Condition value is shown here.
 */
export function CheckStock({ tab }: { tab: IntradayTabId }) {
  const { user, getToken } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ResearchSearchRow[]>([]);
  const [watch, setWatch] = useState<string[]>([]);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [data, setData] = useState<IntradayCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) {
      setWatch([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const w = await getWatchlist(token);
        if (alive) setWatch(w.symbols.slice(0, 8));
      } catch {
        /* no chips */
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, getToken]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(() => {
      searchResearch(term, 6)
        .then((env) => !cancelled && setResults(env.data))
        .catch(() => !cancelled && setResults([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q]);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setBusy(true);
    setFailed(false);
    getIntradayCheck(symbol, tab)
      .then((env) => !cancelled && setData(env.data))
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [symbol, tab]);

  const choose = (s: string) => {
    setSymbol(s);
    setQ("");
    setResults([]);
  };
  const chip = "inline-flex min-h-11 items-center rounded-full border border-border px-3 text-xs font-medium text-foreground hover:border-accent";

  return (
    <section className="rounded-xl border border-border bg-surface-raised px-4 py-3" data-testid="check-a-stock">
      <h3 className="text-sm font-semibold text-foreground">Check a stock</h3>
      <label className="mt-2 block">
        <span className="sr-only">Symbol or company name</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Symbol or company name, e.g. RELIANCE"
          autoCapitalize="characters"
          maxLength={40}
          className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
        />
      </label>
      {results.length > 0 && (
        <ul className="mt-1 divide-y divide-border rounded-lg border border-border bg-surface" data-testid="check-results">
          {results.map((r) => (
            <li key={r.canonicalSymbol}>
              <button type="button" onClick={() => choose(r.canonicalSymbol)} className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm hover:bg-hover">
                <span className="min-w-0 truncate">{displayName(r.company_name) || r.canonicalSymbol}</span>
                <span className="shrink-0 text-xs text-foreground-muted">{r.canonicalSymbol}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {watch.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2" data-testid="check-watchlist">
          {watch.map((s) => (
            <button key={s} type="button" onClick={() => choose(s)} className={chip}>
              {s}
            </button>
          ))}
        </div>
      )}
      {symbol && (
        <div className="mt-3" data-testid="check-result">
          {busy && <p className="text-sm text-foreground-muted">Checking {symbol}…</p>}
          {failed && !busy && <p className="text-sm text-foreground-muted">Could not check {symbol} right now.</p>}
          {data && !busy && !failed && data.symbol === symbol && (
            <>
              <p className="text-sm font-semibold text-foreground">
                {displayName(data.name) || data.symbol} <span className="font-normal text-foreground-muted">{data.symbol}</span>
              </p>
              {data.reason ? (
                <p className="mt-1 text-sm text-foreground-muted" data-testid="check-reason">{data.reason}</p>
              ) : data.available === false ? (
                <p className="mt-1 text-sm text-foreground-muted" data-testid="check-reason">{data.note}</p>
              ) : (
                <dl className="mt-1 divide-y divide-border">
                  {tab === "morning" && (
                    <>
                      <Line label="Pre-open price">{money(data.price)}</Line>
                      <Line label="Previous close">{money(data.prev_close)}</Line>
                      <Line label="Gap vs previous close"><DeltaValue value={data.gap_pct ?? null} kind="pct" /></Line>
                    </>
                  )}
                  {tab === "scan" && (
                    <>
                      <Line label="Price">{money(data.price)}</Line>
                      <Line label="Change vs previous close"><DeltaValue value={data.change_pct ?? null} kind="pct" /></Line>
                      <Line label="Volume vs usual so far">{typeof data.volume_vs_usual === "number" ? `${data.volume_vs_usual.toFixed(1)}x` : "-"}</Line>
                      <Line label="Day's average traded price (VWAP)">{money(data.avg_price)}</Line>
                      <Line label="Price vs day's average"><span className="text-foreground" data-testid="check-vs-avg">{data.price_vs_avg_text ?? "-"}</span></Line>
                    </>
                  )}
                  {tab === "recap" && (
                    <>
                      <Line label="Last price">{money(data.price)}</Line>
                      <Line label="Change vs previous close"><DeltaValue value={data.change_pct ?? null} kind="pct" /></Line>
                      <Line label="Day's average traded price (NSE official)">{money(data.avg_price)}</Line>
                      <Line label="Price vs day's average"><span className="text-foreground">{data.price_vs_avg_text ?? "-"}</span></Line>
                    </>
                  )}
                </dl>
              )}
              {!data.reason && data.available !== false && (
                <p className="mt-1 text-[11px] text-foreground-faint">
                  {data.as_of_label}
                  {data.source === "last stored bar" && tab === "scan" ? " · from the last stored bar" : ""}
                </p>
              )}
              {data.note && !data.reason && data.available !== false && <p className="mt-1 text-[11px] text-foreground-muted">{data.note}</p>}
            </>
          )}
        </div>
      )}
      <p className="mt-2 text-[11px] text-foreground-faint">One liquid stock at a time. {data?.disclaimer ?? "Past record of measured data. Not a forecast or a recommendation."}</p>
    </section>
  );
}
