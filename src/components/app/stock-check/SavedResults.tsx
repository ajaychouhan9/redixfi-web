"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { deleteRuleRun, downloadRunReport, getRuleRun, listRuleRuns, type MyScreen, type RuleAnswer, type RuleRun } from "@/lib/api/mutations";
import { ASK_GROUP_MAX, askStatusText, nextNotAsked } from "@/lib/ask-group";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPaidEntitled } from "@/lib/entitlements";
import { fmtDay } from "@/lib/my-rules";
import { SAMPLE_PDF_PATH, SAMPLE_REPORT } from "@/lib/rule-answers";
import {
  REPORT_CSV, REPORT_FAILED, REPORT_FREE, REPORT_LEAD, REPORT_PDF, REPORT_STOCK_PDF, RESULTS_NONE, RESULT_ANSWERS_NONE, RESULT_ANSWERS_TITLE, RESULT_COUNT_LINE, RESULT_DELETE,
  RESULT_EARLIER, RESULT_GROUPS_NONE, RESULT_GROUP_COUNT, RESULT_HIDE, RESULT_LIMIT_LINE, RESULT_SINCE, RESULT_VIEW,
  DL_CSV, DL_FREE, DL_REPORT, OVER_LIMIT_LINE, SAVED_RESULT_HINT, SEE_PLANS, TICK_NEXT_8, TICK_NEXT_NONE,
} from "@/lib/saved-results";
import { AnswerItem } from "@/components/app/stock-check/RuleReport";

const btn = "min-h-[44px] rounded-lg border border-border px-3 text-sm font-medium hover:border-accent disabled:opacity-60";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function failText(e: unknown): string {
  const d = e instanceof ApiError ? (e.detail as { message?: string } | string | undefined) : undefined;
  if (typeof d === "string" && d) return d;
  return (d && typeof d === "object" && d.message) || REPORT_FAILED;
}

