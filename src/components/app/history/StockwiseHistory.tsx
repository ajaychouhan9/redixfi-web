"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Save, Trash2, X } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  deleteSavedFilter,
  downloadStockwiseCsv,
  getHistoryConfig,
  historyErrorMessage,
  listSavedFilters,
  runStockwise,
  saveStockwiseFilter,
  searchHistoryStocks,
  type HistoryConfig,
  type HistoryDirection,
  type SavedFilter,
  type SessionBlock,
  type StockwiseDay,
  type StockwiseParams,
  type StockwiseResult,
  type StockwiseStock,
} from "@/lib/api/history";
import {
  HISTORY_CHANCE_NOTE,
  HISTORY_DISCLAIMER,
  HISTORY_EXAMPLES_TITLE,
  SW_INDEPENDENCE_NOTE,
  SW_INTRO,
  SW_NA,
  SW_NO_DAYS,
  SW_PENDING,
  SW_PRO_ONLY,
  periodText,
  readingsCountLine,
  sameDayLine,
  stockwiseLine,
} from "@/lib/history-copy";
import { saveBlob } from "@/components/app/report/ReportActions";

const BTN =
  "rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";
const FIELD = "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-50";
const CHIP = "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium";
const OFFSETS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
const MOVES = Array.from({ length: 20 }, (_, i) => i + 1);
const READINGS: { key: string; label: string }[] = [
  { key: "trend_up", label: "Trend up (10d)" },
  { key: "above_dma", label: "Above 20-DMA" },
  { key: "volume_high", label: "Volume elevated" },
  { key: "rsi_high", label: "RSI in the upper zone" },
  { key: "delivery_up", label: "Delivery up" },
];
const PAGE = 10;

