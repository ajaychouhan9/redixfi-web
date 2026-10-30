"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Lock, Save, Trash2 } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  deleteSavedFilter,
  downloadHistoryCsv,
  getHistoryConfig,
  getHistorySectors,
  historyErrorMessage,
  listSavedFilters,
  runHistoryQuery,
  saveFilter,
  searchHistoryStocks,
  type HistoryConfig,
  type HistoryDirection,
  type HistoryParams,
  type HistoryResult,
  type HistoryRow,
  type HistoryScope,
  type HistorySummary,
  type ReadingCells,
  type SavedFilter,
} from "@/lib/api/history";
import {
  HISTORY_BUILDING,
  HISTORY_CHANCE_NOTE,
  HISTORY_DISCLAIMER,
  HISTORY_EXAMPLES_TITLE,
  HISTORY_NOT_ENOUGH,
  summaryLines,
  type MatchMode,
} from "@/lib/history-copy";
import { saveBlob } from "@/components/app/report/ReportActions";
import { CommonReadings } from "@/components/app/history/CommonReadings";
import { DayCard, DayTable } from "@/components/app/history/StockwiseHistory";
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
  ResultSkeleton,
  Segmented,
  StateChips,
  SummaryBar,
  chipTone,
  fmtDate,
  fmtInt,
  offLabel,
  pct2,
  rsi1,
  sgn2,
  x2,
} from "@/components/app/history/ui";
import type { StockwiseDay } from "@/lib/api/history";

const SCOPE_LABEL: Record<HistoryScope, string> = {
  stock: "This stock",
  sector: "A sector",
  all: "All stocks",
  similar: "Stocks with similar volatility",
};
const READING_LABELS = ["Trend up (10d)", "Above 20-DMA", "Volume elevated", "RSI in the upper zone", "Delivery up"];
const READING_KEYS = ["trend_up", "above_dma", "volume_high", "rsi_high", "delivery_up"];

