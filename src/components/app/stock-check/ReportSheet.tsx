"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { ApiError } from "@/lib/api/client";
import { getUsage } from "@/lib/api/mutations";
import { questionCheck, reportCreate, reportEstimate, reportJob, type ReportEstimate, type ReportJob } from "@/lib/api/report";
import type { AskUsageInfo } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { fmtDay } from "@/lib/my-rules";
import { ASK_QUESTIONS } from "@/lib/read-company";
import {
  ADDON_LINE, ADDON_LINK, BUILDING, BUILDING_LEAVE, BUILD_DONE, BUILD_FAILED_SOME, CREATE_REPORT, CREATE_WITHOUT_AI, CUSTOMISE, CUSTOM_ADD, CUSTOM_ADD_BUTTON,
  CUSTOM_CHECKING, CUSTOM_CHECK_NOTE, CUSTOM_PLACEHOLDER, CUSTOM_REMOVE, CUSTOM_TOTAL, FREE_UPGRADE_QUESTIONS, FREE_UPGRADE_REPORT, OFFER_FITS, POOL_EMPTY, REPORT_LIMIT_LINE,
  SEE_PRICING, SHEET_FREE_ONE, SHEET_NO_QUESTIONS, SHEET_NO_STOCKS, SHEET_QUESTIONS, SHEET_STOCKS, SHEET_TICK_UP_TO, SHEET_TITLE, USES_MONTH, USES_TODAY, offerLabel,
  toggleStock, withinLimits, NAME_NEEDED, REUSED_LINE, SAVED_ANSWERS_LINE, UPDATE_REPORT,
} from "@/lib/report-flow";
import { PlanLimitDialog, type Drops } from "@/components/app/stock-check/PlanLimitDialog";
import { StockNames, type NamesLoader } from "@/components/app/stock-check/StockNames";

const MAX_STOCKS = 10;
const MAX_ANSWERS = 50;
const KEYS = Object.keys(ASK_QUESTIONS);
const btn = "min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium hover:border-accent disabled:opacity-60";
const primary = "min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-60";

export type EnsureOut = { kind: "saved"; ruleId: string; runId: string } | { kind: "confirm"; drops: Drops } | { kind: "blocked"; message: string };

/** What a report can still use: plan questions plus add-ons, and the day the plan questions reset. */
export function reportLeft(u: AskUsageInfo | null): { plan: number; addon: number; resets: string | null; daily: boolean; free: boolean } | null {
  if (!u) return null;
  const addon = Math.max(0, u.topup_questions_remaining ?? 0);
  if (typeof u.report_limit === "number") return { plan: Math.max(0, u.report_limit - (u.report_used ?? 0)), addon, resets: u.resets_on ?? null, daily: false, free: false };
  if (u.daily_limit !== null) return { plan: Math.max(0, u.daily_limit - (u.daily_used ?? 0)), addon, resets: null, daily: true, free: u.tier === "free" && !u.is_pro_trial };
  return null;
}

/** Offers that fit in what is left: the largest reports first (never a half-answered one). */
export function whatFits(stocks: number, per: number, available: number): { stocks: number; questions: number; uses: number }[] {
  const seen = new Set<string>();
  const out: { stocks: number; questions: number; uses: number }[] = [];
  for (let q = per; q >= 1; q -= 1) {
    const s = Math.min(stocks, MAX_STOCKS, Math.floor(Math.max(0, available) / q));
    if (s >= 1 && !seen.has(`${s}x${q}`)) {
      seen.add(`${s}x${q}`);
      out.push({ stocks: s, questions: q, uses: s * q });
    }
  }
  return out.sort((a, b) => b.uses - a.uses || b.stocks - a.stocks).slice(0, 3);
}

interface Props {
  ruleName: string;
  /** A saved result to put the report on (its answers are counted), or null: the result is saved first by `ensure`. */
  forResult: { ruleId: string; runId: string } | null;
  ensure: (name: string | undefined, confirmDrop: boolean) => Promise<EnsureOut>;
  needsName: boolean;
  /** The rule's name, typed in the box at the top of the rule page. Needed when the rule is not saved yet. */
  name?: string;
  /** Called when the name is blank (the page shows the plain message beside the name box). */
  onNameMissing?: () => void;
  /** This result already has a report: the button says Update report. */
  existing?: boolean;
  /** The date of the figures behind the list ("Figures as of ..."). */
  asOf?: string | null;
  /** The report started (the job is queued): the page takes the person to the rule's reports. */
  onStarted?: (ref: { ruleId: string; runId: string }) => void;
  loader: NamesLoader;
  loadKey: string;
  total: number | null;
  /** Stocks to start with (for example "Add AI for more stocks" starts with the stocks that have no answers). */
  initialStocks?: string[];
  onClose: () => void;
  onDone: () => void;
}

