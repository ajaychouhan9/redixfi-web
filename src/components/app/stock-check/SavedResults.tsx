"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { deleteRuleRun, downloadRunReport, getRuleRun, getRunChanges, listRuleRuns, type MyScreen, type RuleRun, type RunChanges } from "@/lib/api/mutations";
import { reportOnScreen, reportsActive, type OnScreenReport, type ReportJob } from "@/lib/api/report";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPaidEntitled } from "@/lib/entitlements";
import { fmtDay, savedLine } from "@/lib/my-rules";
import {
  ADD_AI_LEAD, ADD_AI_MORE, ANSWERED_OF, BACK_TO_RULES_LIST, BUILDING, BUILDING_LEAVE, COMPARE_ADDED, COMPARE_DROPPED, COMPARE_FAILED, COMPARE_HIDE, COMPARE_LINE, COMPARE_LOADING, COMPARE_MORE,
  COMPARE_NONE, COMPARE_SHOW, COMPARE_VALUES_CHANGED, DOWNLOAD, FIGURES_AS_OF, FREE_UPGRADE_DOWNLOAD, NOT_CHARGED, NO_RULES_FOR_REPORTS, OPEN_ON_SCREEN, OPEN_REPORT, REPORTS_FOR, RESULTS_RULES_LEAD,
  REUSED_LINE, SEE_PRICING, SHELF_DELETE, SHELF_DELETE_CONFIRM, SHELF_DELETE_NOTE, SHELF_KEEP, SHELF_NONE, SHELF_STOCKS_LINE, UNANSWERED_TITLE,
} from "@/lib/report-flow";
import { SAMPLE_PDF_PATH, SAMPLE_REPORT } from "@/lib/rule-answers";
import {
  DL_CSV, DL_FREE, DL_REPORT, OVER_LIMIT_LINE, REPORT_CSV, REPORT_FAILED, RESULT_COUNT_LINE, RESULT_EARLIER, RESULT_LIMIT_LINE, SEE_PLANS,
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

function ChangeList({ title, items, more, testId }: { title: string; items: RunChanges["added"]; more: number; testId: string }) {
  if (items.length + more === 0) return null;
  return (
    <section className="space-y-1" data-testid={testId}>
      <h5 className="text-xs font-semibold">{title} ({items.length + more})</h5>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.symbol} className="text-xs" data-testid={`${testId}-item`}>
            <p className="font-medium">{it.symbol}{it.company ? ` · ${it.company}` : ""}</p>
            <ul className="list-disc space-y-0.5 pl-4 text-foreground-muted">
              {it.lines.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="text-xs text-foreground-muted">{COMPARE_MORE(more)}</p>}
    </section>
  );
}

