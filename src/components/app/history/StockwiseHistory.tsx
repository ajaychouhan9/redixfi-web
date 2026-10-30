"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Save, Trash2, X } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  deleteSavedFilter,
  downloadStockwiseCsv,
  getHistoryConfig,
  historyErrorMessage,
  listSavedFilters,
  normalizeStockwiseParams,
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
  SW_PENDING,
  SW_PRO_ONLY,
  readingsCountLine,
  sameDayLine,
  stockwiseLine,
} from "@/lib/history-copy";
import { saveBlob } from "@/components/app/report/ReportActions";
import { CommonReadings } from "@/components/app/history/CommonReadings";
import { HowToRead } from "@/components/app/history/HowToRead";
import {
  BTN,
  BTN_PRIMARY,
  CHIP_BASE,
  Card,
  EmptyState,
  ErrorState,
  FIELD,
  Fold,
  H2,
  INNER,
  LABEL,
  NA,
  NOTE_CHIP,
  ResultSkeleton,
  Segmented,
  StateChips,
  SummaryBar,
  chipTone,
  fmtDM,
  fmtDate,
  fmtInt,
  fmtShort,
  offLabel,
  pct2,
  rsi1,
  sgn2,
  signTone,
  x2,
} from "@/components/app/history/ui";

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
const DIR_TEXT: Record<string, string> = { either: "Either", up: "Up", down: "Down" };
const periodLong = (p: string) => (p === "1y" ? "1 year" : p === "2y" ? "2 years" : "3 years");

function sessionsText(offs: number[]): string {
  const o = [...offs].sort((a, b) => a - b);
  if (o.length === 1) return `session ${offLabel(o[0])}`;
  const contiguous = o.every((v, i) => i === 0 || v === o[i - 1] + 1);
  return contiguous ? `sessions ${offLabel(o[0])} to ${offLabel(o[o.length - 1])}` : `sessions ${o.map(offLabel).join(", ")}`;
}

function summaryText(p: StockwiseParams): string {
  const parts = [p.symbols.join(", "), p.move == null ? "Any move size" : `${p.move}% or more`, DIR_TEXT[p.direction] ?? "Either", periodLong(p.period), sessionsText(p.offsets)];
  if (p.signals.length) parts.push(`${p.signals.length} reading${p.signals.length > 1 ? "s" : ""} at ${offLabel(p.signal_offset)}`);
  return parts.join(" | ");
}

function DayHeading({ d, showStock, name }: { d: StockwiseDay; showStock: boolean; name?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <div className="min-w-0">
        {showStock && (
          <p className="text-sm font-semibold">
            {d.symbol}
            {name && name !== d.symbol ? <span className="ml-1.5 text-xs font-normal text-foreground-muted">{name}</span> : null}
          </p>
        )}
        <p className="text-sm font-semibold">
          {d.weekday}, {fmtDate(d.date)}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {d.nearby && <span className={NOTE_CHIP}>Another move day within 2 sessions</span>}
        <span className={`text-base font-semibold tabular-nums ${signTone(d.move_pct)}`}>{sgn2(d.move_pct)}</span>
      </div>
    </div>
  );
}

function BlockCard({ b }: { b: SessionBlock }) {
  const frame = `min-w-0 rounded-lg border p-2.5 ${b.offset === 0 ? "border-accent bg-accent/5" : "border-border bg-surface"}`;
  const head = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
      <span className="text-xs font-semibold">
        {offLabel(b.offset)}
        {b.offset === 0 ? " · the move" : ""}
      </span>
      {b.status === "ok" && (
        <span className="text-[11px] text-foreground-muted">
          {b.weekday?.slice(0, 3)} {fmtShort(b.date)}
        </span>
      )}
    </div>
  );
  if (b.status !== "ok")
    return (
      <div className={frame} data-testid="sw-block">
        {head}
        <p className="mt-1 text-xs text-foreground-muted">{b.status === "pending" ? SW_PENDING : NA}</p>
      </div>
    );
  return (
    <div className={frame} data-testid="sw-block">
      {head}
      <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 text-[12px] leading-snug">
        <dt className="text-foreground-muted">Change</dt>
        <dd className={`text-right tabular-nums ${signTone(b.change_pct)}`}>{sgn2(b.change_pct)}</dd>
        <dt className="text-foreground-muted">Trend (10d)</dt>
        <dd className="text-right tabular-nums">{sgn2(b.trend_10d)}</dd>
        <dt className="text-foreground-muted" title="5-session volume against the prior 20-session average">
          Volume vs 20d avg
        </dt>
        <dd className="text-right tabular-nums">{x2(b.volume_x)}</dd>
        <dt className="text-foreground-muted">RSI</dt>
        <dd className="text-right tabular-nums">{rsi1(b.rsi)}</dd>
        <dt className="text-foreground-muted">Delivery</dt>
        <dd className="text-right tabular-nums">{pct2(b.delivery_pct)}</dd>
      </dl>
      <div className="mt-1.5">
        <StateChips states={b.states} />
      </div>
    </div>
  );
}