/** "Download full report" (PDF) and "Download CSV" for one saved result (paid plans and the Pro trial); Free accounts get the stored sample. The report covers the ticked stocks (up to 8). */
export function ReportDownload({ ruleId, runId, selected }: { ruleId: string; runId: string; selected: string[] }) {
  const { user, getToken } = useAuth();
  const paid = isPaidEntitled(user);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  async function report(kind: "pdf" | "csv") {
    setBusy(kind);
    setMsg(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("login");
      const { blob, filename } = await downloadRunReport(ruleId, runId, kind, selected, token);
      saveBlob(blob, filename ?? `redixfi-rule-report.${kind}`);
    } catch (e) {
      setMsg(failText(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      {paid ? (
        <>
          <button type="button" onClick={() => void report("pdf")} disabled={busy !== null} className={btn} data-testid="saved-result-pdf">{busy === "pdf" ? "Preparing…" : REPORT_PDF}</button>
          <button type="button" onClick={() => void report("csv")} disabled={busy !== null} className={btn} data-testid="saved-result-csv">{busy === "csv" ? "Preparing…" : REPORT_CSV}</button>
        </>
      ) : (
        <>
          <a href={SAMPLE_PDF_PATH} target="_blank" rel="noopener noreferrer" className={`${btn} inline-flex items-center`} data-testid="saved-result-sample">{SAMPLE_REPORT}</a>
          <span className="basis-full text-xs text-foreground-muted" data-testid="saved-result-free-note">{REPORT_FREE}</span>
        </>
      )}
      {msg && <span className="basis-full text-sm text-foreground-muted" role="status" data-testid="saved-results-msg">{msg}</span>}
    </>
  );
}

/** "Download PDF" on one stock: the page of that one stock only (its figures and its five answers, or "Not asked yet"). Paid plans only. */
export function StockPdfButton({ ruleId, runId, symbol }: { ruleId: string; runId: string; symbol: string }) {
  const { user, getToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!isPaidEntitled(user)) return null;
  async function go() {
    setBusy(true);
    setMsg(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("login");
      const { blob, filename } = await downloadRunReport(ruleId, runId, "pdf", [symbol], token, true);
      saveBlob(blob, filename ?? `redixfi-${symbol.toLowerCase()}.pdf`);
    } catch (e) {
      setMsg(failText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" onClick={() => void go()} disabled={busy} className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-4 text-sm font-medium hover:border-accent disabled:opacity-60" data-testid="stock-pdf" aria-label={`${REPORT_STOCK_PDF} for ${symbol}`}>
        {busy ? "Preparing…" : REPORT_STOCK_PDF}
      </button>
      {msg && <span className="basis-full text-xs text-foreground-muted" role="status" data-testid="stock-pdf-msg">{msg}</span>}
    </>
  );
}

/** "Download report" and "Download CSV" for one result, used in the warnings before a result is replaced, removed or deleted with its rule. Free accounts get the plain message and the plans link. */
export function DialogDownloads({ ruleId, runId }: { ruleId: string; runId: string }) {
  const { user, getToken } = useAuth();
  const paid = isPaidEntitled(user);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  async function go(kind: "pdf" | "csv") {
    setMsg(null);
    if (!paid) return setMsg(DL_FREE);
    setBusy(kind);
    try {
      const token = await getToken();
      if (!token) throw new Error("login");
      const { blob, filename } = await downloadRunReport(ruleId, runId, kind, [], token);
      saveBlob(blob, filename ?? `redixfi-rule-report.${kind}`);
    } catch (e) {
      setMsg(failText(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <button type="button" onClick={() => void go("pdf")} disabled={busy !== null} className={btn} data-testid="dialog-dl-report">{busy === "pdf" ? "Preparing…" : DL_REPORT}</button>
      <button type="button" onClick={() => void go("csv")} disabled={busy !== null} className={btn} data-testid="dialog-dl-csv">{busy === "csv" ? "Preparing…" : DL_CSV}</button>
      {msg && (
        <span className="basis-full text-xs text-foreground-muted" role="status" data-testid="dialog-dl-msg">
          {msg}{!paid && <> <Link href="/pricing" className="font-medium text-accent hover:underline">{SEE_PLANS}</Link></>}
        </span>
      )}
    </>
  );
}

/** The button that ticks the next 8 stocks not yet asked (only for lists longer than 8). */
export function TickNext8({ symbols, answers, onSet }: { symbols: string[]; answers: RuleAnswer[] | null; onSet: (list: string[]) => void }) {
  const [none, setNone] = useState(false);
  if (symbols.length <= ASK_GROUP_MAX) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="tick-next-8-wrap">
      <button
        type="button"
        onClick={() => {
          const next = nextNotAsked(symbols, answers);
          setNone(next.length === 0);
          if (next.length) onSet(next);
        }}
        className={btn}
        data-testid="tick-next-8"
      >
        {TICK_NEXT_8}
      </button>
      {none && <span className="text-xs text-foreground-muted" role="status" data-testid="tick-next-none">{TICK_NEXT_NONE}</span>}
    </div>
  );
}

export interface AskSlot {
  ruleId: string;
  ruleName: string;
  runId: string;
  symbols: string[];
}
export interface ResultFocus {
  ruleId: string;
  ruleName: string;
  runId: string;
}

interface Props {
  ruleId: string;
  ruleName: string;
  /** Changes when a result was saved, so the list is read again. */
  refreshKey: number;
  /** The stocks ticked in the card named `owner` (the run id), up to 8. */
  selectedFor: (owner: string) => string[];
  onTick: (owner: string, symbol: string, f: ResultFocus) => void;
  onSetSelected: (owner: string, list: string[], f: ResultFocus) => void;
  /** The Ask AI card shown inside an opened result. */
  renderAsk: (slot: AskSlot) => ReactNode;
  answersByRun: Record<string, RuleAnswer[]>;
  loadAnswers: (ruleId: string, runId: string) => void;
  /** Open the newest result of this rule by itself when this number changes (the "View stocks" button on the rule page). */
  viewNonce: number;
  /** Called when the list is read, so the rule page knows how many results the rule has. */
  onCount?: (ruleId: string, n: number) => void;
}

/** The results saved for one saved rule, newest first: date, number of stocks, figures date, "earlier values", what was added and dropped since the result before,
 *  the stocks with their Ask AI status, the Ask AI card, the answers and the reports. */
export function SavedResults({ ruleId, ruleName, refreshKey, selectedFor, onTick, onSetSelected, renderAsk, answersByRun, loadAnswers, viewNonce, onCount }: Props) {
  const { user, getToken } = useAuth();
  const paid = isPaidEntitled(user);
  const [runs, setRuns] = useState<RuleRun[] | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [stocksByRun, setStocksByRun] = useState<Record<string, { symbol: string; company: string }[]>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const r = await listRuleRuns(token, ruleId);
      setRuns(r.runs);
      setLimit(r.limit);
      onCount?.(ruleId, r.runs.length);
    } catch {
      setMsg("The saved results could not be loaded right now.");
    }
  }, [getToken, ruleId, onCount]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [ruleId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = useCallback(async (id: string) => {
    setMsg(null);
    try {
      const token = await getToken();
      if (!token) return;
      const d = await getRuleRun(token, ruleId, id);
      setStocksByRun((m) => ({ ...m, [id]: d.stocks.map((s) => ({ symbol: s.symbol, company: s.company })) }));
      setViewing(id);
      loadAnswers(ruleId, id);
    } catch {
      setMsg("That result could not be opened right now.");
    }
  }, [getToken, ruleId, loadAnswers]);
  // "View stocks" on the rule page opens the newest result
  const consumed = useRef(0);
  useEffect(() => {
    if (viewNonce > 0 && consumed.current !== viewNonce && runs && runs.length) {
      consumed.current = viewNonce;
      void open(runs[0].id);
    }
  }, [viewNonce, runs?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // an open result reads its answers again when a result was saved or answers were added
  useEffect(() => {
    if (viewing) loadAnswers(ruleId, viewing);
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id: string) {
    setConfirmDelete(null);
    try {
      const token = await getToken();
      if (!token) return;
      await deleteRuleRun(token, ruleId, id);
      if (viewing === id) setViewing(null);
      await load();
    } catch {
      setMsg("That result could not be removed right now.");
    }
  }
  if (runs === null) return msg ? <p className="text-sm text-foreground-muted" role="status">{msg}</p> : null;
  const over = limit !== null && runs.length > limit;
  return (
    <section className="space-y-3" aria-label={`Saved results for ${ruleName}`} data-testid="saved-results">
      <p className="text-xs text-foreground-muted" data-testid="saved-results-limit">{limit !== null ? RESULT_LIMIT_LINE(limit, runs.length) : ""}</p>
      {over && limit !== null && <p className="text-sm text-foreground-muted" role="status" data-testid="saved-results-over">{OVER_LIMIT_LINE(limit, runs.length)}</p>}
      {runs.length === 0 && <p className="text-sm text-foreground-muted" data-testid="saved-results-none">{RESULTS_NONE}</p>}
      <ul className="space-y-2">
        {runs.map((r) => {
          const stocks = stocksByRun[r.id] ?? [];
          const answers = answersByRun[r.id] ?? null;
          const f = { ruleId, ruleName, runId: r.id };
          const sel = selectedFor(r.id);
          return (
            <li key={r.id} className={`rounded-lg border px-3 py-2 text-sm ${viewing === r.id ? "border-accent" : "border-border"}`} data-testid="saved-result" data-run={r.id}>
              <p className="font-medium" data-testid="saved-result-line">{RESULT_COUNT_LINE(fmtDay(r.run_date) ?? r.run_date, r.count, fmtDay(r.as_of))}</p>
              {r.earlier_values && <p className="text-xs text-foreground-muted" data-testid="saved-result-earlier">{RESULT_EARLIER}</p>}
              {r.added !== null && r.dropped !== null && <p className="text-xs text-foreground-muted" data-testid="saved-result-diff">{RESULT_SINCE(fmtDay(r.since) ?? "", r.added, r.dropped)}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => (viewing === r.id ? setViewing(null) : void open(r.id))} aria-expanded={viewing === r.id} className={btn} data-testid="saved-result-view">{viewing === r.id ? RESULT_HIDE : RESULT_VIEW}</button>
                <ReportDownload ruleId={ruleId} runId={r.id} selected={sel} />
                {confirmDelete === r.id ? (
                  <>
                    <button type="button" onClick={() => void remove(r.id)} className={`${btn} border-accent`} data-testid="saved-result-delete-confirm">{RESULT_DELETE}</button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className={btn}>Keep it</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(r.id)} className={`${btn} text-foreground-muted`} data-testid="saved-result-delete">Delete</button>
                )}
              </div>
              {confirmDelete === r.id && <p className="mt-1 text-xs text-foreground-muted" data-testid="saved-result-delete-note">The Ask AI answers saved with this result are deleted too.</p>}
              {viewing === r.id && (
                <div className="mt-2 space-y-3" data-testid="saved-result-stocks">
                  <div className="space-y-2">
                    <p className="text-xs text-foreground-muted">{SAVED_RESULT_HINT}</p>
                    <TickNext8 symbols={stocks.map((s) => s.symbol)} answers={answers} onSet={(l) => onSetSelected(r.id, l, f)} />
                    <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                      {stocks.map((s) => (
                        <li key={s.symbol} className="flex flex-wrap items-center gap-x-2 px-3" data-testid="result-stock">
                          <label className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-sm">
                            <input type="checkbox" checked={sel.includes(s.symbol)} onChange={() => onTick(r.id, s.symbol, f)} className="h-5 w-5 shrink-0" aria-label={`Select ${s.symbol}`} />
                            <span className="font-medium">{s.symbol}</span>
                            <span className="min-w-0 truncate text-foreground-muted">{s.company}</span>
                          </label>
                          <span className="text-xs text-foreground-muted" data-testid="stock-ask-status">{askStatusText(answers, s.symbol)}</span>
                          {paid && <StockPdfButton ruleId={ruleId} runId={r.id} symbol={s.symbol} />}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {renderAsk({ ruleId, ruleName, runId: r.id, symbols: stocks.map((s) => s.symbol) })}
                  <div data-testid="saved-result-answers">
                    <p className="flex items-center gap-1 text-sm font-semibold"><ChevronDown size={14} aria-hidden /> {RESULT_ANSWERS_TITLE(answers ? answers.length : r.answers)}</p>
                    {answers && answers.length === 0 && <p className="mt-1 text-xs text-foreground-muted" data-testid="saved-result-answers-none">{RESULT_ANSWERS_NONE}</p>}
                    {answers && answers.length > 0 && (
                      <ul className="mt-2 space-y-2">
                        {answers.map((a) => (
                          <AnswerItem key={a.id} a={a} onRemove={() => undefined} readOnly />
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-foreground-muted" data-testid="saved-results-report-note">{paid ? REPORT_LEAD : REPORT_FREE}</p>
      {msg && <p className="text-sm text-foreground-muted" role="status" data-testid="saved-results-msg">{msg}</p>}
    </section>
  );
}

interface GroupsProps {
  rules: MyScreen[];
  /** The rule page's open rule (its group starts opened) and the "View stocks" request. */
  activeId: string | null;
  viewRule: { ruleId: string; nonce: number } | null;
  refreshKey: number;
  selectedFor: (owner: string) => string[];
  onTick: Props["onTick"];
  onSetSelected: Props["onSetSelected"];
  renderAsk: Props["renderAsk"];
  answersByRun: Record<string, RuleAnswer[]>;
  loadAnswers: (ruleId: string, runId: string) => void;
  onCount?: Props["onCount"];
}

/** The saved results of every saved rule, grouped by rule (newest result first inside each, with its date). The rule being viewed starts opened. */
export function ResultsByRule({ rules, activeId, viewRule, refreshKey, selectedFor, onTick, onSetSelected, renderAsk, answersByRun, loadAnswers, onCount }: GroupsProps) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const startId = viewRule?.ruleId ?? activeId;
  const isOpen = (id: string) => openIds.includes(id) || (startId === id && !openIds.includes(`-${id}`));
  function toggle(id: string) {
    setOpenIds((l) => {
      const open = isOpen(id);
      const cleaned = l.filter((x) => x !== id && x !== `-${id}`);
      return open ? [...cleaned, `-${id}`] : [...cleaned, id];
    });
  }
  return (
    <section className="space-y-2" aria-labelledby="saved-results-title" data-testid="saved-results-by-rule">
      <h3 id="saved-results-title" className="text-base font-semibold">Saved results</h3>
      {rules.length === 0 && <p className="text-sm text-foreground-muted" data-testid="saved-results-groups-none">{RESULT_GROUPS_NONE}</p>}
      <ul className="space-y-2">
        {rules.map((r) => (
          <li key={r.id} className="rounded-xl border border-border bg-surface" data-testid="results-group" data-rule={r.id}>
            <button type="button" onClick={() => toggle(r.id)} aria-expanded={isOpen(r.id)} className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-2 text-left" data-testid="results-group-toggle">
              <span className="min-w-0 break-words text-sm font-semibold">{r.name}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-foreground-muted">
                {RESULT_GROUP_COUNT}
                <ChevronDown size={14} className={isOpen(r.id) ? "rotate-180" : ""} aria-hidden />
              </span>
            </button>
            {isOpen(r.id) && (
              <div className="border-t border-border px-4 pb-4 pt-3">
                <SavedResults
                  ruleId={r.id}
                  ruleName={r.name}
                  refreshKey={refreshKey}
                  selectedFor={selectedFor}
                  onTick={onTick}
                  onSetSelected={onSetSelected}
                  renderAsk={renderAsk}
                  answersByRun={answersByRun}
                  loadAnswers={loadAnswers}
                  viewNonce={viewRule && viewRule.ruleId === r.id ? viewRule.nonce : 0}
                  onCount={onCount}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
