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

const SCOPE_LABEL: Record<HistoryScope, string> = {
  stock: "This stock",
  sector: "A sector",
  all: "All stocks",
  similar: "Stocks with similar volatility",
};
const BTN =
  "rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";
const FIELD = "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-50";

function fmtDate(iso?: string | null): string {
  if (!iso) return "Date not available";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "Date not available" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
const sgn = (v?: number | null, d = 1) => (v == null ? "-" : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`);

function Readings({ c, withStates }: { c: ReadingCells; withStates?: boolean }) {
  if (!c || !c.date) return <span className="text-foreground-faint">Not available</span>;
  return (
    <div className="space-y-0.5 text-[12px] leading-snug">
      <div className="text-foreground-faint">{fmtDate(c.date)}</div>
      <div>
        Trend {sgn(c.trend_10d)} · Vol {c.volume_ratio == null ? "-" : `${c.volume_ratio.toFixed(2)}x`}
      </div>
      <div>
        RSI {c.rsi == null ? "-" : c.rsi.toFixed(0)} · Delivery {c.delivery_pct == null ? "-" : `${c.delivery_pct.toFixed(0)}%`}
      </div>
      {withStates && c.states && c.states.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {c.states.map((s) => (
            <span key={s} className="rounded-full bg-neutral-bg px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
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

  const access = cfg?.access;
  const custom = !!access?.custom_filters;
  const matchValue: MatchMode = signals.length >= 2 && matchKind === "any" ? (`any${Math.min(anyN, signals.length)}` as MatchMode) : "all";

  const run = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setMsg(null);
      setLockText(null);
      try {
        const token = user ? await getToken() : null;
        const env = await runHistoryQuery(body, { token });
        setResult(env.data);
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
          listSavedFilters({ token }).then((r) => live && setSaved(r.data)).catch(() => undefined);
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
    setMove(f.params.move);
    setDirection(f.params.direction);
    setSignals(f.params.signals);
    setMatchKind(f.params.match.startsWith("any") ? "any" : "all");
    if (f.params.match.startsWith("any")) setAnyN(Number(f.params.match.slice(3)) || 2);
    setScope(f.params.scope);
    setSymbol(f.params.symbol ?? "");
    setStockText(f.params.symbol ?? "");
    setSector(f.params.sector ?? "");
    setPeriod(f.params.period);
    setLimit(10);
    run({ ...f.params, limit: 10 });
  }

  const dirs = useMemo(() => (result ? (Object.keys(result.summaries) as ("up" | "down")[]) : []), [result]);
  const tableRows: HistoryRow[] = result?.table ?? [];

  if (cfgError) return <p className="text-sm text-foreground-muted">{cfgError}</p>;
  if (!cfg) return <p className="text-sm text-foreground-muted">Loading…</p>;

  const scopeOk = (s: HistoryScope) => cfg.access.scopes.includes(s);

  return (
    <div className="space-y-5" data-testid="history-explorer">
      {/* Examples */}
      <section className="rounded-2xl border border-border bg-surface-raised p-4 sm:p-5">
        <h2 className="mb-2 text-sm font-semibold">{HISTORY_EXAMPLES_TITLE}</h2>
        <div className="flex flex-wrap gap-2" data-testid="history-examples">
          {cfg.examples.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => chooseExample(e.id)}
              className={`rounded-full border px-3 py-1.5 text-left text-xs leading-snug ${example === e.id ? "border-accent bg-accent/10 text-foreground" : "border-border bg-hover text-foreground-muted hover:text-foreground"}`}
            >
              {e.label}
            </button>
          ))}
        </div>
        {!custom && <p className="mt-3 text-xs text-foreground-faint">Examples use all stocks over three years.</p>}
      </section>

      {/* Custom filter */}
      <section className="rounded-2xl border border-border bg-surface-raised p-4 sm:p-5" aria-label="Custom filter">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Custom filter</h2>
          {!custom && (
            <span className="flex items-center gap-1 text-xs text-foreground-faint">
              <Lock size={12} /> Basic and Pro
            </span>
          )}
        </div>
        {!custom && (
          <p className="mb-3 text-xs text-foreground-muted" data-testid="history-locked">
            {cfg.access.locked_text}{" "}
            <Link href="/pricing" className="font-medium text-accent">
              See plans
            </Link>
          </p>
        )}
        <fieldset disabled={!custom} className="space-y-4 disabled:opacity-60">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-foreground-muted">
              Move size on the day
              <select className={`${FIELD} mt-1 block`} value={move} onChange={(e) => { setExample(null); setMove(Number(e.target.value)); }} data-testid="history-move">
                {cfg.moves.map((m) => (
                  <option key={m} value={m}>
                    {m}% or more
                  </option>
                ))}
              </select>
            </label>
            <div className="text-xs text-foreground-muted">
              Direction
              <div className="mt-1 flex overflow-hidden rounded-lg border border-border" role="group" aria-label="Direction">
                {(["up", "down", "either"] as HistoryDirection[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { setExample(null); setDirection(d); }}
                    aria-pressed={direction === d}
                    className={`px-3 py-1.5 text-xs font-medium ${direction === d ? "bg-accent/15 text-foreground" : "bg-surface text-foreground-muted"}`}
                  >
                    {d === "up" ? "Up" : d === "down" ? "Down" : "Either"}
                  </button>
                ))}
              </div>
            </div>
            <label className="text-xs text-foreground-muted">
              Period
              <select className={`${FIELD} mt-1 block`} value={period} onChange={(e) => setPeriod(e.target.value as "3y" | "1y")}>
                <option value="3y">Last 3 years</option>
                <option value="1y">Last 1 year</option>
              </select>
            </label>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-foreground-muted">Readings the day before the move (optional)</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" data-testid="history-readings">
              {cfg.readings.map((r) => (
                <label key={r.key} className="flex items-start gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm" title={r.rule}>
                  <input type="checkbox" className="mt-0.5" checked={signals.includes(r.key)} onChange={() => toggleSignal(r.key)} />
                  <span>
                    {r.label}
                    <span className="block text-[11px] leading-snug text-foreground-faint">{r.rule}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-foreground-faint" data-testid="history-building">
              {HISTORY_BUILDING}
            </p>
            {signals.length >= 2 && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="match" checked={matchKind === "all"} onChange={() => setMatchKind("all")} /> All ticked
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="match" checked={matchKind === "any"} onChange={() => setMatchKind("any")} /> Any
                  <select className={`${FIELD} py-0.5`} value={anyN} onChange={(e) => setAnyN(Number(e.target.value))} disabled={matchKind !== "any"}>
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
            <label className="text-xs text-foreground-muted">
              Stocks
              <select className={`${FIELD} mt-1 block`} value={scope} onChange={(e) => { setExample(null); setScope(e.target.value as HistoryScope); }} data-testid="history-scope">
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
                  className={`${FIELD} w-full`}
                  placeholder="Search a stock by name or symbol"
                  value={stockText}
                  onChange={(e) => { setStockText(e.target.value); setSymbol(""); }}
                  aria-label="Stock"
                  data-testid="history-stock"
                />
                {hits.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-surface-raised shadow-md">
                    {hits.map((h) => (
                      <li key={h.symbol}>
                        <button type="button" className="w-full px-3 py-1.5 text-left text-sm hover:bg-hover" onClick={() => { setSymbol(h.symbol); setStockText(h.symbol); setHits([]); }}>
                          {h.symbol} <span className="text-foreground-faint">{h.company_name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {scope === "sector" && (
              <select className={`${FIELD} w-full`} value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector">
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
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className={`${BTN} bg-accent text-accent-foreground`} onClick={onShow} disabled={busy} data-testid="history-run">
            {busy ? "Working…" : "Show past days"}
          </button>
          {lockText && <span className="text-xs text-foreground-muted">{lockText}</span>}
        </div>
      </section>

      {msg && !lockText && <p className="text-sm text-down" role="alert">{msg}</p>}

      {/* Result */}
      {result && (
        <section className="space-y-4 rounded-2xl border border-border bg-surface-raised p-4 sm:p-5" aria-live="polite" data-testid="history-result">
          <div>
            <h2 className="text-sm font-semibold">{result.scope.label}</h2>
            <p className="text-xs text-foreground-faint">
              {result.params.period === "3y" ? "Last 3 years" : "Last 1 year"} to {fmtDate(result.as_of)}
              {result.scope.stocks ? ` · ${result.scope.stocks} stocks` : ""}
            </p>
          </div>

          {result.today && (
            <div className="rounded-lg border border-border bg-hover px-3 py-2" data-testid="history-today">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Today</p>
              <Readings c={result.today} withStates />
            </div>
          )}

          <div className="space-y-3">
            {dirs.map((d) => (
              <SummaryBlock key={d} dir={d} s={result.summaries[d]!} p={result.params} heading={dirs.length > 1} />
            ))}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Past days, newest first</p>
            {tableRows.length === 0 ? (
              <p className="text-sm text-foreground-muted">No past days found for this filter.</p>
            ) : (
              <>
                {/* phones: one card per day */}
                <ul className="space-y-2 sm:hidden" data-testid="history-cards">
                  {tableRows.map((r) => (
                    <li key={`${r.symbol}-${r.date}`} className="rounded-lg border border-border bg-surface px-3 py-2">
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {fmtDate(r.date)}
                          {result.scope.kind !== "stock" && <span className="ml-2 text-xs font-normal text-foreground-muted">{r.symbol}</span>}
                        </span>
                        <span className={`text-sm font-semibold ${r.move >= 0 ? "text-up" : "text-down"}`}>{sgn(r.move, 2)}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-foreground-faint">Day before</p>
                          <Readings c={r.day_before} withStates />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-foreground-faint">Day of the move</p>
                          <Readings c={r.day_of} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-foreground-faint">Day after</p>
                          <Readings c={r.day_after} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {/* wider screens: a table */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[720px] text-left" data-testid="history-table">
                    <thead>
                      <tr className="border-b border-border text-[11px] uppercase text-foreground-faint">
                        <th className="py-1.5 pr-3 font-semibold">Date</th>
                        <th className="py-1.5 pr-3 font-semibold">Move</th>
                        <th className="py-1.5 pr-3 font-semibold">Day before</th>
                        <th className="py-1.5 pr-3 font-semibold">Day of the move</th>
                        <th className="py-1.5 font-semibold">Day after</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((r) => (
                        <tr key={`${r.symbol}-${r.date}`} className="border-b border-border align-top">
                          <td className="py-2 pr-3 text-sm">
                            {fmtDate(r.date)}
                            {result.scope.kind !== "stock" && <div className="text-xs text-foreground-muted">{r.symbol}</div>}
                          </td>
                          <td className={`py-2 pr-3 text-sm font-semibold ${r.move >= 0 ? "text-up" : "text-down"}`}>{sgn(r.move, 2)}</td>
                          <td className="py-2 pr-3"><Readings c={r.day_before} withStates /></td>
                          <td className="py-2 pr-3"><Readings c={r.day_of} /></td>
                          <td className="py-2"><Readings c={r.day_after} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {result.table_more && limit < result.rows_limit && (
                <button type="button" className={BTN} onClick={showMore} disabled={busy} data-testid="history-more">
                  Show more
                </button>
              )}
              {result.table_more && limit >= result.rows_limit && !cfg.access.saved_filters && (
                <span className="text-xs text-foreground-muted">
                  {cfg.access.plan === "basic" ? "Showing the most rows your plan includes. " : `Showing the first ${result.rows_limit} rows. Basic and Pro show more. `}
                  <Link href="/pricing" className="font-medium text-accent">See plans</Link>
                </span>
              )}
              {cfg.access.csv && (
                <button type="button" className={`${BTN} flex items-center gap-1`} onClick={onCsv}>
                  <Download size={12} /> Download CSV
                </button>
              )}
            </div>
          </div>

          {cfg.access.saved_filters && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <input className={`${FIELD} w-44`} placeholder="Name this filter" value={saveName} onChange={(e) => setSaveName(e.target.value)} maxLength={60} aria-label="Filter name" />
              <button type="button" className={`${BTN} flex items-center gap-1`} onClick={onSave} disabled={!saveName.trim()}>
                <Save size={12} /> Save filter
              </button>
            </div>
          )}
        </section>
      )}

      {cfg.access.saved_filters && saved.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface-raised p-4 sm:p-5" data-testid="history-saved">
          <h2 className="mb-2 text-sm font-semibold">Saved filters</h2>
          <ul className="divide-y divide-border">
            {saved.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <button type="button" className="text-left font-medium hover:text-accent" onClick={() => openSaved(f)}>
                  {f.name}
                  <span className="ml-2 text-xs font-normal text-foreground-faint">
                    {f.params.move}% {f.params.direction}
                  </span>
                </button>
                <button type="button" className="text-foreground-faint hover:text-down" onClick={() => onDelete(f.id)} aria-label={`Delete ${f.name}`}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-foreground-muted">{HISTORY_CHANCE_NOTE}</p>
      <p className="text-xs font-medium text-foreground-muted" data-testid="history-disclaimer">
        {HISTORY_DISCLAIMER}
      </p>
    </div>
  );
}