/** One pooled row (the day before, the day of the move, the day after) in the shape of a stock-wise day, so both tabs read alike. */
function toDay(r: HistoryRow): StockwiseDay {
  const block = (c: ReadingCells, offset: number) =>
    c.status === "ok" || c.date
      ? {
          offset,
          status: "ok" as const,
          date: c.date,
          weekday: c.date ? new Date(`${c.date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) : undefined,
          change_pct: c.move,
          trend_10d: c.trend_10d,
          volume_x: c.volume_ratio,
          rsi: c.rsi,
          delivery_pct: c.delivery_pct,
          states: READING_LABELS.map((label, i) => ({ key: READING_KEYS[i], label, on: (c.states_na ?? []).includes(label) ? null : (c.states ?? []).includes(label) })),
        }
      : { offset, status: (c.status === "pending" ? "pending" : "na") as "pending" | "na" };
  const w = new Date(`${r.date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return { symbol: r.symbol, date: r.date, weekday: w, move_pct: r.move, sessions: [block(r.day_before, -1), block(r.day_of, 0), block(r.day_after, 1)] };
}

function SummaryBlock({ dir, s, p, heading }: { dir: "up" | "down"; s: HistorySummary; p: HistoryParams; heading: boolean }) {
  const ticked = p.signals.length;
  const lines = summaryLines({
    move: p.move,
    dir,
    E: s.E,
    K: s.K,
    N: s.N,
    Kn: s.K_next,
    baseRate: s.base_rate_pct,
    match: (p.match as MatchMode) || "all",
    tickedCount: ticked,
  });
  return (
    <div data-testid={`history-summary-${dir}`} className="space-y-1.5">
      {heading && <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{dir === "up" ? "Up moves" : "Down moves"}</p>}
      {s.enough ? (
        lines.map((l) => (
          <p key={l} className="text-sm leading-relaxed text-foreground">
            {l}
          </p>
        ))
      ) : (
        <p className="text-sm text-foreground-muted">{HISTORY_NOT_ENOUGH}</p>
      )}
    </div>
  );
}

export function HistoryExplorer() {
  const sp = useSearchParams();
  const { user, getToken } = useAuth();
  const [cfg, setCfg] = useState<HistoryConfig | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [sectors, setSectors] = useState<{ sector: string; stocks: number }[]>([]);
  const [move, setMove] = useState(5);
  const [direction, setDirection] = useState<HistoryDirection>("up");
  const [signals, setSignals] = useState<string[]>([]);
  const [matchKind, setMatchKind] = useState<"all" | "any">("all");
  const [anyN, setAnyN] = useState(2);
  const [scope, setScope] = useState<HistoryScope>("all");
  const [symbol, setSymbol] = useState<string>("");
  const [sector, setSector] = useState<string>("");
  const [period, setPeriod] = useState<"3y" | "1y">("3y");
  const [example, setExample] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState<HistoryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lockText, setLockText] = useState<string | null>(null);
  const [stockText, setStockText] = useState("");
  const [hits, setHits] = useState<{ symbol: string; company_name: string | null }[]>([]);
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [saveName, setSaveName] = useState("");
  const booted = useRef(false);
  const [lastBody, setLastBody] = useState<Record<string, unknown> | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [examplesOpen, setExamplesOpen] = useState(true);
  const [view, setView] = useState<"cards" | "table">("cards");
  const formRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches) setView("table");
  }, []);

  const access = cfg?.access;
  const custom = !!access?.custom_filters;
  const matchValue: MatchMode = signals.length >= 2 && matchKind === "any" ? (`any${Math.min(anyN, signals.length)}` as MatchMode) : "all";

  const run = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setMsg(null);
      setLockText(null);
      setLastBody(body);
      try {
        const token = user ? await getToken() : null;
        const env = await runHistoryQuery(body, { token });
        const params = env.data.params as HistoryParams & { move_dir?: HistoryDirection };
        setResult({ ...env.data, params: { ...params, direction: params.direction ?? params.move_dir ?? "up" } });
        setFiltersOpen(false);
        setExamplesOpen(false);
      } catch (e) {
        setResult(null);
        const m = historyErrorMessage(e);
        setMsg(m);
        if (m.includes("Basic") || m.includes("Pro")) setLockText(m);
      } finally {
        setBusy(false);
      }
    },
    [user, getToken],
  );

  const customBody = useCallback(
    (lim: number) => ({ move, direction, signals, match: matchValue, scope, symbol: symbol || undefined, sector: sector || undefined, period, limit: lim }),
    [move, direction, signals, matchValue, scope, symbol, sector, period],
  );

  // load configuration (and the saved filters for Pro) once the sign-in state is known
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const token = user ? await getToken() : null;
        const env = await getHistoryConfig({ token });
        if (!live) return;
        setCfg(env.data);
        if (env.data.access.saved_filters && token) {
          listSavedFilters({ token }).then((r) => live && setSaved(r.data.filter((x) => x.kind !== "stockwise"))).catch(() => undefined);
        } else {
          setSaved([]);
        }
        getHistorySectors({ token }).then((r) => live && setSectors(r.data)).catch(() => undefined);
      } catch {
        if (live) setCfgError("The History Explorer is not available right now.");
      }
    })();
    return () => {
      live = false;
    };
  }, [user, getToken]);

  // first view: the stock from the link when custom filters are allowed, otherwise the first example
  useEffect(() => {
    if (!cfg || booted.current) return;
    booted.current = true;
    const qSym = (sp.get("symbol") || "").toUpperCase();
    const qMove = Number(sp.get("move"));
    if (qSym && cfg.access.custom_filters) {
      const m = cfg.moves.includes(qMove) ? qMove : 5;
      setMove(m);
      setScope("stock");
      setSymbol(qSym);
      setStockText(qSym);
      run({ move: m, direction: "up", signals: [], match: "all", scope: "stock", symbol: qSym, period: "3y", limit: 10 });
      return;
    }
    if (qSym) {
      setSymbol(qSym);
      setStockText(qSym);
      setMsg(null);
    }
    const first = cfg.examples[0];
    if (first) {
      setExample(first.id);
      setMove(Number(first.params.move) || 5);
      setDirection((first.params.direction as HistoryDirection) || "up");
      setSignals((first.params.signals as string[]) || []);
      run({ preset: first.id, period: "3y", limit: 10 });
    }
  }, [cfg, sp, run]);

  // stock search suggestions
  useEffect(() => {
    if (scope !== "stock" && scope !== "similar") return;
    const q = stockText.trim();
    if (q.length < 1 || q.toUpperCase() === symbol) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      searchHistoryStocks(q)
        .then((r) => setHits(r.data))
        .catch(() => setHits([]));
    }, 200);
    return () => window.clearTimeout(t);
  }, [stockText, scope, symbol]);

  function chooseExample(id: string) {
    const ex = cfg?.examples.find((e) => e.id === id);
    if (!ex) return;
    setExample(id);
    setMove(Number(ex.params.move) || 5);
    setDirection((ex.params.direction as HistoryDirection) || "up");
    setSignals((ex.params.signals as string[]) || []);
    const m = String(ex.params.match || "all");
    setMatchKind(m.startsWith("any") ? "any" : "all");
    if (m.startsWith("any")) setAnyN(Number(m.slice(3)) || 2);
    setScope("all");
    setLimit(10);
    run({ preset: id, period, limit: 10 });
  }

  function toggleSignal(key: string) {
    setExample(null);
    setSignals((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  function onShow() {
    setLimit(10);
    if (!custom) {
      setLockText(access?.locked_text ?? null);
      return;
    }
    setExample(null);
    run(customBody(10));
  }

  function showMore() {
    const next = Math.min(limit + 10, result?.rows_limit ?? 10);
    setLimit(next);
    if (example) run({ preset: example, period, limit: next });
    else run(customBody(next));
  }

  async function onCsv() {
    if (!result) return;
    try {
      const token = await getToken();
      if (!token) return;
      const { blob, filename } = await downloadHistoryCsv(result.params, token);
      saveBlob(blob, filename ?? "redixfi-history.csv");
    } catch (e) {
      setMsg(historyErrorMessage(e));
    }
  }

  async function onSave() {
    if (!result || !saveName.trim()) return;
    try {
      const token = await getToken();
      if (!token) return;
      const r = await saveFilter(saveName.trim(), result.params, { token });
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
      setSaved((s) => s.filter((f) => f.id !== id));
    } catch (e) {
      setMsg(historyErrorMessage(e));
    }
  }

  function openSaved(f: SavedFilter) {
    setExample(null);
    const dir = ((f.params as HistoryParams & { move_dir?: HistoryDirection }).move_dir ?? f.params.direction ?? "up") as HistoryDirection;
    setMove(f.params.move);
    setDirection(dir);
    setSignals(f.params.signals);
    setMatchKind(f.params.match.startsWith("any") ? "any" : "all");
    if (f.params.match.startsWith("any")) setAnyN(Number(f.params.match.slice(3)) || 2);
    setScope(f.params.scope);
    setSymbol(f.params.symbol ?? "");
    setStockText(f.params.symbol ?? "");
    setSector(f.params.sector ?? "");
    setPeriod(f.params.period);
    setLimit(10);
    run({ ...f.params, direction: dir, limit: 10 });
  }

  const dirs = useMemo(() => (result ? (Object.keys(result.summaries) as ("up" | "down")[]) : []), [result]);
  const tableRows: HistoryRow[] = result?.table ?? [];

  if (cfgError) return <ErrorState message={cfgError} onRetry={() => window.location.reload()} />;
  if (!cfg) return <ResultSkeleton />;

  const scopeOk = (s: HistoryScope) => cfg.access.scopes.includes(s);
  const commonOn = cfg.common_readings !== false;
  const daysFound = result ? dirs.reduce((a, d) => a + (result.summaries[d]?.E ?? 0), 0) : 0;
  const barText = result
    ? [
        result.scope.label,
        `${result.params.move}% or more`,
        result.params.direction === "either" ? "Either" : result.params.direction === "down" ? "Down" : "Up",
        result.params.period === "3y" ? "3 years" : "1 year",
        result.params.signals.length ? `${result.params.signals.length} reading${result.params.signals.length > 1 ? "s" : ""} the day before` : "no readings filter",
      ].join(" | ")
    : "";
  function editFilters() {
    setFiltersOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }
  const Row = view === "table" ? DayTable : DayCard;
  const today = result?.today;

  return (
    <div className="space-y-4" data-testid="history-explorer">
      <Card>
        <Fold title={HISTORY_EXAMPLES_TITLE} open={examplesOpen} onToggle={() => setExamplesOpen((o) => !o)} testid="history-examples-fold">
          <div className="flex flex-wrap gap-2" data-testid="history-examples">
            {cfg.examples.map((e) => (
              <button key={e.id} type="button" onClick={() => chooseExample(e.id)} aria-pressed={example === e.id} className={`${CHIP_BASE} h-auto max-w-full text-left leading-snug ${chipTone(example === e.id)}`}>
                {e.label}
              </button>
            ))}
          </div>
          {!custom && <p className="mt-3 text-xs text-foreground-muted">Examples use all stocks over three years.</p>}
        </Fold>
      </Card>

      {result && !filtersOpen ? (
        <SummaryBar text={barText} onEdit={editFilters} />
      ) : (
        <div ref={formRef}>
          <Card aria-label="Custom filter">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className={H2}>Custom filter</h2>
              {!custom && (
                <span className="flex items-center gap-1 text-xs text-foreground-muted">
                  <Lock size={12} aria-hidden /> Basic and Pro
                </span>
              )}
            </div>
            {!custom && (
              <p className="mb-3 text-xs text-foreground-muted" data-testid="history-locked">
                {cfg.access.locked_text}{" "}
                <Link href="/pricing" className="font-medium text-accent-dim underline">
                  See plans
                </Link>
              </p>
            )}
            <fieldset disabled={!custom} className="space-y-4 disabled:opacity-60">
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
                <label className={LABEL}>
                  Move size on the day
                  <select
                    className={`${FIELD} mt-1`}
                    value={move}
                    onChange={(e) => {
                      setExample(null);
                      setMove(Number(e.target.value));
                    }}
                    data-testid="history-move"
                  >
                    {cfg.moves.map((m) => (
                      <option key={m} value={m}>
                        {m}% or more
                      </option>
                    ))}
                  </select>
                </label>
                <div className={LABEL}>
                  Direction
                  <div className="mt-1">
                    <Segmented
                      label="Direction"
                      value={direction}
                      onChange={(d) => {
                        setExample(null);
                        setDirection(d);
                      }}
                      options={[
                        { id: "up", label: "Up" },
                        { id: "down", label: "Down" },
                        { id: "either", label: "Either" },
                      ]}
                    />
                  </div>
                </div>
                <label className={LABEL}>
                  Period
                  <select className={`${FIELD} mt-1`} value={period} onChange={(e) => setPeriod(e.target.value as "3y" | "1y")}>
                    <option value="3y">Last 3 years</option>
                    <option value="1y">Last 1 year</option>
                  </select>
                </label>
              </div>

              <div>
                <p className={`${LABEL} mb-1.5`}>Readings the day before the move (optional)</p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" data-testid="history-readings">
                  {cfg.readings.map((r) => (
                    <label key={r.key} className="flex min-h-11 items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm" title={r.rule}>
                      <input type="checkbox" className="mt-0.5 h-5 w-5" checked={signals.includes(r.key)} onChange={() => toggleSignal(r.key)} />
                      <span>
                        {r.label}
                        <span className="block text-[11px] leading-snug text-foreground-muted">{r.rule}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-foreground-muted" data-testid="history-building">
                  {HISTORY_BUILDING}
                </p>
                {signals.length >= 2 && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-foreground-muted">
                    <label className="flex min-h-11 items-center gap-2">
                      <input type="radio" name="match" className="h-5 w-5" checked={matchKind === "all"} onChange={() => setMatchKind("all")} /> All ticked
                    </label>
                    <label className="flex min-h-11 items-center gap-2">
                      <input type="radio" name="match" className="h-5 w-5" checked={matchKind === "any"} onChange={() => setMatchKind("any")} /> Any
                      <select className={`${FIELD} !w-auto`} value={anyN} onChange={(e) => setAnyN(Number(e.target.value))} disabled={matchKind !== "any"} aria-label="N of the ticked">
                        {Array.from({ length: signals.length - 1 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      of the ticked
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className={LABEL}>
                  Stocks
                  <select
                    className={`${FIELD} mt-1`}
                    value={scope}
                    onChange={(e) => {
                      setExample(null);
                      setScope(e.target.value as HistoryScope);
                    }}
                    data-testid="history-scope"
                  >
                    {(["stock", "sector", "all", "similar"] as HistoryScope[]).map((s) => (
                      <option key={s} value={s} disabled={!scopeOk(s)}>
                        {SCOPE_LABEL[s]}
                        {!scopeOk(s) ? " (Pro)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {(scope === "stock" || scope === "similar") && (
                  <div className="relative">
                    <input
                      className={FIELD}
                      placeholder="Search a stock by name or symbol"
                      value={stockText}
                      onChange={(e) => {
                        setStockText(e.target.value);
                        setSymbol("");
                      }}
                      aria-label="Stock"
                      data-testid="history-stock"
                    />
                    {hits.length > 0 && (
                      <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface-raised shadow-md">
                        {hits.map((h) => (
                          <li key={h.symbol}>
                            <button
                              type="button"
                              className="min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-hover"
                              onClick={() => {
                                setSymbol(h.symbol);
                                setStockText(h.symbol);
                                setHits([]);
                              }}
                            >
                              {h.symbol} <span className="text-foreground-muted">{h.company_name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {scope === "sector" && (
                  <select className={FIELD} value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector">
                    <option value="">Choose a sector</option>
                    {sectors.map((s) => (
                      <option key={s.sector} value={s.sector}>
                        {s.sector} ({s.stocks})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </fieldset>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className={BTN_PRIMARY} onClick={onShow} disabled={busy} data-testid="history-run">
                {busy ? "Working…" : "Show past days"}
              </button>
              {result && (
                <button type="button" className={BTN} onClick={() => setFiltersOpen(false)}>
                  Hide filters
                </button>
              )}
              {lockText && <span className="text-sm text-foreground-muted">{lockText}</span>}
            </div>
          </Card>
        </div>
      )}

      {msg && !lockText && <ErrorState message={msg} onRetry={lastBody ? () => run(lastBody) : undefined} />}
      {busy && !result && <ResultSkeleton />}

      {result && (
        <div className={`space-y-4 ${busy ? "opacity-60" : ""}`} aria-live="polite" aria-busy={busy} data-testid="history-result">
          <Card>
            <div className="mb-2">
              <h2 className={H2}>{result.scope.label}</h2>
              <p className="text-xs text-foreground-muted">
                {result.params.period === "3y" ? "Last 3 years" : "Last 1 year"} to {fmtDate(result.as_of)}
                {result.scope.stocks ? ` · ${fmtInt(result.scope.stocks)} stocks` : ""}
              </p>
            </div>

            {today && (
              <div className={`${INNER} mb-3`} data-testid="history-today">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Today</p>
                <ul>
                  <DayTable
                    d={{
                      symbol: result.scope.label,
                      date: today.date ?? result.as_of,
                      weekday: "",
                      move_pct: today.move ?? 0,
                      sessions: [
                        {
                          offset: 0,
                          status: "ok",
                          date: today.date,
                          change_pct: today.move,
                          trend_10d: today.trend_10d,
                          volume_x: today.volume_ratio,
                          rsi: today.rsi,
                          delivery_pct: today.delivery_pct,
                          states: READING_LABELS.map((label, i) => ({ key: READING_KEYS[i], label, on: (today.states_na ?? []).includes(label) ? null : (today.states ?? []).includes(label) })),
                        },
                      ],
                    }}
                    showStock={false}
                  />
                </ul>
              </div>
            )}

            <div className="space-y-3">
              {dirs.map((d) => (
                <SummaryBlock key={d} dir={d} s={result.summaries[d]!} p={result.params} heading={dirs.length > 1} />
              ))}
            </div>
            <div className="mt-3">
              <HowToRead readings={cfg.readings} />
            </div>
          </Card>

          {commonOn && <CommonReadings mode="pooled" body={lastBody ?? {}} days={daysFound} moveAny={false} />}

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className={H2}>Past days, newest first</h2>
              <Segmented
                label="Layout"
                value={view}
                onChange={setView}
                options={[
                  { id: "cards", label: "Cards" },
                  { id: "table", label: "Table" },
                ]}
                testid="history-view"
              />
            </div>
            {tableRows.length === 0 ? (
              <EmptyState>No days in this period with a move of {result.params.move}% or more. Try a smaller move or a longer period.</EmptyState>
            ) : (
              <ul className="space-y-2" data-testid={view === "table" ? "history-table" : "history-cards"}>
                {tableRows.map((r) => (
                  <Row key={`${r.symbol}-${r.date}`} d={toDay(r)} showStock={result.scope.kind !== "stock"} />
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {result.table_more && limit < result.rows_limit && (
                <button type="button" className={BTN} onClick={showMore} disabled={busy} data-testid="history-more">
                  Show more
                </button>
              )}
              {result.table_more && limit >= result.rows_limit && !cfg.access.saved_filters && (
                <span className="text-xs text-foreground-muted">
                  {cfg.access.plan === "basic" ? "Showing the most rows your plan includes. " : `Showing the first ${result.rows_limit} rows. Basic and Pro show more. `}
                  <Link href="/pricing" className="font-medium text-accent-dim underline">
                    See plans
                  </Link>
                </span>
              )}
            </div>
            {cfg.access.saved_filters && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                {cfg.access.csv && (
                  <button type="button" className={BTN} onClick={onCsv}>
                    <Download className="h-4 w-4" aria-hidden /> Download CSV
                  </button>
                )}
                <input className={`${FIELD} min-w-0 flex-1 basis-40`} placeholder="Name this filter" value={saveName} onChange={(e) => setSaveName(e.target.value)} maxLength={60} aria-label="Filter name" />
                <button type="button" className={BTN} onClick={onSave} disabled={!saveName.trim()}>
                  <Save className="h-4 w-4" aria-hidden /> Save filter
                </button>
              </div>
            )}
          </Card>
        </div>
      )}

      {cfg.access.saved_filters && saved.length > 0 && (
        <Card data-testid="history-saved">
          <h2 className={`${H2} mb-2`}>Saved filters</h2>
          <ul className="divide-y divide-border">
            {saved.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2">
                <button type="button" className="min-h-11 min-w-0 flex-1 truncate text-left text-sm font-medium text-accent-dim hover:underline" onClick={() => openSaved(f)}>
                  {f.name}
                  <span className="ml-2 text-xs font-normal text-foreground-muted">{f.params.move}%</span>
                </button>
                <button type="button" className="inline-flex h-11 w-11 items-center justify-center text-foreground-muted hover:text-down" onClick={() => onDelete(f.id)} aria-label={`Delete ${f.name}`}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-1">
        <p className="text-xs text-foreground-muted">{HISTORY_CHANCE_NOTE}</p>
        <p className="text-xs font-medium text-foreground-muted" data-testid="history-disclaimer">
          {HISTORY_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