/** "Compared with your last result: N added, M dropped", and (on request) for each stock the filter figures behind it. Facts only. Nothing is shown for the oldest result. */
export function CompareBlock({ ruleId, run }: { ruleId: string; run: { id: string; added: number | null; dropped: number | null; since: string | null } }) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<RunChanges | null | undefined>(undefined);
  const [error, setError] = useState(false);
  if (run.added === null || run.dropped === null) return null;
  const total = run.added + run.dropped;
  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && data === undefined) {
      try {
        const token = await getToken();
        if (!token) return;
        setData(await getRunChanges(token, ruleId, run.id));
      } catch {
        setError(true);
      }
    }
  }
  return (
    <div className="mt-1 space-y-1" data-testid="compare-block">
      <p className="text-xs font-medium" data-testid="compare-line">
        {COMPARE_LINE(run.added, run.dropped)}
        {run.since && <span className="font-normal text-foreground-muted"> · result of {fmtDay(run.since) ?? run.since}</span>}
      </p>
      {total === 0 ? (
        <p className="text-xs text-foreground-muted" data-testid="compare-none">{COMPARE_NONE}</p>
      ) : (
        <button type="button" onClick={() => void toggle()} aria-expanded={open} className="min-h-[36px] text-xs font-medium text-accent underline" data-testid="compare-toggle">{open ? COMPARE_HIDE : COMPARE_SHOW}</button>
      )}
      {open && (
        <div className="space-y-2 rounded-lg border border-border bg-surface-raised p-2" data-testid="compare-details">
          {data === undefined && !error && <p className="text-xs text-foreground-muted">{COMPARE_LOADING}</p>}
          {error && <p className="text-xs text-foreground-muted" role="status">{COMPARE_FAILED}</p>}
          {data && (
            <>
              {data.figures_as_of && <p className="text-xs text-foreground-muted" data-testid="compare-asof">{FIGURES_AS_OF(fmtDay(data.figures_as_of) ?? data.figures_as_of)}</p>}
              {data.values_changed && <p className="text-xs text-foreground-muted" data-testid="compare-values-changed">{COMPARE_VALUES_CHANGED}</p>}
              <ChangeList title={COMPARE_ADDED} items={data.added} more={data.more_added} testId="compare-added" />
              <ChangeList title={COMPARE_DROPPED} items={data.dropped} more={data.more_dropped} testId="compare-dropped" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface ShelfProps {
  rules: MyScreen[];
  refreshKey: number;
  /** A report finished or was added to: the shelf and the rule page read again. */
  onChanged: () => void;
  /** The rule whose reports are open (null: the list of rules) and how to open or leave one. */
  openRuleId: string | null;
  setOpenRuleId: (id: string | null) => void;
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
      <p className="text-xs text-foreground-muted" data-testid="saved-result-answers-line">{run.asked ? ANSWERED_OF(run.answered ?? 0, run.asked) : SHELF_STOCKS_LINE(run.count, run.answers)}</p>
      {run.last_report && run.last_report.reused + run.last_report.new_answers > 0 && <p className="text-xs text-foreground-muted" data-testid="saved-result-reused">{REUSED_LINE(run.last_report.reused, run.last_report.new_answers)}</p>}
      {(run.unanswered?.length ?? 0) > 0 && (
        <details className="text-xs text-foreground-muted" data-testid="saved-result-unanswered">
          <summary className="min-h-[32px] cursor-pointer py-1 font-medium text-foreground">{UNANSWERED_TITLE} ({run.unanswered?.length})</summary>
          <ul className="space-y-1 pb-1">
            {run.unanswered?.map((u) => (
              <li key={`${u.symbol}|${u.question}`} data-testid="saved-result-unanswered-item"><span className="font-medium text-foreground">{u.symbol}</span>: {u.question} {u.reason} {NOT_CHARGED}</li>
            ))}
          </ul>
        </details>
      )}
      {run.earlier_values && <p className="text-xs text-foreground-muted" data-testid="saved-result-earlier">{RESULT_EARLIER}</p>}
      <CompareBlock ruleId={rule.id} run={run} />
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
            existing={run.answers > 0}
            asOf={fmtDay(run.as_of)}
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

/** Reports still building: read every few seconds while there are any; when one finishes the page reads its results again. */
export function useActiveJobs(refreshKey: number, onChanged: () => void): ReportJob[] {
  const { user, getToken } = useAuth();
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  useEffect(() => {
    if (!user) return;
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
  }, [user, getToken, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return jobs;
}

/** The "Reports" section of an opened rule: that rule's saved reports (Open PDF, Download, Add AI for more stocks, Delete), with a progress bar while one builds. */
export function RuleReports({ rule, refreshKey, onChanged }: { rule: MyScreen; refreshKey: number; onChanged: () => void }) {
  const jobs = useActiveJobs(refreshKey, onChanged);
  return <RuleShelf rule={rule} refreshKey={refreshKey} jobs={jobs.filter((j) => j.rule_id === rule.id)} onChanged={onChanged} />;
}

/** The Results tab: the person's rules first; tapping a rule opens that rule's reports. */
export function ResultsTab({ rules, refreshKey, onChanged, openRuleId, setOpenRuleId }: ShelfProps) {
  const jobs = useActiveJobs(refreshKey, onChanged);
  const open = rules.find((r) => r.id === openRuleId) ?? null;
  if (open) {
    return (
      <section className="space-y-3" aria-labelledby="rule-reports-title" data-testid="saved-results-by-rule">
        <button type="button" onClick={() => setOpenRuleId(null)} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium hover:border-accent" data-testid="results-back">{BACK_TO_RULES_LIST}</button>
        <h3 id="rule-reports-title" className="break-words text-base font-semibold" data-testid="rule-reports-title">{REPORTS_FOR(open.name)}</h3>
        <RuleShelf rule={open} refreshKey={refreshKey} jobs={jobs.filter((j) => j.rule_id === open.id)} onChanged={onChanged} />
      </section>
    );
  }
  return (
    <section className="space-y-2" aria-labelledby="saved-results-title" data-testid="saved-results-by-rule">
      <h3 id="saved-results-title" className="text-base font-semibold" data-testid="shelf-title">{RESULTS_RULES_LEAD}</h3>
      {rules.length === 0 && <p className="text-sm text-foreground-muted" data-testid="saved-results-groups-none">{NO_RULES_FOR_REPORTS}</p>}
      <ul className="space-y-2">
        {rules.map((r) => {
          const building = jobs.some((j) => j.rule_id === r.id);
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setOpenRuleId(r.id)}
                className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2 text-left hover:border-accent"
                data-testid="results-rule"
                data-rule={r.id}
              >
                <span className="min-w-0">
                  <span className="block break-words text-sm font-semibold" data-testid="results-rule-name">{r.name}</span>
                  <span className="block text-xs text-foreground-muted" data-testid="results-rule-line">{savedLine(r)}</span>
                  {building && <span className="block text-xs font-medium" data-testid="results-rule-building">A report is being built.</span>}
                </span>
                <ChevronRight size={16} className="shrink-0 text-foreground-muted" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