/** "Create report": the stocks (up to 10), the 5 questions, what it uses and what is left, then Create report or Create without AI. */
export function ReportSheet({ ruleName, forResult, ensure, needsName, name = "", onNameMissing, existing = false, asOf = null, onStarted, loader, loadKey, total: totalProp, initialStocks, onClose, onDone }: Props) {
  const { getToken, user } = useAuth();
  const [usage, setUsage] = useState<AskUsageInfo | null>(null);
  const [stocks, setStocks] = useState<string[]>(initialStocks ?? []);
  const [keys, setKeys] = useState<string[]>(KEYS);
  const [custom, setCustom] = useState<string[]>([]);
  const [custom1, setCustom1] = useState("");
  const [custom1Msg, setCustom1Msg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [customise, setCustomise] = useState(false);
  const [capNote, setCapNote] = useState(false);
  const [est, setEst] = useState<ReportEstimate | null>(null);
  const [drops, setDrops] = useState<Drops | null>(null);
  const [dropAi, setDropAi] = useState(true);   // the warning belongs to Create report or to Create without AI
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errPlan, setErrPlan] = useState<{ message: string; options?: { stocks: number; questions: number; uses: number }[]; resets?: string | null } | null>(null);
  const [job, setJob] = useState<ReportJob | null>(null);
  const [doneNote, setDoneNote] = useState<string | null>(null);
  const [runRef, setRunRef] = useState<{ ruleId: string; runId: string } | null>(forResult);
  const autoSelected = useRef(false);
  // the build keeps running on the server when the person leaves; this page stops asking once it is gone
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try { setUsage((await getUsage(token)).ask_redixfi); } catch { /* the line is then left out */ }
    })();
  }, [getToken]);

  // the size of the list comes from the list itself (the same call that fills the names), so the sheet never waits for the counts file
  const [total, setTotal] = useState<number | null>(totalProp);
  useEffect(() => {
    let live = true;
    loader("", 1).then((r) => live && setTotal(r.total)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [loadKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const left = reportLeft(usage);
  const free = left?.free ?? false;
  const maxStocks = free ? 1 : MAX_STOCKS;

  // a list of 10 or fewer starts with every stock chosen; a longer one starts with none (nothing is chosen for the person)
  useEffect(() => {
    if (autoSelected.current || initialStocks || total === null || left === null) return;
    if (total <= maxStocks && total > 0) {
      autoSelected.current = true;
      void loader("", 1).then((r) => setStocks(r.items.map((i) => i.symbol).slice(0, maxStocks)));
    } else if (total > maxStocks) {
      autoSelected.current = true;
    }
  }, [total, maxStocks, left === null]); // eslint-disable-line react-hooks/exhaustive-deps
  // a Free report is 1 stock: if more were chosen before the plan was known, keep the first one
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stocks.length > maxStocks) setStocks((l) => l.slice(0, maxStocks));
  }, [maxStocks]); // eslint-disable-line react-hooks/exhaustive-deps

  const per = keys.length + custom.length;
  const uses = stocks.length * per;
  const within = withinLimits(stocks.length, per, maxStocks, MAX_ANSWERS);
  const available = (left?.plan ?? 0) + (left?.addon ?? 0);

  // with a saved result the server counts what is already answered
  useEffect(() => {
    if (!runRef || stocks.length === 0 || per === 0 || !within) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEst(null);
      return;
    }
    let live = true;
    const t = window.setTimeout(async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const e = await reportEstimate(token, runRef.ruleId, runRef.runId, { symbols: stocks, questions: keys, custom });
        if (live) setEst(e);
      } catch {
        if (live) setEst(null);
      }
    }, 300);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [runRef, stocks, keys, custom, per, within, getToken]);

  const cost = est && typeof est.uses === "number" ? est.uses : uses;
  const enough = left !== null && cost <= available;
  const offers = useMemo(() => (left !== null && !enough ? whatFits(stocks.length, per, available) : []), [left, enough, stocks.length, per, available]);
  // "left" is what remains of the plan's own questions; add-on questions are used only after them and are named on their own line
  const planAfter = left ? Math.max(0, left.plan - cost) : 0;
  const usesLine = left ? (left.daily ? USES_TODAY(cost, planAfter) : USES_MONTH(cost, planAfter)) : null;
  const addonUsed = left ? Math.max(0, cost - left.plan) : 0;

  function toggle(sym: string) {
    const r = toggleStock(stocks, sym, maxStocks);
    setStocks(r.list);
    setCapNote(r.capped);
  }
  async function addCustom() {
    const q = custom1.trim();
    if (!q) return;
    setChecking(true);
    setCustom1Msg(CUSTOM_CHECKING);
    try {
      const token = await getToken();
      if (!token) return;
      const r = await questionCheck(token, q);
      if (r.ok && r.question && !withinLimits(stocks.length, per + 1, maxStocks, MAX_ANSWERS)) {
        setCustom1Msg(`This question is fine, but a report holds up to ${MAX_STOCKS} stocks and ${MAX_ANSWERS} answers. Remove a stock or a question first.`);
      } else if (r.ok && r.question) {
        setCustom((c) => (c.includes(r.question as string) ? c : [...c, r.question as string]));
        setCustom1("");
        setCustom1Msg(null);
      } else {
        setCustom1Msg(r.message ?? "This question cannot be added.");
      }
    } catch {
      setCustom1Msg("The question could not be checked right now. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  // ---- building: the job keeps running on the server when the person leaves ----
  const poll = useCallback(async (ref: { ruleId: string; runId: string }, j: ReportJob) => {
    let cur = j;
    for (let i = 0; i < 600 && cur.status !== "done"; i += 1) {
      await new Promise((r) => window.setTimeout(r, 3000));
      if (!alive.current) return;
      try {
        const token = await getToken();
        if (!token) return;
        cur = await reportJob(token, ref.ruleId, ref.runId, cur.id);
        setJob(cur);
      } catch {
        /* a short network gap: try again */
      }
    }
    if (cur.status === "done") {
      const counts = (cur.reused ?? 0) + (cur.new_answers ?? 0) > 0 ? ` ${REUSED_LINE(cur.reused ?? 0, cur.new_answers ?? 0)}` : "";
      setDoneNote(cur.failed > 0 ? `${BUILD_DONE}${counts} ${BUILD_FAILED_SOME(cur.failed)}` : `${BUILD_DONE}${counts}`);
      onDone();
    }
  }, [getToken, onDone]);

  async function go(ai: boolean, confirmDrop = false) {
    setMsg(null);
    setErrPlan(null);
    if (stocks.length === 0) return setMsg(SHEET_NO_STOCKS);
    if (ai && per === 0) return setMsg(SHEET_NO_QUESTIONS);
    if (needsName && !runRef && !name.trim()) {
      if (onNameMissing) onNameMissing();
      else setMsg(NAME_NEEDED);
      return;
    }
    setBusy(true);
    try {
      let ref = runRef;
      if (!ref) {
        const out = await ensure(needsName ? name.trim() : undefined, confirmDrop);
        if (out.kind === "confirm") {
          setDropAi(ai);
          return setDrops(out.drops);
        }
        if (out.kind === "blocked") return setMsg(out.message);
        ref = { ruleId: out.ruleId, runId: out.runId };
        setRunRef(ref);
      }
      setDrops(null);
      if (!ai) {
        setDoneNote("Saved to Results. You can add AI answers later from Results.");
        onDone();
        return;
      }
      const token = await getToken();
      if (!token) return;
      const out = await reportCreate(token, ref.ruleId, ref.runId, { symbols: stocks, questions: keys, custom });
      setJob(out.job);
      onDone();
      void poll(ref, out.job);
      onStarted?.(ref);
    } catch (e) {
      const d = e instanceof ApiError ? (e.detail as Record<string, unknown> | string | undefined) : undefined;
      if (d && typeof d === "object" && typeof d.message === "string") {
        setErrPlan({ message: d.message, options: d.options as never, resets: (d.resets_on as string) ?? null });
      } else {
        setMsg(typeof d === "string" && d ? d : "The report could not be created right now. Nothing was used. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const isUpdate = existing || (est?.already_answered ?? 0) > 0;
  const emptyPool = left !== null && available === 0;
  const resetDate = left?.resets ? fmtDay(left.resets) ?? left.resets : null;
  const building = job && job.status !== "done";

  return (
    <section className="space-y-3 rounded-xl border border-accent bg-surface p-4" aria-label={isUpdate ? UPDATE_REPORT : SHEET_TITLE} data-testid="report-sheet">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-base font-semibold">{isUpdate ? UPDATE_REPORT : SHEET_TITLE}{ruleName ? `: ${ruleName}` : ""}</h4>
        <button type="button" onClick={onClose} className="min-h-[44px] px-2 text-sm text-foreground-muted underline" data-testid="report-sheet-close">Close</button>
      </div>

      {job ? (
        <div className="space-y-2" data-testid="report-progress" aria-live="polite">
          <p className="text-sm font-medium" data-testid="report-progress-line">{building ? BUILDING(job.done, job.total) : (doneNote ?? BUILD_DONE)}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.progress_pct}>
            <div className="h-full bg-accent transition-all" style={{ width: `${job.progress_pct}%` }} />
          </div>
          {building && <p className="text-xs text-foreground-muted" data-testid="report-leave-note">{BUILDING_LEAVE}</p>}
        </div>
      ) : (
        <>
          <div data-testid="report-stocks">
            <p className="text-sm font-medium">{SHEET_STOCKS}</p>
            {free && <p className="text-xs text-foreground-muted" data-testid="report-free-one">{SHEET_FREE_ONE}</p>}
            {total !== null && total > maxStocks ? (
              <StockNames title={SHEET_TICK_UP_TO(maxStocks)} loadKey={loadKey} loader={loader} testId="report-names" selected={stocks} onToggle={toggle} asOf={asOf} />
            ) : (
              <p className="text-sm text-foreground-muted" data-testid="report-stocks-line">{stocks.length === 0 ? SHEET_NO_STOCKS : stocks.join(", ")}</p>
            )}
            {capNote && <p className="text-xs text-foreground-muted" role="status" data-testid="report-cap-note">You can choose up to {maxStocks} {maxStocks === 1 ? "stock" : "stocks"}.</p>}
            {customise && total !== null && total <= maxStocks && stocks.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-2" data-testid="report-stock-chips">
                {stocks.map((s) => (
                  <li key={s}><button type="button" onClick={() => toggle(s)} className="min-h-[36px] rounded-full border border-border px-3 text-xs hover:border-accent" aria-label={`Remove ${s}`}>{s} ×</button></li>
                ))}
              </ul>
            )}
          </div>

          <div data-testid="report-questions">
            <p className="text-sm font-medium">{SHEET_QUESTIONS}</p>
            <ul className="space-y-1">
              {KEYS.map((k) => (
                <li key={k} className="text-sm">
                  {customise ? (
                    <label className="flex min-h-[40px] items-start gap-2">
                      <input type="checkbox" checked={keys.includes(k)} onChange={() => setKeys((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]))} className="mt-1 h-4 w-4 shrink-0" data-testid="report-q-tick" />
                      <span>{ASK_QUESTIONS[k]}</span>
                    </label>
                  ) : (
                    <span className={keys.includes(k) ? "" : "text-foreground-muted line-through"}>{ASK_QUESTIONS[k]}</span>
                  )}
                </li>
              ))}
              {custom.map((c) => (
                <li key={c} className="flex items-start justify-between gap-2 text-sm" data-testid="report-custom-q">
                  <span>{c}</span>
                  <button type="button" onClick={() => setCustom((l) => l.filter((x) => x !== c))} className="min-h-[36px] shrink-0 text-xs text-foreground-muted underline">{CUSTOM_REMOVE}</button>
                </li>
              ))}
            </ul>
            {customise && (
              <div className="mt-2 space-y-1" data-testid="report-custom-add">
                <label htmlFor="report-custom-input" className="block text-sm font-medium">{CUSTOM_ADD}</label>
                <p className="text-xs text-foreground-muted">{CUSTOM_CHECK_NOTE}</p>
                <div className="flex flex-wrap gap-2">
                  <input id="report-custom-input" value={custom1} onChange={(e) => setCustom1(e.target.value)} maxLength={300} placeholder={CUSTOM_PLACEHOLDER} className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm placeholder:text-foreground-faint" data-testid="report-custom-input" />
                  <button type="button" onClick={() => void addCustom()} disabled={checking || !custom1.trim()} className={btn} data-testid="report-custom-button">{CUSTOM_ADD_BUTTON}</button>
                </div>
                {custom1Msg && <p className="text-sm" role="status" data-testid="report-custom-msg">{custom1Msg}</p>}
              </div>
            )}
            <p className="mt-1 text-xs text-foreground-muted" data-testid="report-total-line">{CUSTOM_TOTAL(stocks.length, per)}. {REPORT_LIMIT_LINE}</p>
          </div>

          {usesLine && <p className="text-sm font-medium" data-testid="report-uses">{usesLine}</p>}
          {left && left.addon > 0 && <p className="text-xs text-foreground-muted" data-testid="report-addon-line">{ADDON_LINE(left.addon, Math.min(addonUsed, left.addon))}</p>}
          {est && (est.already_answered ?? 0) > 0 && typeof est.total_pairs === "number" && (
            <p className="text-sm font-medium" data-testid="report-already">{SAVED_ANSWERS_LINE(est.already_answered as number, est.total_pairs, est.uses ?? Math.max(0, est.total_pairs - (est.already_answered as number)))}</p>
          )}
          {est?.free_one_stock && <p className="text-sm" data-testid="report-free-upgrade">{FREE_UPGRADE_REPORT} <Link href="/pricing" className="font-medium text-accent hover:underline">{SEE_PRICING}</Link></p>}
          {emptyPool && (
            <p className="text-sm" role="status" data-testid="report-pool-empty">
              {free ? FREE_UPGRADE_QUESTIONS : POOL_EMPTY(resetDate ?? "your next renewal date")}{" "}
              <Link href={free ? "/pricing" : "/account"} className="font-medium text-accent hover:underline" data-testid="report-addon-link">{free ? SEE_PRICING : ADDON_LINK}</Link>
            </p>
          )}
          {!emptyPool && !enough && left !== null && stocks.length > 0 && per > 0 && (
            <div className="space-y-1" data-testid="report-offers">
              <p className="text-sm">{free ? FREE_UPGRADE_REPORT : OFFER_FITS}</p>
              {!free && (
                <ul className="flex flex-wrap gap-2">
                  {offers.map((o) => (
                    <li key={`${o.stocks}x${o.questions}`}>
                      <button type="button" className={btn} data-testid="report-offer" onClick={() => { setStocks((l) => l.slice(0, o.stocks)); setCustom([]); setKeys(KEYS.slice(0, o.questions)); }}>
                        {offerLabel(o)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!free && <Link href="/account" className="text-sm font-medium text-accent hover:underline" data-testid="report-addon-link">{ADDON_LINK}</Link>}
            </div>
          )}
          {errPlan && (
            <div className="space-y-1 rounded-lg border border-border bg-surface-raised p-2 text-sm" role="status" data-testid="report-error">
              <p>{errPlan.message}</p>
              {errPlan.options && errPlan.options.length > 0 && <ul className="flex flex-wrap gap-2">{errPlan.options.map((o) => <li key={`${o.stocks}x${o.questions}`} className="text-xs text-foreground-muted">{offerLabel(o)}</li>)}</ul>}
            </div>
          )}
          {drops && (
            <PlanLimitDialog
              d={drops}
              onCancel={() => setDrops(null)}
              onConfirm={() => void go(dropAi, true)}
              onAfterDelete={() => { setDrops(null); void go(dropAi, false); }}
            />
          )}
          {msg && <p className="text-sm" role="status" data-testid="report-msg">{msg}</p>}
          {!user ? null : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void go(true)} disabled={busy || !within || stocks.length === 0 || per === 0 || !enough || !!est?.free_one_stock} className={primary} data-testid="report-create">{busy ? "Working…" : isUpdate ? UPDATE_REPORT : CREATE_REPORT}</button>
              <button type="button" onClick={() => void go(false)} disabled={busy || stocks.length === 0} className={btn} data-testid="report-create-no-ai">{CREATE_WITHOUT_AI}</button>
              <button type="button" onClick={() => setCustomise((c) => !c)} aria-expanded={customise} className={btn} data-testid="report-customise">{CUSTOMISE}</button>
            </div>
          )}
        </>
      )}
      {!job && doneNote && <p className="text-sm" role="status" data-testid="report-done-note">{doneNote}</p>}
    </section>
  );
}
