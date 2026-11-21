"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";
import {
  downloadFullCheckCsv, downloadFullCheckPdf, estimateFullCheck, getFullCheckReport, getFullCheckRun, listFullCheckRuns, startFullCheck,
  type FullCheckEstimate, type FullCheckReport, type FullCheckRun, type FullCheckSection,
} from "@/lib/api/fullcheck";
import { getWatchlist } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  ADD_FROM_WATCHLIST, FULL_CHECK_EMPTY, FULL_CHECK_FOOTER, FULL_CHECK_FREE, FULL_CHECK_INTRO, FULL_CHECK_MAX_NOTE, FULL_CHECK_NO_RANK, FULL_CHECK_TITLE, IN_RUN_TITLE,
  RUN_ANSWERS_CSV, RUN_NONE, bannerLine, costLine, progressLine,
} from "@/lib/fullcheck-copy";

const POLL_MS = 3000;

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function cell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "No figure";
  return typeof v === "number" ? v.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : String(v);
}

function SectionBlock({ s }: { s: FullCheckSection }) {
  return (
    <div className="mt-3" data-testid={`fc-section-${s.id}`}>
      <h4 className="text-[13px] font-semibold text-foreground">{s.title}</h4>
      <p className={`mt-1 whitespace-pre-line text-[13px] ${s.status === "ok" ? "text-foreground-muted" : "text-foreground-faint"}`}>{s.answer}</p>
      {s.table && s.table.rows.length > 0 && (
        <div className="mt-2 max-w-full overflow-x-auto rounded-lg border border-border">
          <table className="w-max min-w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-left text-foreground-faint">
                {s.table.columns.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-1.5">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {s.table.rows.slice(0, 20).map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {s.table!.columns.map((c) => <td key={c.key} className="whitespace-nowrap px-3 py-1.5">{cell(r[c.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {s.sources.length > 0 && (
        <p className="mt-1 text-[11.5px] text-foreground-faint">
          Sources: {s.sources.map((x) => `${x.label ?? ""}${x.detail ? ` (${x.detail})` : ""}`).join("; ")}
        </p>
      )}
    </div>
  );
}

function ReportCard({ runId, report, getToken }: { runId: string; report: FullCheckReport; getToken: () => Promise<string | null | undefined> }) {
  const [busy, setBusy] = useState<"pdf" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const n = report.numbers;
  async function get(kind: "pdf") {
    setBusy(kind);
    setErr(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Log in again to download.");
      const { blob, filename } = await downloadFullCheckPdf(runId, report.symbol, token);
      save(blob, filename ?? `redixfi-full-check-${report.symbol}.${kind}`);
    } catch {
      setErr("The download did not work. Please try again.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <article className="rounded-xl border border-border bg-surface-raised p-4" data-testid={`fc-report-${report.symbol}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{report.company_name}</h3>
          <p className="font-mono text-xs text-foreground-faint">{report.symbol} · generated {report.generated_at.slice(0, 10)}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => get("pdf")} disabled={busy !== null} className="rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground disabled:opacity-50">
            {busy === "pdf" ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </div>
      {err && <p className="mt-2 text-xs text-amber">{err}</p>}
      <p className="mt-1 text-[11.5px] text-foreground-faint">
        Source dates: concall {report.source_dates.concall ?? "none stored"}; annual report {report.source_dates.annual_report ?? "none stored"}; statements fetched {report.source_dates.statements ?? "none stored"}; promoter pledge {report.source_dates.pledge ?? "none stored"}.
      </p>
      <SectionBlock s={report.sections[0]} />
      <div className="mt-3" data-testid="fc-numbers">
        <h4 className="text-[13px] font-semibold">Three years of numbers</h4>
        {n.available ? (
          <>
            <div className="mt-2 max-w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-max min-w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-foreground-faint">
                    {n.columns.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-1.5">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {n.rows.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {n.columns.map((c) => <td key={c.key} className="whitespace-nowrap px-3 py-1.5">{cell(r[c.key])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {n.notes.map((t) => <p key={t} className="mt-1 text-[11.5px] text-foreground-faint">{t}</p>)}
            <p className="mt-1 text-[11.5px] text-foreground-faint">Statements fetched {n.as_of ?? "(date not available)"}.</p>
          </>
        ) : (
          <p className="mt-1 text-[13px] text-foreground-faint">No annual statements are stored for this company.</p>
        )}
      </div>
      {report.sections.slice(1).map((s) => <SectionBlock key={s.id} s={s} />)}
      {report.price && <SectionBlock s={report.price} />}
      <div className="mt-3" data-testid="fc-ownership">
        <h4 className="text-[13px] font-semibold">Promoter holding, pledge, insider trades, bulk and block deals</h4>
        <ul className="mt-1 space-y-1 text-[13px] text-foreground-muted">
          {report.ownership.holdings.map((h) => (
            <li key={h.label}><span className="font-medium text-foreground">{h.label}:</span> {h.text}{h.source ? ` Source: ${h.source}.` : ""}</li>
          ))}
          {[report.ownership.insiders, report.ownership.deals].map((s) => (
            <li key={s.id}><span className="font-medium text-foreground">{s.title}:</span> {s.answer}</li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-[11.5px] text-foreground-faint">{report.footer}</p>
    </article>
  );
}

export function FullCheckPanel() {
  const { user, loading, getToken } = useAuth();
  const [shortlist, setShortlist] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [watchOpen, setWatchOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [estimate, setEstimate] = useState<FullCheckEstimate | null>(null);
  const [run, setRun] = useState<FullCheckRun | null>(null);
  const [reports, setReports] = useState<Record<string, FullCheckReport>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const fetchedFor = useRef<string>("");

  const withToken = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("login");
    return { token };
  }, [getToken]);

  // shortlist = watchlist; also resume the latest run after a reload or a restart of the service
  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const o = await withToken();
        const w = await getWatchlist(o.token);
        if (cancelled) return;
        setShortlist(w.symbols);
        // "Stocks in this run" starts empty (or with the stocks named in the address); the watchlist is only an optional list to add from
        const q = new URLSearchParams(window.location.search);
        const named = (q.get("symbols") ?? "").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean).slice(0, 10);
        if (named.length) setPicked(named);
        const runId = q.get("run");
        if (runId) {
          setStarted(q.get("started") === "1");
          const r = await getFullCheckRun(runId, o);
          if (!cancelled) setRun(r);
        } else {
          const runs = await listFullCheckRuns(o);
          if (!cancelled && runs.length) setRun(runs[0]);
        }
      } catch {
        if (!cancelled) setShortlist([]);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, user, withToken]);

  // the cost, before anything runs
  useEffect(() => {
    if (!user || !picked.length) { setEstimate(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const e = await estimateFullCheck(picked, await withToken());
        if (!cancelled) setEstimate(e);
      } catch { if (!cancelled) setEstimate(null); }
    })();
    return () => { cancelled = true; };
  }, [picked, user, withToken]);

  // progress while the run is waiting or running
  useEffect(() => {
    if (!run || run.status === "done") return;
    const t = setInterval(async () => {
      try { setRun(await getFullCheckRun(run.id, await withToken())); } catch { /* keep the last progress; the next poll retries */ }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [run, withToken]);

  // fetch each finished company's report once
  useEffect(() => {
    if (!run) return;
    const doneKey = run.id + ":" + run.items.filter((i) => i.status === "done").map((i) => i.symbol).join(",");
    if (fetchedFor.current === doneKey) return;
    fetchedFor.current = doneKey;
    (async () => {
      try {
        const o = await withToken();
        for (const it of run.items.filter((i) => i.status === "done")) {
          const rep = await getFullCheckReport(run.id, it.symbol, o);
          setReports((r) => ({ ...r, [it.symbol]: rep }));
        }
      } catch { /* a report that is not ready yet is fetched on the next change */ fetchedFor.current = ""; }
    })();
  }, [run, withToken]);

  async function runCsv() {
    if (!run) return;
    setCsvBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("login");
      const { blob, filename } = await downloadFullCheckCsv(run.id, token);
      save(blob, filename ?? "redixfi-full-check-answers.csv");
    } catch {
      setMessage("The download did not work. Please try again.");
    } finally {
      setCsvBusy(false);
    }
  }

  async function start() {
    setStarting(true);
    setMessage(null);
    try {
      const out = await startFullCheck(picked, await withToken());
      setStarted(true);
      setReports({});
      fetchedFor.current = "";
      setRun(out.run);
    } catch (e) {
      const d = e instanceof ApiError ? (e.detail as { message?: string } | undefined) : undefined;
      setMessage(d?.message ?? (e instanceof ApiError ? e.message : "") ?? "") ;
      setMessage((m) => m || "The run could not be started. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <p className="text-xs text-foreground-faint">Loading…</p>;
  if (!user) {
    return (
      <p className="text-sm text-foreground-muted">
        <Link href="/login" className="underline">Log in</Link> to run a full check on your shortlist.
      </p>
    );
  }
  const active = run && run.status !== "done";
  return (
    <div className="space-y-4" data-testid="full-check-panel">
      <div>
        <h1 className="text-2xl font-semibold">{FULL_CHECK_TITLE}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{FULL_CHECK_INTRO}</p>
        <p className="mt-1 text-xs text-foreground-faint">{FULL_CHECK_NO_RANK}</p>
      </div>

      {estimate?.locked && (
        <div className="rounded-lg bg-amber-bg px-3 py-2 text-sm text-amber" data-testid="fc-locked">
          {FULL_CHECK_FREE} <Link href="/shortlist-lab" className="underline">Shortlist Lab</Link> · <Link href="/pricing" className="underline">View plans</Link>
        </div>
      )}

      {run && (started || active) && (
        <div className="rounded-lg border border-accent bg-surface-raised px-3 py-2 text-sm" role="status" aria-live="polite" data-testid="fc-banner">
          {bannerLine(run.status === "done", run.done, run.total, run.progress_pct)}
        </div>
      )}

      {!active && (
        <section className="rounded-xl border border-border bg-surface-raised p-4" data-testid="fc-select" aria-labelledby="fc-in-run">
          <h2 id="fc-in-run" className="text-base font-semibold">{IN_RUN_TITLE}</h2>
          <p className="text-xs text-foreground-faint">{FULL_CHECK_MAX_NOTE(estimate?.max_companies ?? 10)}</p>
          {picked.length === 0 ? (
            <p className="mt-2 text-sm text-foreground-muted" data-testid="fc-run-empty">{RUN_NONE}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="fc-in-run-list">
              {picked.map((sy) => {
                const est = estimate?.items.find((i) => i.symbol === sy);
                return (
                  <li key={sy} className="flex items-center overflow-hidden rounded-full border border-border text-xs">
                    <span className="px-3 py-2 font-mono font-medium">{sy}</span>
                    {est && <span className="text-[11px] text-foreground-faint">{est.cost}{est.cached ? " (stored)" : ""}</span>}
                    <button type="button" onClick={() => setPicked((p) => p.filter((x) => x !== sy))} aria-label={`Remove ${sy}`} className="min-h-[36px] px-2 text-foreground-muted hover:text-foreground">×</button>
                  </li>
                );
              })}
            </ul>
          )}
          {estimate && picked.length > 0 && <p className="mt-3 text-sm" data-testid="fc-cost">{costLine(estimate.total, estimate.items)}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={start}
              disabled={starting || !picked.length || !estimate || estimate.locked}
              className="min-h-[44px] rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
              data-testid="fc-start"
            >
              {starting ? "Starting…" : `Start full check${estimate ? ` (${estimate.total} question${estimate.total === 1 ? "" : "s"})` : ""}`}
            </button>
            {shortlist !== null && shortlist.length > 0 && (
              <button type="button" onClick={() => setWatchOpen((o) => !o)} aria-expanded={watchOpen} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium hover:border-accent" data-testid="fc-watch-toggle">
                {ADD_FROM_WATCHLIST}
              </button>
            )}
          </div>
          {watchOpen && shortlist && (
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2" data-testid="fc-watchlist">
              {shortlist.map((sy) => {
                const on = picked.includes(sy);
                const max = estimate?.max_companies ?? 10;
                return (
                  <li key={sy}>
                    <label className="flex min-h-[44px] items-center gap-2 text-sm">
                      <input type="checkbox" checked={on} disabled={!on && picked.length >= max} onChange={() => setPicked((p) => (p.includes(sy) ? p.filter((x) => x !== sy) : [...p, sy]))} />
                      <span className="font-mono">{sy}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {shortlist !== null && shortlist.length === 0 && picked.length === 0 && <p className="mt-2 text-xs text-foreground-faint">{FULL_CHECK_EMPTY}</p>}
          {message && <p className="mt-2 text-sm text-amber" data-testid="fc-message">{message}</p>}
        </section>
      )}

      {run && (
        <section className="rounded-xl border border-border bg-surface-raised p-4" data-testid="fc-progress" aria-live="polite" aria-labelledby="fc-run-title">
          <h2 id="fc-run-title" className="text-base font-semibold">{IN_RUN_TITLE}</h2>
          <p className="text-sm font-medium">{run.status === "done" ? "Full check finished" : `Full check running, ${run.progress_pct}%`}</p>
          <ul className="mt-2 space-y-2">
            {run.items.map((it) => (
              <li key={it.symbol} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono">{it.symbol}</span>
                  <span className="text-xs text-foreground-faint">
                    {it.status === "done" ? "Done" : it.status === "failed" ? it.step : it.status === "queued" ? "Waiting" : progressLine(it.step, it.pct)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-hover" role="progressbar" aria-valuenow={it.status === "done" ? 100 : it.pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-accent transition-all" style={{ width: `${it.status === "done" || it.status === "failed" ? 100 : it.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {run.status === "done" && run.items.some((i) => i.status === "done") && (
            <button type="button" onClick={() => void runCsv()} disabled={csvBusy} className="mt-3 min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium hover:border-accent disabled:opacity-60" data-testid="fc-run-csv">
              {csvBusy ? "Preparing…" : RUN_ANSWERS_CSV}
            </button>
          )}
        </section>
      )}

      <div className="space-y-4">
        {run?.items.filter((i) => i.status === "done" && reports[i.symbol]).map((i) => (
          <ReportCard key={i.symbol} runId={run.id} report={reports[i.symbol]} getToken={getToken} />
        ))}
      </div>
      {run && <p className="text-xs text-foreground-faint">{FULL_CHECK_FOOTER}</p>}
    </div>
  );
}
