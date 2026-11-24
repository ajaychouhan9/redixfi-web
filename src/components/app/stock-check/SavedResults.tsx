"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { deleteRuleRun, downloadRunReport, getRuleRun, listRuleRuns, type MyScreen, type RuleRun } from "@/lib/api/mutations";
import { reportOnScreen, reportsActive, type OnScreenReport, type ReportJob } from "@/lib/api/report";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPaidEntitled } from "@/lib/entitlements";
import { fmtDay } from "@/lib/my-rules";
import {
  ADD_AI_LEAD, ADD_AI_MORE, BUILDING, BUILDING_LEAVE, DOWNLOAD, FREE_UPGRADE_DOWNLOAD, OPEN_ON_SCREEN, OPEN_REPORT, SEE_PRICING, SHELF_DELETE, SHELF_DELETE_CONFIRM, SHELF_DELETE_NOTE,
  SHELF_KEEP, SHELF_NONE, SHELF_STOCKS_LINE, SHELF_TITLE,
} from "@/lib/report-flow";
import { SAMPLE_PDF_PATH, SAMPLE_REPORT } from "@/lib/rule-answers";
import {
  DL_CSV, DL_FREE, DL_REPORT, OVER_LIMIT_LINE, REPORT_CSV, REPORT_FAILED, RESULT_COUNT_LINE, RESULT_EARLIER, RESULT_GROUP_COUNT, RESULT_GROUPS_NONE, RESULT_LIMIT_LINE, SEE_PLANS,
} from "@/lib/saved-results";
import { ReportSheet, type EnsureOut } from "@/components/app/stock-check/ReportSheet";
import { staticLoader, type NameItem } from "@/components/app/stock-check/StockNames";

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