export function DayCard({ d, showStock, name }: { d: StockwiseDay; showStock: boolean; name?: string }) {
  return (
    <li className={`${INNER} space-y-2.5`} data-testid="sw-day">
      <DayHeading d={d} showStock={showStock} name={name} />
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3">
        {d.sessions.map((b) => (
          <BlockCard key={b.offset} b={b} />
        ))}
      </div>
    </li>
  );
}

export function DayTable({ d, showStock, name }: { d: StockwiseDay; showStock: boolean; name?: string }) {
  return (
    <li className={`${INNER} space-y-2`} data-testid="sw-day">
      <DayHeading d={d} showStock={showStock} name={name} />
      <table className="w-full table-fixed border-collapse text-[11px] sm:text-[12px]" data-testid="sw-daytable">
        <caption className="sr-only">
          {d.symbol} {d.weekday} {d.date}: readings by session
        </caption>
        <thead>
          <tr className="border-b border-border text-[10px] font-semibold uppercase leading-tight text-foreground-muted">
            <th scope="col" className="w-[18%] py-1.5 pr-1 text-left">Session</th>
            <th scope="col" className="w-[16%] py-1.5 pr-1 text-right">Change</th>
            <th scope="col" className="w-[19%] py-1.5 pr-1 text-right">Trend (10d)</th>
            <th scope="col" className="w-[15%] py-1.5 pr-1 text-right">Volume vs 20d avg</th>
            <th scope="col" className="w-[12%] py-1.5 pr-1 text-right">RSI</th>
            <th scope="col" className="w-[20%] py-1.5 text-right">Delivery</th>
          </tr>
        </thead>
        <tbody>
          {d.sessions.map((b) => {
            const isDay = b.offset === 0;
            const rowCls = isDay ? "bg-accent/10 font-medium" : "";
            const first = (
              <th scope="row" className={`py-1.5 pr-1 text-left align-top font-medium ${isDay ? "border-l-2 border-accent pl-1" : ""}`}>
                <span className="block">{offLabel(b.offset)}</span>
                {isDay && <span className="block text-[10px] font-semibold uppercase text-foreground">the move</span>}
                {b.status === "ok" && (
                  <span className="block text-[10px] font-normal text-foreground-muted">
                    {b.weekday?.slice(0, 3)} {fmtDM(b.date)}
                  </span>
                )}
              </th>
            );
            if (b.status !== "ok")
              return (
                <tr key={b.offset} className={`border-b border-border ${rowCls}`}>
                  {first}
                  <td colSpan={5} className="py-1.5 text-foreground-muted">
                    {b.status === "pending" ? SW_PENDING : NA}
                  </td>
                </tr>
              );
            const chips = b.states?.some((s) => s.on !== false);
            return [
              <tr key={b.offset} className={`${chips ? "" : "border-b border-border"} ${rowCls}`}>
                {first}
                <td className={`py-1.5 pr-1 text-right align-top tabular-nums break-words leading-tight ${signTone(b.change_pct)}`}>{sgn2(b.change_pct)}</td>
                <td className="py-1.5 pr-1 text-right align-top tabular-nums break-words leading-tight">{sgn2(b.trend_10d)}</td>
                <td className="py-1.5 pr-1 text-right align-top tabular-nums break-words leading-tight">{x2(b.volume_x)}</td>
                <td className="py-1.5 pr-1 text-right align-top tabular-nums break-words leading-tight">{rsi1(b.rsi)}</td>
                <td className="py-1.5 text-right align-top tabular-nums break-words leading-tight">{pct2(b.delivery_pct)}</td>
              </tr>,
              chips ? (
                <tr key={`${b.offset}c`} className={`border-b border-border ${rowCls}`}>
                  <td colSpan={6} className="pb-1.5 pl-1">
                    <StateChips states={b.states} />
                  </td>
                </tr>
              ) : null,
            ];
          })}
        </tbody>
      </table>
    </li>
  );
}