const offLabel = (k: number) => (k > 0 ? `+${k}` : `${k}`);
const sgn = (v?: number | null, d = 1) => (v == null ? "-" : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`);

function fmtDate(iso?: string | null): string {
  if (!iso) return "Date not available";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "Date not available" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function Block({ b }: { b: SessionBlock }) {
  const head = (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] font-semibold text-foreground">{offLabel(b.offset)}{b.offset === 0 ? " (the day)" : ""}</span>
      {b.status === "ok" && <span className="text-[11px] text-foreground-faint">{b.weekday?.slice(0, 3)} {fmtDate(b.date)}</span>}
    </div>
  );
  const frame = `min-w-0 rounded-lg border p-2 ${b.offset === 0 ? "border-accent/50 bg-hover" : "border-border bg-surface"}`;
  if (b.status !== "ok") {
    return (
      <div className={frame} data-testid="sw-block">
        {head}
        <p className="mt-1 text-xs text-foreground-faint">{b.status === "pending" ? SW_PENDING : SW_NA}</p>
      </div>
    );
  }
  const on = (b.states ?? []).filter((s) => s.on);
  return (
    <div className={frame} data-testid="sw-block">
      {head}
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[12px] leading-snug">
        <dt className="text-foreground-faint">Change</dt>
        <dd className="text-right tabular-nums">{b.change_pct == null ? SW_NA : sgn(b.change_pct, 2)}</dd>
        <dt className="text-foreground-faint">Trend (10d)</dt>
        <dd className="text-right tabular-nums">{sgn(b.trend_10d)}</dd>
        <dt className="text-foreground-faint">Volume, 5-day vs 20-day avg</dt>
        <dd className="text-right tabular-nums">{b.volume_x == null ? "-" : `${b.volume_x.toFixed(2)}x`}</dd>
        <dt className="text-foreground-faint">RSI</dt>
        <dd className="text-right tabular-nums">{b.rsi == null ? "-" : b.rsi.toFixed(0)}</dd>
        <dt className="text-foreground-faint">Delivery</dt>
        <dd className="text-right tabular-nums">{b.delivery_pct == null ? "-" : `${b.delivery_pct.toFixed(0)}%`}</dd>
      </dl>
      {on.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {on.map((s) => (
            <span key={s.key} className="rounded-full bg-neutral-bg px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DayCard({ d, showStock, names }: { d: StockwiseDay; showStock: boolean; names: Record<string, string> }) {
  return (
    <li className="rounded-xl border border-border bg-surface-raised p-3" data-testid="sw-day">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <div className="min-w-0 text-sm font-semibold">
          {showStock && <span className="mr-2">{d.symbol}<span className="ml-1 font-normal text-foreground-faint">{names[d.symbol] && names[d.symbol] !== d.symbol ? names[d.symbol] : ""}</span></span>}
          <span>{d.weekday}, {fmtDate(d.date)}</span>
        </div>
        <div className={`text-sm font-semibold tabular-nums ${d.move_pct >= 0 ? "text-up" : "text-down"}`}>{sgn(d.move_pct, 2)}</div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {d.sessions.map((b) => (
          <Block key={b.offset} b={b} />
        ))}
      </div>
    </li>
  );
}

function StockGroup({ s, p, sort, names, isPro }: { s: StockwiseStock; p: StockwiseParams; sort: "newest" | "largest"; names: Record<string, string>; isPro: boolean }) {
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [s.symbol, sort, s.count]);
  return (
    <section className="space-y-2" data-testid="sw-group">
      <div className="rounded-lg border border-border bg-hover px-3 py-2" data-testid="sw-summary">
        {s.no_history ? (
          <p className="text-sm">{s.symbol}: no history is stored for this stock.</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              {stockwiseLine({ symbol: s.symbol, count: s.count, up: s.up, down: s.down, sessions: s.sessions, move: p.move, direction: p.direction, period: p.period })}
              {s.company_name && s.company_name !== s.symbol ? <span className="ml-1 font-normal text-foreground-faint">{s.company_name}</span> : null}
            </p>
            {s.partial_period && s.first_session && (
              <p className="mt-0.5 text-xs text-foreground-muted">
                Stored history for {s.symbol} starts on {fmtDate(s.first_session)}, which is less than the {periodText(p.period)}.
              </p>
            )}
            {s.with_readings != null && (
              <p className="mt-0.5 text-xs text-foreground-muted" data-testid="sw-readings-count">{readingsCountLine(s.with_readings, s.count, p.signal_offset)}</p>
            )}
          </>
        )}
      </div>
      {!s.no_history && s.days.length === 0 && <p className="px-1 text-sm text-foreground-muted">{SW_NO_DAYS}</p>}
      <ul className="space-y-2">
        {s.days.slice(0, shown).map((d) => (
          <DayCard key={d.date} d={d} showStock={false} names={names} />
        ))}
      </ul>
      {s.days.length > shown && (
        <button type="button" className={BTN} onClick={() => setShown((n) => n + PAGE)} data-testid="sw-more">
          Show more ({Math.min(PAGE, s.days.length - shown)} of {s.days.length - shown} left)
        </button>
      )}
      {s.listed > s.days.length && (
        <p className="text-xs text-foreground-faint">
          Showing {s.days.length} of {s.listed.toLocaleString("en-IN")} days.{isPro ? " The CSV file has all of them." : ""}
        </p>
      )}
    </section>
  );
}

export function StockwiseHistory({ initialSymbol }: { initialSymbol?: string }) {
  const { user, getToken } = useAuth();
  const [cfg, setCfg] = useState<HistoryConfig | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [stocks, setStocks] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [move, setMove] = useState<number | "any">(5);
  const [direction, setDirection] = useState<HistoryDirection>("either");
  const [period, setPeriod] = useState<"1y" | "2y" | "3y">("3y");
  const [offsets, setOffsets] = useState<number[]>([-1, 0, 1]);
  const [signals, setSignals] = useState<string[]>([]);
  const [signalOffset, setSignalOffset] = useState(-1);
  const [matchKind, setMatchKind] = useState<"all" | "any">("all");
  const [anyN, setAnyN] = useState(2);
  const [group, setGroup] = useState<"stock" | "date">("stock");
  const [sort, setSort] = useState<"newest" | "largest">("newest");
  const [result, setResult] = useState<StockwiseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [hits, setHits] = useState<{ symbol: string; company_name: string | null }[]>([]);
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [saveName, setSaveName] = useState("");
  const [tlShown, setTlShown] = useState(PAGE);
  const booted = useRef(false);

  const sw = cfg?.stockwise;
  const maxStocks = sw?.max_stocks ?? 3;
  const isPro = !!cfg?.access.csv;
  const matchValue = signals.length >= 2 && matchKind === "any" ? `any${Math.min(anyN, signals.length)}` : "all";
  const needsCondition = move === "any" && signals.length === 0;

  const bodyFor = useCallback(
    (over?: Partial<{ group: "stock" | "date"; sort: "newest" | "largest" }>) => ({
      symbols: stocks,
      move: move === "any" ? "any" : move,
      direction,
      period,
      offsets: offsets.length ? offsets : [0],
      signals,
      match: matchValue,
      signal_offset: signalOffset,
      group: over?.group ?? group,
      sort: over?.sort ?? sort,
    }),
    [stocks, move, direction, period, offsets, signals, matchValue, signalOffset, group, sort],
  );

  const run = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setMsg(null);
      try {
        const token = user ? await getToken() : null;
        const env = await runStockwise(body, { token });
        setResult(env.data);
        setTlShown(PAGE);
        setNames((n) => ({ ...n, ...Object.fromEntries(env.data.stocks.map((s) => [s.symbol, s.company_name])) }));
      } catch (e) {
        setResult(null);
        setMsg(historyErrorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [user, getToken],
  );

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const token = user ? await getToken() : null;
        const env = await getHistoryConfig({ token });
        if (!live) return;
        setCfg(env.data);
        if (env.data.access.saved_filters && token) listSavedFilters({ token }).then((r) => live && setSaved(r.data.filter((x) => x.kind === "stockwise"))).catch(() => undefined);
        else setSaved([]);
      } catch {
        if (live) setCfgError("The History Explorer is not available right now.");
      }
    })();
    return () => {
      live = false;
    };
  }, [user, getToken]);

  const applyParams = useCallback((q: Partial<StockwiseParams>) => {
    if (q.symbols) setStocks(q.symbols);
    if ("move" in q) setMove(q.move == null ? "any" : q.move);
    setDirection((q.direction as HistoryDirection) || "either");
    setPeriod((q.period as "1y" | "2y" | "3y") || "3y");
    setOffsets(q.offsets && q.offsets.length ? q.offsets : [-1, 0, 1]);
    setSignals(q.signals ?? []);
    setSignalOffset(typeof q.signal_offset === "number" ? q.signal_offset : -1);
    const m = q.match ?? "all";
    setMatchKind(m.startsWith("any") ? "any" : "all");
    if (m.startsWith("any")) setAnyN(Number(m.slice(3)) || 2);
    setGroup(q.group ?? "stock");
    setSort(q.sort ?? "newest");
  }, []);

  const runParams = useCallback(
    (q: Partial<StockwiseParams>) => {
      applyParams(q);
      run({
        symbols: q.symbols ?? [],
        move: q.move == null ? "any" : q.move,
        direction: q.direction ?? "either",
        period: q.period ?? "3y",
        offsets: q.offsets && q.offsets.length ? q.offsets : [-1, 0, 1],
        signals: q.signals ?? [],
        match: q.match ?? "all",
        signal_offset: typeof q.signal_offset === "number" ? q.signal_offset : -1,
        group: q.group ?? "stock",
        sort: q.sort ?? "newest",
      });
    },
    [applyParams, run],
  );

  // first view: the stock from the link, otherwise the first example
  useEffect(() => {
    if (!cfg || booted.current) return;
    booted.current = true;
    const sym = (initialSymbol || "").toUpperCase();
    if (sym) {
      setText("");
      runParams({ symbols: [sym], move: 5, direction: "either", period: "3y" });
      return;
    }
    const first = cfg.stockwise?.examples[0];
    if (first) runParams(first.params);
  }, [cfg, initialSymbol, runParams]);

  // stock search (same resolver as the rest of the History Explorer)
  useEffect(() => {
    const q = text.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      searchHistoryStocks(q).then((r) => live && setHits(r.data)).catch(() => live && setHits([]));
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [text]);

  function addStock(sym: string, name: string | null) {
    setText("");
    setHits([]);
    if (stocks.includes(sym)) return;
    if (stocks.length >= maxStocks) {
      setMsg(`You can choose up to ${maxStocks} stocks.${maxStocks < 10 ? " Pro allows up to 10." : ""}`);
      return;
    }
    setMsg(null);
    setStocks((s) => [...s, sym]);
    if (name) setNames((n) => ({ ...n, [sym]: name }));
  }

  function onShow() {
    if (stocks.length === 0) return setMsg("Choose at least one stock.");
    if (needsCondition) return setMsg("Choose a move size or at least one reading.");
    run(bodyFor());
  }

  function changeView(nextGroup: "stock" | "date", nextSort: "newest" | "largest") {
    setGroup(nextGroup);
    setSort(nextSort);
    if (result) run({ ...bodyFor({ group: nextGroup, sort: nextSort }), symbols: result.params.symbols });
  }

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function onCsv() {
    if (!result) return;
    try {
      const token = await getToken();
      if (!token) return;
      const { blob, filename } = await downloadStockwiseCsv({ ...result.params, group, sort }, token);
      saveBlob(blob, filename ?? "redixfi-history-stockwise.csv");
    } catch (e) {
      setMsg(historyErrorMessage(e));
    }
  }

  async function onSave() {
    if (!result || !saveName.trim()) return;
    try {
      const token = await getToken();
      if (!token) return;
      const r = await saveStockwiseFilter(saveName.trim(), result.params, { token });
      setSaved((s) => [r.data, ...s]);
      setSaveName("");
    } catch (e) {
      setMsg(historyErrorMessage(e));
    }
  }

  async function onDelete(id: string) {
    try {
      const token = await getToken();
      if (!token) return;
      await deleteSavedFilter(id, { token });
      setSaved((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      setMsg(historyErrorMessage(e));
    }
  }

  const resultNames = useMemo(() => names, [names]);
  const p = result?.params;

  if (cfgError) return <p className="text-sm text-foreground-muted" role="alert">{cfgError}</p>;

  return (
    <div className="space-y-5" data-testid="history-stockwise">
      <p className="text-sm text-foreground-muted">{SW_INTRO}</p>

      <section className="rounded-2xl border border-border bg-surface-raised p-4 sm:p-5">
        <h2 className="text-sm font-semibold">{HISTORY_EXAMPLES_TITLE}</h2>
        <div className="mt-2 flex flex-wrap gap-2" data-testid="sw-examples">
          {(sw?.examples ?? []).map((e) => (
            <button key={e.id} type="button" className={`${CHIP} border-border bg-hover text-foreground-muted hover:text-foreground`} onClick={() => runParams(e.params)} disabled={busy}>
              {e.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-4 sm:p-5" data-testid="sw-form">
        <div className="space-y-3">
          <div>
            <span className="text-xs text-foreground-muted">Stocks (up to {maxStocks})</span>
            <div className="mt-1 flex flex-wrap items-center gap-1.5" data-testid="sw-selected">
              {stocks.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full border border-border bg-hover px-2.5 py-1 text-xs font-medium">
                  {s}
                  <button type="button" aria-label={`Remove ${s}`} className="text-foreground-faint hover:text-foreground" onClick={() => setStocks((x) => x.filter((y) => y !== s))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative mt-1.5">
              <input
                className={`${FIELD} w-full`}
                placeholder="Search a stock by name or symbol"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Add a stock"
                data-testid="sw-search"
              />
              {hits.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-surface-raised shadow-md">
                  {hits.map((h) => (
                    <li key={h.symbol}>
                      <button type="button" className="w-full px-3 py-1.5 text-left text-sm hover:bg-hover" onClick={() => addStock(h.symbol, h.company_name)}>
                        {h.symbol} <span className="text-foreground-faint">{h.company_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-foreground-muted">
              Move size
              <select className={`${FIELD} mt-1 block w-full`} value={move} onChange={(e) => setMove(e.target.value === "any" ? "any" : Number(e.target.value))} data-testid="sw-move">
                <option value="any">Any</option>
                {MOVES.map((m) => (
                  <option key={m} value={m}>{m}% or more</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-foreground-muted">
              Direction
              <select className={`${FIELD} mt-1 block w-full`} value={direction} onChange={(e) => setDirection(e.target.value as HistoryDirection)} data-testid="sw-direction">
                <option value="either">Either</option>
                <option value="up">Up</option>
                <option value="down">Down</option>
              </select>
            </label>
            <label className="text-xs text-foreground-muted">
              Period
              <select className={`${FIELD} mt-1 block w-full`} value={period} onChange={(e) => setPeriod(e.target.value as "1y" | "2y" | "3y")} data-testid="sw-period">
                <option value="1y">1 year</option>
                <option value="2y">2 years</option>
                <option value="3y">3 years</option>
              </select>
            </label>
          </div>

          <div>
            <span className="text-xs text-foreground-muted">Sessions to show around each day (the stock&apos;s own trading sessions)</span>
            <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Sessions to show" data-testid="sw-offsets">
              {OFFSETS.map((k) => {
                const on = offsets.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setOffsets((o) => toggle(o, k).sort((a, b) => a - b))}
                    className={`${CHIP} ${k === 0 ? "ml-1 mr-1" : ""} ${on ? "border-accent bg-accent/10 text-foreground" : "border-border bg-hover text-foreground-muted"}`}
                  >
                    {offLabel(k)}
                  </button>
                );
              })}
            </div>
          </div>

          <details className="rounded-lg border border-border bg-surface p-3" data-testid="sw-signals" open={signals.length > 0}>
            <summary className="cursor-pointer text-xs font-medium text-foreground-muted">Readings filter (optional)</summary>
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {READINGS.map((r) => (
                  <label key={r.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={signals.includes(r.key)} onChange={() => setSignals((s) => toggle(s, r.key))} />
                    {r.label}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
                <label>
                  Checked at session{" "}
                  <select className={FIELD} value={signalOffset} onChange={(e) => setSignalOffset(Number(e.target.value))} data-testid="sw-signal-offset">
                    {OFFSETS.map((k) => (
                      <option key={k} value={k}>{offLabel(k)}</option>
                    ))}
                  </select>
                </label>
                {signals.length >= 2 && (
                  <>
                    <label>
                      <select className={FIELD} value={matchKind} onChange={(e) => setMatchKind(e.target.value as "all" | "any")} aria-label="Match">
                        <option value="all">All ticked</option>
                        <option value="any">At least N of the ticked</option>
                      </select>
                    </label>
                    {matchKind === "any" && (
                      <select className={FIELD} value={anyN} onChange={(e) => setAnyN(Number(e.target.value))} aria-label="N">
                        {Array.from({ length: signals.length - 1 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
            </div>
          </details>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className={`${BTN} bg-accent text-accent-foreground`} onClick={onShow} disabled={busy} data-testid="sw-run">
            {busy ? "Working…" : "Show past days"}
          </button>
          {needsCondition && <span className="text-xs text-foreground-muted">Choose a move size or at least one reading.</span>}
        </div>
      </section>

      {msg && <p className="text-sm text-down" role="alert">{msg}</p>}

      {result && p && (
        <section className="space-y-4 rounded-2xl border border-border bg-surface-raised p-4 sm:p-5" aria-live="polite" data-testid="sw-result">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="Grouping">
              {(["stock", "date"] as const).map((g) => (
                <button key={g} type="button" aria-pressed={group === g} onClick={() => changeView(g, sort)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${group === g ? "bg-accent text-accent-foreground" : "text-foreground-muted"}`} data-testid={`sw-group-${g}`}>
                  {g === "stock" ? "Group by stock" : "Date wise"}
                </button>
              ))}
            </div>
            {group === "stock" && (
              <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="Sort">
                {(["newest", "largest"] as const).map((s) => (
                  <button key={s} type="button" aria-pressed={sort === s} onClick={() => changeView(group, s)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${sort === s ? "bg-accent text-accent-foreground" : "text-foreground-muted"}`} data-testid={`sw-sort-${s}`}>
                    {s === "newest" ? "Newest" : "Largest move"}
                  </button>
                ))}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {isPro ? (
                <button type="button" className={`${BTN} inline-flex items-center gap-1`} onClick={onCsv} data-testid="sw-csv">
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </button>
              ) : (
                <span className="text-[11px] text-foreground-faint">{SW_PRO_ONLY}</span>
              )}
            </div>
          </div>

          {group === "stock" ? (
            <div className="space-y-5">
              {result.stocks.map((s) => (
                <StockGroup key={s.symbol} s={s} p={p} sort={sort} names={resultNames} isPro={isPro} />
              ))}
            </div>
          ) : (
            <div className="space-y-3" data-testid="sw-timeline">
              {result.stocks.map((s) => (
                <p key={s.symbol} className="rounded-lg border border-border bg-hover px-3 py-2 text-sm font-medium" data-testid="sw-summary">
                  {s.no_history
                    ? `${s.symbol}: no history is stored for this stock.`
                    : stockwiseLine({ symbol: s.symbol, count: s.count, up: s.up, down: s.down, sessions: s.sessions, move: p.move, direction: p.direction, period: p.period })}
                  {s.with_readings != null && !s.no_history ? <span className="block text-xs font-normal text-foreground-muted">{readingsCountLine(s.with_readings, s.count, p.signal_offset)}</span> : null}
                  {s.partial_period && s.first_session ? <span className="block text-xs font-normal text-foreground-muted">Stored history starts on {fmtDate(s.first_session)}, which is less than the {periodText(p.period)}.</span> : null}
                </p>
              ))}
              {result.same_day_count != null && <p className="text-sm" data-testid="sw-sameday">{sameDayLine(result.same_day_count)}</p>}
              {(result.timeline ?? []).length === 0 && <p className="text-sm text-foreground-muted">{SW_NO_DAYS}</p>}
              <ul className="space-y-2">
                {(result.timeline ?? []).slice(0, tlShown).map((d) => (
                  <DayCard key={`${d.symbol}-${d.date}`} d={d} showStock names={resultNames} />
                ))}
              </ul>
              {(result.timeline ?? []).length > tlShown && (
                <button type="button" className={BTN} onClick={() => setTlShown((n) => n + PAGE)} data-testid="sw-more">
                  Show more ({(result.timeline ?? []).length - tlShown} left)
                </button>
              )}
              {result.timeline_total != null && result.timeline_total > (result.timeline ?? []).length && (
                <p className="text-xs text-foreground-faint">Showing {(result.timeline ?? []).length} of {result.timeline_total.toLocaleString("en-IN")} days.</p>
              )}
            </div>
          )}

          {isPro && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <input className={`${FIELD} min-w-0 flex-1`} placeholder="Name this filter" value={saveName} onChange={(e) => setSaveName(e.target.value)} maxLength={60} aria-label="Filter name" />
              <button type="button" className={`${BTN} inline-flex items-center gap-1`} onClick={onSave} disabled={!saveName.trim()} data-testid="sw-save">
                <Save className="h-3.5 w-3.5" /> Save filter
              </button>
            </div>
          )}
        </section>
      )}

      {isPro && saved.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface-raised p-4 sm:p-5" data-testid="sw-saved">
          <h2 className="text-sm font-semibold">Saved filters</h2>
          <ul className="mt-2 space-y-1.5">
            {saved.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                <button type="button" className="min-w-0 truncate text-left text-accent" onClick={() => runParams(f.params as unknown as Partial<StockwiseParams>)}>
                  {f.name}
                </button>
                <button type="button" aria-label={`Delete ${f.name}`} className="text-foreground-faint hover:text-down" onClick={() => onDelete(f.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground-muted" data-testid="sw-disclaimer">{HISTORY_DISCLAIMER}</p>
        <p className="text-xs text-foreground-muted">{HISTORY_CHANCE_NOTE}</p>
        <p className="text-xs text-foreground-muted">{SW_INDEPENDENCE_NOTE}</p>
      </div>
    </div>
  );
}