/** The report of one result read on screen (every plan; Free cannot download). */
function OnScreen({ ruleId, runId }: { ruleId: string; runId: string }) {
  const { getToken } = useAuth();
  const [rep, setRep] = useState<OnScreenReport | null>(null);
  const [none, setNone] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const r = await reportOnScreen(token, ruleId, runId);
        setRep(r.report);
        setNone(r.answered_stocks === 0);
      } catch {
        setNone(true);
      }
    })();
  }, [getToken, ruleId, runId]);
  if (none) return <p className="mt-2 text-sm text-foreground-muted" data-testid="onscreen-none">This report has no AI answers yet.</p>;
  if (!rep) return <p className="mt-2 text-sm text-foreground-muted">Loading…</p>;
  return (
    <div className="mt-2 space-y-3" data-testid="onscreen-report">
      {rep.chosen.map((c) => (
        <section key={c.symbol} className="rounded-lg border border-border p-3" data-testid="onscreen-stock">
          <h5 className="text-sm font-semibold">{c.symbol}{c.company ? ` · ${c.company}` : ""}</h5>
          <ul className="mt-2 space-y-3">
            {c.slots.map((s) => (
              <li key={s.question} className="text-sm">
                <p className="font-medium">{s.question}</p>
                {s.asked ? (
                  <>
                    <p className="text-xs text-foreground-muted">Answer as of {s.date || "date not available"}</p>
                    <p className="mt-1 whitespace-pre-wrap">{s.text}</p>
                    {s.sources.length > 0 && <p className="mt-1 text-xs text-foreground-muted">Sources: {s.sources.map((x) => x.label).filter(Boolean).join("; ")}</p>}
                  </>
                ) : (
                  <p className="text-xs text-foreground-muted">Not asked yet</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface ShelfProps {
  rules: MyScreen[];
  refreshKey: number;
  /** A report finished or was added to: the shelf and the rule page read again. */
  onChanged: () => void;
}

/** One saved report on the shelf: its date, stocks and answers; Open PDF, Download, Add AI for more stocks, Delete. Free accounts read it on screen. */
function ShelfCard({ rule, run, building, onChanged }: { rule: MyScreen; run: RuleRun; building: ReportJob | null; onChanged: () => void }) {
  const { user, getToken } = useAuth();
  const paid = isPaidEntitled(user);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [screen, setScreen] = useState(false);
  const [adding, setAdding] = useState<NameItem[] | null>(null);

  async function fetchReport(kind: "pdf" | "csv") {
    const token = await getToken();
    if (!token) throw new Error("login");
    return downloadRunReport(rule.id, run.id, kind, [], token);
  }
  async function openPdf() {
    setBusy("open");
    setMsg(null);
    const w = window.open("", "_blank");
    try {
      const { blob } = await fetchReport("pdf");
      const url = URL.createObjectURL(blob);
      if (w) w.location.href = url;
      else saveBlob(blob, "redixfi-report.pdf");
    } catch (e) {
      w?.close();
      setMsg(failText(e));
    } finally {
      setBusy(null);
    }
  }
  async function download(kind: "pdf" | "csv") {
    setBusy(kind);
    setMsg(null);
    try {
      const { blob, filename } = await fetchReport(kind);
      saveBlob(blob, filename ?? `redixfi-report.${kind}`);
    } catch (e) {
      setMsg(failText(e));
    } finally {
      setBusy(null);
    }
  }
  async function remove() {
    setConfirm(false);
    try {
      const token = await getToken();
      if (!token) return;
      await deleteRuleRun(token, rule.id, run.id);
      onChanged();
    } catch {
      setMsg("That report could not be removed right now.");
    }
  }
  async function openAdd() {
    try {
      const token = await getToken();
      if (!token) return;
      const d = await getRuleRun(token, rule.id, run.id);
      setAdding(d.stocks.map((s) => ({ symbol: s.symbol, company: s.company })));
    } catch {
      setMsg("That report could not be opened right now.");
    }
  }
  const ensure = useCallback(async (): Promise<EnsureOut> => ({ kind: "saved", ruleId: rule.id, runId: run.id }), [rule.id, run.id]);

  return (
    <li className="rounded-lg border border-border px-3 py-2 text-sm" data-testid="saved-result" data-run={run.id}>
      <p className="font-medium" data-testid="saved-result-line">{RESULT_COUNT_LINE(fmtDay(run.run_date) ?? run.run_date, run.count, fmtDay(run.as_of))}</p>
      <p className="text-xs text-foreground-muted" data-testid="saved-result-answers-line">{SHELF_STOCKS_LINE(run.count, run.answers)}</p>
      {run.earlier_values && <p className="text-xs text-foreground-muted" data-testid="saved-result-earlier">{RESULT_EARLIER}</p>}
      {building && (
        <div className="mt-1" data-testid="saved-result-building" aria-live="polite">
          <p className="text-xs font-medium">{BUILDING(building.done, building.total)}</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border"><div className="h-full bg-accent" style={{ width: `${building.progress_pct}%` }} /></div>
          <p className="mt-1 text-xs text-foreground-muted">{BUILDING_LEAVE}</p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {paid ? (
          <>
            <button type="button" onClick={() => void openPdf()} disabled={busy !== null} className={btn} data-testid="shelf-open-pdf">{busy === "open" ? "Preparing…" : OPEN_REPORT}</button>
            <button type="button" onClick={() => void download("pdf")} disabled={busy !== null} className={btn} data-testid="shelf-download">{busy === "pdf" ? "Preparing…" : DOWNLOAD}</button>
            <button type="button" onClick={() => void download("csv")} disabled={busy !== null} className={btn} data-testid="shelf-download-csv">{busy === "csv" ? "Preparing…" : REPORT_CSV}</button>
          </>
        ) : (
          <button type="button" onClick={() => setScreen((s) => !s)} aria-expanded={screen} className={btn} data-testid="shelf-open-screen">{OPEN_ON_SCREEN}</button>
        )}
        <button type="button" onClick={() => void openAdd()} disabled={!!building} className={btn} data-testid="shelf-add-ai">{ADD_AI_MORE}</button>
        {confirm ? (
          <>
            <button type="button" onClick={() => void remove()} className={`${btn} border-accent`} data-testid="saved-result-delete-confirm">{SHELF_DELETE_CONFIRM}</button>
            <button type="button" onClick={() => setConfirm(false)} className={btn}>{SHELF_KEEP}</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className={`${btn} text-foreground-muted`} data-testid="saved-result-delete">{SHELF_DELETE}</button>
        )}
      </div>
      {!paid && (
        <p className="mt-1 text-xs text-foreground-muted" data-testid="shelf-free-note">
          {FREE_UPGRADE_DOWNLOAD} <Link href="/pricing" className="font-medium text-accent hover:underline" data-testid="upgrade-link">{SEE_PRICING}</Link>{" "}
          <a href={SAMPLE_PDF_PATH} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline" data-testid="saved-result-sample">{SAMPLE_REPORT}</a>
        </p>
      )}
      {confirm && <p className="mt-1 text-xs text-foreground-muted" data-testid="saved-result-delete-note">{SHELF_DELETE_NOTE}</p>}
      {screen && !paid && <OnScreen ruleId={rule.id} runId={run.id} />}
      {adding && (
        <div className="mt-2 space-y-2" data-testid="shelf-add-sheet">
          <p className="text-xs text-foreground-muted">{ADD_AI_LEAD}</p>
          <ReportSheet
            ruleName={rule.name}
            forResult={{ ruleId: rule.id, runId: run.id }}
            ensure={ensure}
            needsName={false}
            loader={staticLoader(adding)}
            loadKey={run.id}
            total={adding.length}
            onClose={() => setAdding(null)}
            onDone={onChanged}
          />
        </div>
      )}
      {msg && <p className="mt-1 text-sm text-foreground-muted" role="status" data-testid="saved-results-msg">{msg}</p>}
    </li>
  );
}

function RuleShelf({ rule, refreshKey, jobs, onChanged }: { rule: MyScreen; refreshKey: number; jobs: ReportJob[]; onChanged: () => void }) {
  const { getToken } = useAuth();
  const [runs, setRuns] = useState<RuleRun[] | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const r = await listRuleRuns(token, rule.id);
        setRuns(r.runs);
        setLimit(r.limit);
      } catch {
        setMsg("The saved reports could not be loaded right now.");
      }
    })();
  }, [rule.id, refreshKey, getToken, jobs.length]);
  if (runs === null) return msg ? <p className="text-sm text-foreground-muted" role="status">{msg}</p> : null;
  const over = limit !== null && runs.length > limit;
  return (
    <section className="space-y-2" aria-label={`Saved reports for ${rule.name}`} data-testid="saved-results">
      <p className="text-xs text-foreground-muted" data-testid="saved-results-limit">{limit !== null ? RESULT_LIMIT_LINE(limit, runs.length) : ""}</p>
      {over && limit !== null && <p className="text-sm text-foreground-muted" role="status" data-testid="saved-results-over">{OVER_LIMIT_LINE(limit, runs.length)}</p>}
      {runs.length === 0 && <p className="text-sm text-foreground-muted" data-testid="saved-results-none">{SHELF_NONE}</p>}
      <ul className="space-y-2">
        {runs.map((r) => (
          <ShelfCard key={r.id} rule={rule} run={r} building={jobs.find((j) => j.run_id === r.id) ?? null} onChanged={onChanged} />
        ))}
      </ul>
    </section>
  );
}

/** The Results page: a shelf of saved reports, grouped by rule and date. Reports still building show a progress bar and appear here when ready. */
export function ResultsShelf({ rules, refreshKey, onChanged }: ShelfProps) {
  const { getToken } = useAuth();
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  // reports still building: read every few seconds while there are any
  useEffect(() => {
    let live = true;
    let timer = 0;
    async function tick() {
      try {
        const token = await getToken();
        if (!token) return;
        const j = await reportsActive(token);
        if (!live) return;
        setJobs((prev) => {
          if (prev.length > 0 && j.length < prev.length) onChanged();
          return j;
        });
        timer = window.setTimeout(tick, j.length ? 4000 : 15000);
      } catch {
        if (live) timer = window.setTimeout(tick, 20000);
      }
    }
    void tick();
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [getToken, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: string) => setOpenIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return (
    <section className="space-y-2" aria-labelledby="saved-results-title" data-testid="saved-results-by-rule">
      <h3 id="saved-results-title" className="text-base font-semibold" data-testid="shelf-title">{SHELF_TITLE}</h3>
      {rules.length === 0 && <p className="text-sm text-foreground-muted" data-testid="saved-results-groups-none">{RESULT_GROUPS_NONE}</p>}
      <ul className="space-y-2">
        {rules.map((r) => {
          const building = jobs.some((j) => j.rule_id === r.id);
          const open = openIds.includes(r.id) || building;
          return (
            <li key={r.id} className="rounded-xl border border-border bg-surface" data-testid="results-group" data-rule={r.id}>
              <button type="button" onClick={() => toggle(r.id)} aria-expanded={open} className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-2 text-left" data-testid="results-group-toggle">
                <span className="min-w-0 break-words text-sm font-semibold">{r.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-foreground-muted">
                  {RESULT_GROUP_COUNT}
                  <ChevronDown size={14} className={open ? "rotate-180" : ""} aria-hidden />
                </span>
              </button>
              {open && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <RuleShelf rule={r} refreshKey={refreshKey} jobs={jobs.filter((j) => j.rule_id === r.id)} onChanged={onChanged} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
