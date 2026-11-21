"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { deleteRuleRun, downloadRunReport, getRuleRun, listRuleRuns, type RuleRun } from "@/lib/api/mutations";
import { ASK_GROUP_MAX } from "@/lib/ask-group";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPaidEntitled } from "@/lib/entitlements";
import { fmtDay } from "@/lib/my-rules";
import { SAMPLE_PDF_PATH, SAMPLE_REPORT } from "@/lib/rule-answers";
import {
  REPORT_CSV, REPORT_FAILED, REPORT_FREE, REPORT_LEAD, REPORT_PDF, RESULTS_NONE, RESULTS_TITLE, RESULT_COUNT_LINE, RESULT_DELETE, RESULT_EARLIER, RESULT_HIDE,
  RESULT_LIMIT_LINE, RESULT_SINCE, RESULT_VIEW,
} from "@/lib/saved-results";

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
}

/** The results saved for one saved rule: date, number of stocks, figures date, "earlier values", what was added and dropped since the result before, and the combined report. */
export function SavedResults({ ruleId, ruleName, refreshKey, selected, onTick, currentRunId, onChoose }: Props) {
  const { user, getToken } = useAuth();
  const paid = isPaidEntitled(user);
  const [runs, setRuns] = useState<RuleRun[] | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [stocks, setStocks] = useState<{ symbol: string; company: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const r = await listRuleRuns(token, ruleId);
      setRuns(r.runs);
      setLimit(r.limit);
      if (r.runs.length && !r.runs.some((x) => x.id === currentRunId)) onChoose(r.runs[0].id);
      if (!r.runs.length && currentRunId) onChoose(null);
    } catch {
      setMsg("The saved results could not be loaded right now.");
    }
  }, [getToken, ruleId, currentRunId, onChoose]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [ruleId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function view(r: RuleRun) {
    if (viewing === r.id) return setViewing(null);
    setMsg(null);
    try {
      const token = await getToken();
      if (!token) return;
      const d = await getRuleRun(token, ruleId, r.id);
      setStocks(d.stocks.map((s) => ({ symbol: s.symbol, company: s.company })));
      setViewing(r.id);
      onChoose(r.id);
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
  async function report(runId: string, kind: "pdf" | "csv") {
    setBusy(`${runId}:${kind}`);
    setMsg(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("login");
      const { blob, filename } = await downloadRunReport(ruleId, runId, kind, selected, token);
      saveBlob(blob, filename ?? `redixfi-rule-report.${kind}`);
    } catch (e) {
      const d = e instanceof ApiError ? (e.detail as { message?: string } | undefined) : undefined;
      setMsg(d?.message ?? REPORT_FAILED);
    } finally {
      setBusy(null);
    }
  }

  if (runs === null) return msg ? <p className="text-sm text-foreground-muted" role="status">{msg}</p> : null;
  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4" aria-labelledby="saved-results-title" data-testid="saved-results">
      <h3 id="saved-results-title" className="text-base font-semibold">{RESULTS_TITLE(ruleName)}</h3>
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
              {paid ? (
                <>
                  <button type="button" onClick={() => void report(r.id, "pdf")} disabled={busy !== null} className={btn} data-testid="saved-result-pdf">{busy === `${r.id}:pdf` ? "Preparing…" : REPORT_PDF}</button>
                  <button type="button" onClick={() => void report(r.id, "csv")} disabled={busy !== null} className={btn} data-testid="saved-result-csv">{busy === `${r.id}:csv` ? "Preparing…" : REPORT_CSV}</button>
                </>
              ) : (
                <a href={SAMPLE_PDF_PATH} target="_blank" rel="noopener noreferrer" className={`${btn} inline-flex items-center`} data-testid="saved-result-sample">{SAMPLE_REPORT}</a>
              )}
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
              <div className="mt-2" data-testid="saved-result-stocks">
                <p className="text-xs text-foreground-muted">{`Tick up to ${ASK_GROUP_MAX} stocks for Ask AI and for the report.`}</p>
                <ul className="mt-1 max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {stocks.map((s) => (
                    <li key={s.symbol}>
                      <label className="flex min-h-[44px] items-center gap-2 px-3 text-sm">
                        <input type="checkbox" checked={selected.includes(s.symbol)} onChange={() => onTick(s.symbol)} className="h-5 w-5 shrink-0" aria-label={`Select ${s.symbol}`} />
                        <span className="font-medium">{s.symbol}</span>
                        <span className="min-w-0 truncate text-foreground-muted">{s.company}</span>
                      </label>
                    </li>
                  ))}
                </ul>
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
