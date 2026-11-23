"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { deleteRuleRun, downloadRunReport, getRuleRun, listRuleAnswers, listRuleRuns, type MyScreen, type RuleAnswer, type RuleRun } from "@/lib/api/mutations";
import { ASK_GROUP_MAX } from "@/lib/ask-group";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPaidEntitled } from "@/lib/entitlements";
import { fmtDay } from "@/lib/my-rules";
import { SAMPLE_PDF_PATH, SAMPLE_REPORT } from "@/lib/rule-answers";
import {
  REPORT_CSV, REPORT_FAILED, REPORT_FREE, REPORT_LEAD, REPORT_PDF, REPORT_STOCK_PDF, RESULTS_NONE, RESULT_ANSWERS_NONE, RESULT_ANSWERS_TITLE, RESULT_COUNT_LINE, RESULT_DELETE,
  RESULT_EARLIER, RESULT_GROUPS_NONE, RESULT_GROUP_COUNT, RESULT_HIDE, RESULT_LIMIT_LINE, RESULT_SINCE, RESULT_VIEW,
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

interface Props {
  ruleId: string;
  ruleName: string;
  /** Changes when a result was saved, so the list is read again. */
  refreshKey: number;
  /** The stocks ticked for Ask AI (up to 8); a report covers these. */
  selected: string[];
  onTick: (symbol: string) => void;
  /** The result the Ask AI block and its reports belong to. */
  currentRunId: string | null;
  onChoose: (runId: string | null) => void;
  /** Choose the newest result by itself when none of this rule's results is chosen (only for the rule that is open). */
  autoChoose?: boolean;
}

/** The results saved for one saved rule: date, number of stocks, figures date, "earlier values", what was added and dropped since the result before, the Ask AI answers and the reports. */
export function SavedResults({ ruleId, ruleName, refreshKey, selected, onTick, currentRunId, onChoose, autoChoose = false }: Props) {
  const { user, getToken } = useAuth();
  const paid = isPaidEntitled(user);
  const [runs, setRuns] = useState<RuleRun[] | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [stocks, setStocks] = useState<{ symbol: string; company: string }[]>([]);
  const [answers, setAnswers] = useState<RuleAnswer[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const r = await listRuleRuns(token, ruleId);
      setRuns(r.runs);
      setLimit(r.limit);
      if (autoChoose && r.runs.length && !r.runs.some((x) => x.id === currentRunId)) onChoose(r.runs[0].id);
      if (!r.runs.length && currentRunId) onChoose(null);
    } catch {
      setMsg("The saved results could not be loaded right now.");
    }
  }, [getToken, ruleId, currentRunId, onChoose, autoChoose]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [ruleId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function view(r: RuleRun) {
    if (viewing === r.id) return setViewing(null);
    setMsg(null);
    setAnswers(null);
    try {
      const token = await getToken();
      if (!token) return;
      const d = await getRuleRun(token, ruleId, r.id);
      setStocks(d.stocks.map((s) => ({ symbol: s.symbol, company: s.company })));
      setViewing(r.id);
      onChoose(r.id);
      const a = await listRuleAnswers(token, ruleId, r.id).catch(() => null);
      setAnswers(a ? a.answers : []);
    } catch {
      setMsg("That result could not be opened right now.");
    }
  }
  async function remove(id: string) {
    setConfirmDelete(null);
    try {
      const token = await getToken();
      if (!token) return;
      await deleteRuleRun(token, ruleId, id);
      if (viewing === id) setViewing(null);
      if (currentRunId === id) onChoose(null);
      await load();
    } catch {
      setMsg("That result could not be removed right now.");
    }
  }
  if (runs === null) return msg ? <p className="text-sm text-foreground-muted" role="status">{msg}</p> : null;
  return (
    <section className="space-y-3" aria-label={`Saved results for ${ruleName}`} data-testid="saved-results">
      <p className="text-xs text-foreground-muted" data-testid="saved-results-limit">{limit !== null ? RESULT_LIMIT_LINE(limit, runs.length) : ""}</p>
      {runs.length === 0 && <p className="text-sm text-foreground-muted" data-testid="saved-results-none">{RESULTS_NONE}</p>}
      <ul className="space-y-2">
        {runs.map((r) => (
          <li key={r.id} className={`rounded-lg border px-3 py-2 text-sm ${currentRunId === r.id ? "border-accent" : "border-border"}`} data-testid="saved-result" data-run={r.id}>
            <p className="font-medium" data-testid="saved-result-line">{RESULT_COUNT_LINE(fmtDay(r.run_date) ?? r.run_date, r.count, fmtDay(r.as_of))}</p>
            {r.earlier_values && <p className="text-xs text-foreground-muted" data-testid="saved-result-earlier">{RESULT_EARLIER}</p>}
            {r.added !== null && r.dropped !== null && <p className="text-xs text-foreground-muted" data-testid="saved-result-diff">{RESULT_SINCE(fmtDay(r.since) ?? "", r.added, r.dropped)}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => void view(r)} aria-expanded={viewing === r.id} className={btn} data-testid="saved-result-view">{viewing === r.id ? RESULT_HIDE : RESULT_VIEW}</button>
              <ReportDownload ruleId={ruleId} runId={r.id} selected={selected} />
              {confirmDelete === r.id ? (
                <>
                  <button type="button" onClick={() => void remove(r.id)} className={`${btn} border-accent`} data-testid="saved-result-delete-confirm">{RESULT_DELETE}</button>
                  <button type="button" onClick={() => setConfirmDelete(null)} className={btn}>Keep it</button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(r.id)} className={`${btn} text-foreground-muted`} data-testid="saved-result-delete">Delete</button>
              )}
            </div>
            {viewing === r.id && (
              <div className="mt-2 space-y-3" data-testid="saved-result-stocks">
                <div>
                  <p className="text-xs text-foreground-muted">{`Tick up to ${ASK_GROUP_MAX} stocks for Ask AI and for the report.`}</p>
                  <ul className="mt-1 max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                    {stocks.map((s) => (
                      <li key={s.symbol} className="flex flex-wrap items-center gap-x-2 px-3">
                        <label className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-sm">
                          <input type="checkbox" checked={selected.includes(s.symbol)} onChange={() => onTick(s.symbol)} className="h-5 w-5 shrink-0" aria-label={`Select ${s.symbol}`} />
                          <span className="font-medium">{s.symbol}</span>
                          <span className="min-w-0 truncate text-foreground-muted">{s.company}</span>
                        </label>
                        {paid && <StockPdfButton ruleId={ruleId} runId={r.id} symbol={s.symbol} />}
                      </li>
                    ))}
                  </ul>
                </div>
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
        ))}
      </ul>
      <p className="text-xs text-foreground-muted" data-testid="saved-results-report-note">{paid ? REPORT_LEAD : REPORT_FREE}</p>
      {msg && <p className="text-sm text-foreground-muted" role="status" data-testid="saved-results-msg">{msg}</p>}
    </section>
  );
}

interface GroupsProps {
  rules: MyScreen[];
  activeId: string | null;
  refreshKey: number;
  selected: string[];
  onTick: (symbol: string) => void;
  focus: { ruleId: string; ruleName: string; runId: string } | null;
  onFocus: (ruleId: string, ruleName: string, runId: string | null) => void;
}

/** The Results page: the saved results of every saved rule, grouped by rule (newest result first inside each). The open rule starts opened. */
export function ResultsByRule({ rules, activeId, refreshKey, selected, onTick, focus, onFocus }: GroupsProps) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const isOpen = (id: string) => openIds.includes(id) || (activeId === id && !openIds.includes(`-${id}`));
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
                  selected={selected}
                  onTick={onTick}
                  currentRunId={focus && focus.ruleId === r.id ? focus.runId : null}
                  onChoose={(runId) => onFocus(r.id, r.name, runId)}
                  autoChoose={activeId === r.id}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