function StockGroup({ s, p, names, view, isPro }: { s: StockwiseStock; p: StockwiseParams; names: Record<string, string>; view: "cards" | "table"; isPro: boolean }) {
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [s.symbol, p.sort, s.count, view]);
  const Row = view === "table" ? DayTable : DayCard;
  const moveText = p.move == null ? "these readings" : `a move of ${p.move}% or more`;
  return (
    <section className="space-y-2" data-testid="sw-group" aria-label={`${s.symbol} days`}>
      <h3 className={`${H2} flex flex-wrap items-baseline gap-x-2 border-b border-border pb-1.5`}>
        {s.symbol}
        {s.company_name && s.company_name !== s.symbol ? <span className="text-xs font-normal text-foreground-muted">{s.company_name}</span> : null}
        <span className="ml-auto text-xs font-normal text-foreground-muted">
          {fmtInt(s.listed)} day{s.listed === 1 ? "" : "s"}
        </span>
      </h3>
      {s.days.length === 0 && (
        <EmptyState>
          {s.with_readings != null && s.count > 0
            ? `None of the ${fmtInt(s.count)} days had these readings at ${offLabel(p.signal_offset)}. Try fewer readings or another session.`
            : `No days in this period with ${moveText}. Try a smaller move or a longer period.`}
        </EmptyState>
      )}
      <ul className="space-y-2">
        {s.days.slice(0, shown).map((d) => (
          <Row key={d.date} d={d} showStock={false} name={names[d.symbol]} />
        ))}
      </ul>
      {s.days.length > shown && (
        <button type="button" className={BTN} onClick={() => setShown((n) => n + PAGE)} data-testid="sw-more">
          Show more ({fmtInt(Math.min(PAGE, s.days.length - shown))} of {fmtInt(s.days.length - shown)} left)
        </button>
      )}
      {s.listed > s.days.length && (
        <p className="text-xs text-foreground-muted">
          Showing {fmtInt(s.days.length)} of {fmtInt(s.listed)} days.{isPro ? " The CSV file has all of them." : ""}
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
  const [view, setView] = useState<"cards" | "table">("cards");
  const [result, setResult] = useState<StockwiseResult | null>(null);
  const [lastBody, setLastBody] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [examplesOpen, setExamplesOpen] = useState(true);
  const [text, setText] = useState("");
  const [hits, setHits] = useState<{ symbol: string; company_name: string | null }[]>([]);
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [saveName, setSaveName] = useState("");
  const [tlShown, setTlShown] = useState(PAGE);
  const booted = useRef(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  const sw = cfg?.stockwise;
  const maxStocks = sw?.max_stocks ?? 3;
  const isPro = !!cfg?.access.csv;
  const matchValue = signals.length >= 2 && matchKind === "any" ? `any${Math.min(anyN, signals.length)}` : "all";
  const needsCondition = move === "any" && signals.length === 0;

  // tables read better on a phone, cards on a larger screen (chosen once; the reader can switch)
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches) setView("table");
  }, []);

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
    async (body: Record<string, unknown>, collapse = true) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      setLastBody(body);
      try {
        const token = user ? await getToken() : null;
        const env = await runStockwise(body, { token });
        setResult(env.data);
        setTlShown(PAGE);
        setNames((n) => ({ ...n, ...Object.fromEntries(env.data.stocks.map((s) => [s.symbol, s.company_name])) }));
        if (collapse) {
          setFiltersOpen(false);
          setExamplesOpen(false);
        }
      } catch (e) {
        setError(historyErrorMessage(e));
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
      setNotice(`You can choose up to ${maxStocks} stocks.${maxStocks < 10 ? " Pro allows up to 10." : ""}`);
      return;
    }
    setNotice(null);
    setStocks((s) => [...s, sym]);
    if (name) setNames((n) => ({ ...n, [sym]: name }));
  }

  function onShow() {
    if (stocks.length === 0) return setNotice("Choose at least one stock.");
    if (needsCondition) return setNotice("Choose a move size or at least one reading.");
    run(bodyFor());
  }

  function changeView(nextGroup: "stock" | "date", nextSort: "newest" | "largest") {
    setGroup(nextGroup);
    setSort(nextSort);
    if (result) run({ ...bodyFor({ group: nextGroup, sort: nextSort }), symbols: result.params.symbols }, false);
  }

  function editFilters() {
    setFiltersOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
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
      setNotice(historyErrorMessage(e));
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
      setNotice(historyErrorMessage(e));
    }
  }

  async function onDelete(id: string) {
    try {
      const token = await getToken();
      if (!token) return;
      await deleteSavedFilter(id, { token });
      setSaved((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      setNotice(historyErrorMessage(e));
    }
  }

  if (cfgError) return <ErrorState message={cfgError} onRetry={() => window.location.reload()} />;
  if (!cfg) return <ResultSkeleton />;

  const p = result?.params;
  const daysFound = result ? result.stocks.reduce((a, s) => a + s.count, 0) : 0;
  const commonOn = cfg.common_readings !== false;

  return (
    <div className="space-y-4" data-testid="history-stockwise">
      <Card>
        <Fold title={HISTORY_EXAMPLES_TITLE} open={examplesOpen} onToggle={() => setExamplesOpen((o) => !o)} testid="sw-examples-fold">
          <div className="flex flex-wrap gap-2" data-testid="sw-examples">
            {(sw?.examples ?? []).map((e) => (
              <button key={e.id} type="button" onClick={() => runParams(e.params)} disabled={busy} className={`${CHIP_BASE} h-auto max-w-full text-left leading-snug ${chipTone(false)}`}>
                {e.label}
              </button>
            ))}
          </div>
        </Fold>
      </Card>

      {result && !filtersOpen ? (
        <SummaryBar text={summaryText(result.params)} onEdit={editFilters} />
      ) : (
        <div ref={formRef}>
          <Card data-testid="sw-form" aria-label="Filters">
            <div className="space-y-4">
              <div>
                <span className={LABEL}>Stocks (up to {maxStocks})</span>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5" data-testid="sw-selected">
                  {stocks.map((s) => (
                    <span key={s} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-surface pl-3 text-sm font-medium">
                      {s}
                      <button
                        type="button"
                        aria-label={`Remove ${s}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                        onClick={() => setStocks((x) => x.filter((y) => y !== s))}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative mt-1.5">
                  <input className={FIELD} placeholder="Search a stock by name or symbol" value={text} onChange={(e) => setText(e.target.value)} aria-label="Add a stock" data-testid="sw-search" />
                  {hits.length > 0 && (
                    <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface-raised shadow-md">
                      {hits.map((h) => (
                        <li key={h.symbol}>
                          <button type="button" className="min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-hover" onClick={() => addStock(h.symbol, h.company_name)}>
                            {h.symbol} <span className="text-foreground-muted">{h.company_name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
                <label className={LABEL}>
                  Move size
                  <select className={`${FIELD} mt-1`} value={move} onChange={(e) => setMove(e.target.value === "any" ? "any" : Number(e.target.value))} data-testid="sw-move">
                    <option value="any">Any</option>
                    {MOVES.map((m) => (
                      <option key={m} value={m}>
                        {m}% or more
                      </option>
                    ))}
                  </select>
                </label>
                <label className={LABEL}>
                  Direction
                  <select className={`${FIELD} mt-1`} value={direction} onChange={(e) => setDirection(e.target.value as HistoryDirection)} data-testid="sw-direction">
                    <option value="either">Either</option>
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                  </select>
                </label>
                <label className={LABEL}>
                  Period
                  <select className={`${FIELD} mt-1`} value={period} onChange={(e) => setPeriod(e.target.value as "1y" | "2y" | "3y")} data-testid="sw-period">
                    <option value="1y">1 year</option>
                    <option value="2y">2 years</option>
                    <option value="3y">3 years</option>
                  </select>
                </label>
              </div>

              <div>
                <span className={LABEL}>Sessions to show around each day (the stock&apos;s own trading sessions)</span>
                <div className="-mx-1 mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Sessions to show" data-testid="sw-offsets">
                  {OFFSETS.map((k) => {
                    const on = offsets.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={on}
                        aria-label={`Session ${offLabel(k)}${k === 0 ? ", the day of the move" : ""}`}
                        onClick={() => setOffsets((o) => toggle(o, k).sort((a, b) => a - b))}
                        className={`${CHIP_BASE} shrink-0 ${k === 0 ? "mx-1" : ""} ${chipTone(on)}`}
                      >
                        {offLabel(k)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <details className={INNER} data-testid="sw-signals" open={signals.length > 0}>
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Readings filter (optional)</summary>
                <div className="mt-2 space-y-3">
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {READINGS.map((r) => (
                      <label key={r.key} className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface-raised px-3 text-sm">
                        <input type="checkbox" className="h-5 w-5" checked={signals.includes(r.key)} onChange={() => setSignals((s) => toggle(s, r.key))} />
                        {r.label}
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                    <label className={LABEL}>
                      Checked at session
                      <select className={`${FIELD} mt-1`} value={signalOffset} onChange={(e) => setSignalOffset(Number(e.target.value))} data-testid="sw-signal-offset">
                        {OFFSETS.map((k) => (
                          <option key={k} value={k}>
                            {offLabel(k)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {signals.length >= 2 && (
                      <label className={LABEL}>
                        Match
                        <select
                          className={`${FIELD} mt-1`}
                          value={matchKind === "all" ? "all" : `any${anyN}`}
                          onChange={(e) => {
                            if (e.target.value === "all") setMatchKind("all");
                            else {
                              setMatchKind("any");
                              setAnyN(Number(e.target.value.slice(3)));
                            }
                          }}
                        >
                          <option value="all">All ticked</option>
                          {Array.from({ length: signals.length - 1 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={`any${n}`}>
                              At least {n} of the ticked
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </div>
              </details>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className={BTN_PRIMARY} onClick={onShow} disabled={busy} data-testid="sw-run">
                {busy ? "Working…" : "Show past days"}
              </button>
              {result && (
                <button type="button" className={BTN} onClick={() => setFiltersOpen(false)}>
                  Hide filters
                </button>
              )}
              {needsCondition && <span className="text-sm text-foreground-muted">Choose a move size or at least one reading.</span>}
            </div>
          </Card>
        </div>
      )}

      {notice && (
        <p className="text-sm font-medium text-down" role="alert">
          {notice}
        </p>
      )}
      {error && <ErrorState message={error} onRetry={lastBody ? () => run(lastBody) : undefined} />}
      {busy && !result && <ResultSkeleton />}

      {result && p && (
        <div className={`space-y-4 ${busy ? "opacity-60" : ""}`} aria-live="polite" aria-busy={busy} data-testid="sw-result">
          <Card>
            <h2 className={`${H2} mb-2`}>Summary</h2>
            <div className="space-y-2">
              {result.stocks.map((s) => (
                <div key={s.symbol} className={INNER} data-testid="sw-summary">
                  {s.no_history ? (
                    <p className="text-sm">{s.symbol}: no history is stored for this stock.</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium">{stockwiseLine({ symbol: s.symbol, count: s.count, up: s.up, down: s.down, sessions: s.sessions, move: p.move, direction: p.direction, period: p.period })}</p>
                      {s.company_name && s.company_name !== s.symbol && <p className="text-xs text-foreground-muted">{s.company_name}</p>}
                      {s.partial_period && s.first_session && (
                        <p className="mt-1 text-xs text-foreground-muted" data-testid="sw-partial">
                          Fewer data than the period: stored history for {s.symbol} starts on {fmtDate(s.first_session)}.
                        </p>
                      )}
                      {s.with_readings != null && (
                        <p className="mt-1 text-xs text-foreground-muted" data-testid="sw-readings-count">
                          {readingsCountLine(s.with_readings, s.count, p.signal_offset)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
              {result.same_day_count != null && group === "date" && (
                <p className="px-1 text-sm" data-testid="sw-sameday">
                  {sameDayLine(result.same_day_count)}
                </p>
              )}
            </div>
            <div className="mt-3">
              <HowToRead readings={cfg.readings} />
            </div>
          </Card>

          {commonOn && <CommonReadings mode="stockwise" body={lastBody ?? {}} days={daysFound} moveAny={p.move == null} />}

          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Segmented
                label="Grouping"
                value={group}
                onChange={(g) => changeView(g, sort)}
                options={[
                  { id: "stock", label: "Group by stock" },
                  { id: "date", label: "Date wise" },
                ]}
                testid="sw-group"
              />
              {group === "stock" && (
                <Segmented
                  label="Sort"
                  value={sort}
                  onChange={(s) => changeView(group, s)}
                  options={[
                    { id: "newest", label: "Newest" },
                    { id: "largest", label: "Largest move" },
                  ]}
                  testid="sw-sort"
                />
              )}
              <Segmented
                label="Layout"
                value={view}
                onChange={setView}
                options={[
                  { id: "cards", label: "Cards" },
                  { id: "table", label: "Table" },
                ]}
                testid="sw-view"
              />
            </div>

            {group === "stock" ? (
              <div className="space-y-6">
                {result.stocks
                  .filter((s) => !s.no_history)
                  .map((s) => (
                    <StockGroup key={s.symbol} s={s} p={p} names={names} view={view} isPro={isPro} />
                  ))}
              </div>
            ) : (
              <div className="space-y-3" data-testid="sw-timeline">
                {(result.timeline ?? []).length === 0 && (
                  <EmptyState>
                    No days in this period{p.move == null ? "" : ` with a move of ${p.move}% or more`}. Try a smaller move or a longer period.
                  </EmptyState>
                )}
                <ul className="space-y-2">
                  {(result.timeline ?? []).slice(0, tlShown).map((d) =>
                    view === "table" ? <DayTable key={`${d.symbol}-${d.date}`} d={d} showStock name={names[d.symbol]} /> : <DayCard key={`${d.symbol}-${d.date}`} d={d} showStock name={names[d.symbol]} />,
                  )}
                </ul>
                {(result.timeline ?? []).length > tlShown && (
                  <button type="button" className={BTN} onClick={() => setTlShown((n) => n + PAGE)} data-testid="sw-more">
                    Show more ({fmtInt((result.timeline ?? []).length - tlShown)} left)
                  </button>
                )}
                {result.timeline_total != null && result.timeline_total > (result.timeline ?? []).length && (
                  <p className="text-xs text-foreground-muted">
                    Showing {fmtInt((result.timeline ?? []).length)} of {fmtInt(result.timeline_total)} days.
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4" data-testid="sw-actions">
              {isPro ? (
                <>
                  <button type="button" className={BTN} onClick={onCsv} data-testid="sw-csv">
                    <Download className="h-4 w-4" aria-hidden /> Download CSV
                  </button>
                  <input className={`${FIELD} min-w-0 flex-1 basis-40`} placeholder="Name this filter" value={saveName} onChange={(e) => setSaveName(e.target.value)} maxLength={60} aria-label="Filter name" />
                  <button type="button" className={BTN} onClick={onSave} disabled={!saveName.trim()} data-testid="sw-save">
                    <Save className="h-4 w-4" aria-hidden /> Save filter
                  </button>
                </>
              ) : (
                <p className="text-xs text-foreground-muted">{SW_PRO_ONLY}</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {isPro && saved.length > 0 && (
        <Card data-testid="sw-saved">
          <h2 className={`${H2} mb-2`}>Saved filters</h2>
          <ul className="divide-y divide-border">
            {saved.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="min-h-11 min-w-0 flex-1 truncate text-left text-sm font-medium text-accent-dim hover:underline"
                  onClick={() => runParams(normalizeStockwiseParams(f.params as unknown as Partial<StockwiseParams>))}
                >
                  {f.name}
                </button>
                <button type="button" aria-label={`Delete ${f.name}`} className="inline-flex h-11 w-11 items-center justify-center text-foreground-muted hover:text-down" onClick={() => onDelete(f.id)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground-muted" data-testid="sw-disclaimer">
          {HISTORY_DISCLAIMER}
        </p>
        <p className="text-xs text-foreground-muted">{HISTORY_CHANCE_NOTE}</p>
        <p className="text-xs text-foreground-muted">{SW_INDEPENDENCE_NOTE}</p>
      </div>
    </div>
  );
}
