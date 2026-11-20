"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { getLadderData, getSignals } from "@/lib/api/endpoints";
import { addToWatchlist, getMyScreenSnapshot, type MyScreen } from "@/lib/api/mutations";
import type { SignalRow } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { signupHref } from "@/lib/nav-items";
import { stockPath } from "@/lib/seo/stock-symbol";
import {
  BANK_NOTE, BANK_WHY, BANK_WHY_LABEL, DEBT_NOTE, DEBT_WHY, EXAMPLES, exampleLine, ruleProblem, COUNTS_NOTE, COMPARE_NOTE, EMPTY_RULES, LADDER_INTRO, LIST_PAGE_SIZE, NO_GROWTH_LINE, NO_ROCE_LINE,
  NUMBERS_AS_OF, PAST_LINE, RESULTS_LEAD, RESULTS_TITLE, RULES, SHOW_BUTTON, SORT_CHOICES, STEPS,
  cardValues, countsByStep, fromParams, growthGap, needsPledge, num, roceGap, toParams, validLadderData, volOn,
  type LadderData, type RuleDef, type Rules,
} from "@/lib/stock-check";
import { ASK_GROUP_MAX, toggleSelected } from "@/lib/ask-group";
import { RUN_AGAIN_RESULT, SHOWING_RULE, diffLists, fmtDay, type ActiveRule } from "@/lib/my-rules";
import { AskAboutStocks } from "@/components/app/stock-check/AskAboutStocks";
import { MyRulesCard } from "@/components/app/stock-check/MyRulesCard";
import { RulesApplied } from "@/components/app/stock-check/RulesApplied";

const field = "h-10 w-28 rounded-lg border border-border bg-surface px-2 text-sm tabular-nums";
const fmtDate = fmtDay;

/** The note shown on the ROCE and debt steps and under the Screener ROCE filter, with a Why? that opens the fuller reason. */
export function BankNote({ testId = "bank-note", note = BANK_NOTE, why = BANK_WHY, whyTestId = "bank-why" }: { testId?: string; note?: string; why?: string; whyTestId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground-muted" data-testid={testId}>
      <p>
        {note}{" "}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="font-medium text-accent underline" data-testid="bank-why-toggle">
          {BANK_WHY_LABEL}
        </button>
      </p>
      {open && (
        <p className="mt-2 leading-relaxed" data-testid={whyTestId}>
          {why}
        </p>
      )}
    </div>
  );
}

function NumberRule({ d, rules, set }: { d: RuleDef; rules: Rules; set: (patch: Partial<Rules>) => void }) {
  const id = `rule-${d.key}`;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid={`rule-${d.key}`}>
      <label htmlFor={id} className="min-w-[12rem] flex-1 text-sm">
        <span className="font-medium">{d.label}</span>
        <span className="block text-xs text-foreground-muted">{d.hint}</span>
      </label>
      <span className="flex items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          value={rules[d.key] as string}
          onChange={(e) => set({ [d.key]: e.target.value } as Partial<Rules>)}
          placeholder={EXAMPLES[d.key]?.value ?? "Not set"}
          className={field}
        />
        {d.unit && <span className="text-xs text-foreground-muted">{d.unit}</span>}
      </span>
      {EXAMPLES[d.key] && (
        <p className="basis-full text-[11px] text-foreground-faint" data-testid={`example-${d.key}`}>{exampleLine(EXAMPLES[d.key].text)}</p>
      )}
      {ruleProblem(d, rules[d.key] as string) && (
        <p className="basis-full text-[11px] text-foreground-muted" role="status" data-testid={`problem-${d.key}`}>{ruleProblem(d, rules[d.key] as string)}</p>
      )}
    </div>
  );
}

function StepBody({ step, rules, set, data }: { step: number; rules: Rules; set: (p: Partial<Rules>) => void; data: LadderData | null }) {
  const defs = RULES.filter((d) => d.step === step);
  const gap = useMemo(() => (data && step === 2 ? roceGap(data, rules) : null), [data, rules, step]);
  const growthLeftOut = useMemo(() => (data && step === 1 && rules.growthUp ? growthGap(data, rules) : 0), [data, rules, step]);
  return (
    <div className="space-y-3">
      {defs.map((d) =>
        d.op === "gt0" || d.op === "flag" ? (
          <label key={d.key} className="flex items-start gap-2 text-sm" data-testid={`rule-${d.key}`}>
            <input type="checkbox" checked={rules[d.key] === true} onChange={(e) => set({ [d.key]: e.target.checked } as Partial<Rules>)} className="mt-1 h-4 w-4 shrink-0" />
            <span>
              <span className="font-medium">{d.label}</span>
              <span className="block text-xs text-foreground-muted">{d.hint}</span>
            </span>
          </label>
        ) : (
          <NumberRule key={d.key} d={d} rules={rules} set={set} />
        ),
      )}
      {step === 1 && rules.growthUp && growthLeftOut > 0 && (
        <p className="text-sm text-foreground-muted" data-testid="growth-gap">{NO_GROWTH_LINE(growthLeftOut)}.</p>
      )}
      {step === 4 && (
        <fieldset className="space-y-2" data-testid="rule-vol">
          <legend className="text-sm font-medium">Price movement</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {([["", "No rule"], ["calmer", "Calmer"], ["active", "More active"]] as const).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="vol"
                  checked={rules.vol === v}
                  onChange={() => set({ vol: v, volNum: v === "" ? "" : v === "calmer" ? "25" : "75" })}
                  className="h-4 w-4"
                />
                {label}
              </label>
            ))}
          </div>
          {rules.vol !== "" && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor="rule-volNum">{rules.vol === "calmer" ? "More volatile than at most" : "More volatile than at least"}</label>
              <input id="rule-volNum" inputMode="decimal" value={rules.volNum} onChange={(e) => set({ volNum: e.target.value })} className={field} />
              <span className="text-xs text-foreground-muted">% of stocks</span>
              {rules.volNum.trim() !== "" && !volOn(rules) && (
                <p className="basis-full text-[11px] text-foreground-muted" role="status" data-testid="problem-volNum">Enter a number from 0 to 100. This is not used yet.</p>
              )}
            </div>
          )}
          <p className="text-xs text-foreground-muted">Bigger swings can go either way.</p>
        </fieldset>
      )}
      {step === 2 && (
        <>
          <p className="text-sm text-foreground-muted">{COMPARE_NOTE}</p>
          <BankNote />
          {gap && num(rules.roce) !== undefined && gap.noFigure > 0 && (
            <p className="text-sm text-foreground-muted" data-testid="roce-gap">
              {NO_ROCE_LINE(gap.noFigure)}
              {gap.notApplicable > 0 ? ` (${gap.notApplicable.toLocaleString("en-IN")} of them are banks, insurers or finance companies, where it does not apply)` : ""}.
            </p>
          )}
        </>
      )}
      {step === 3 && <BankNote testId="bank-note-debt" note={DEBT_NOTE} why={DEBT_WHY} whyTestId="debt-why" />}
      {step === 5 && <p className="text-sm text-foreground-muted">A good company can still be priced high.</p>}
    </div>
  );
}

/** "Build Your Shortlist": My rules, the rule ladder with counts after each step (in the browser), the shortlist with the rules applied, and Ask AI about the stocks. */
export function ShortlistLadder() {
  const { user, getToken } = useAuth();
  const [data, setData] = useState<LadderData | null>(null);
  const [dataError, setDataError] = useState(false);
  const [rules, setRules] = useState<Rules>(EMPTY_RULES);
  const [open, setOpen] = useState<boolean[]>([true, false, false, false, false, false]);
  const [sort, setSort] = useState(SORT_CHOICES[0].value);

  const [rows, setRows] = useState<SignalRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [roceCounts, setRoceCounts] = useState<{ no: number; na: number } | null>(null);
  const [growthNoFigure, setGrowthNoFigure] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [limited, setLimited] = useState(false);
  const [shownRules, setShownRules] = useState<Rules>(EMPTY_RULES);
  const [added, setAdded] = useState<Record<string, "added" | "error">>({});

  // My rules: the rule that is open (if any), the one the shown list came from, and the stocks ticked for Ask AI
  const [active, setActive] = useState<ActiveRule | null>(null);
  const [shownFrom, setShownFrom] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [runAgainLine, setRunAgainLine] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [capNote, setCapNote] = useState(false);

  useEffect(() => {
    let live = true;
    getLadderData()
      .then((d) => {
        if (!live) return;
        if (validLadderData(d)) setData(d);
        else setDataError(true);
      })
      .catch(() => live && setDataError(true));
    return () => {
      live = false;
    };
  }, []);

  const counts = useMemo(() => (data ? countsByStep(data, rules) : null), [data, rules]);
  const left = counts ? counts[5] : null;
  const set = (patch: Partial<Rules>) => setRules((r) => ({ ...r, ...patch }));
  const toggle = (i: number) => setOpen((o) => o.map((v, k) => (k === i ? !v : v)));
  const choice = SORT_CHOICES.find((s) => s.value === sort) ?? SORT_CHOICES[0];

  async function load(nextPage: number, useRules: Rules = rules, fromName: string | null = shownFrom) {
    setState("loading");
    try {
      const token = user ? await getToken() : null;
      const env = await getSignals(
        { ...toParams(useRules), sort: choice.value, order: choice.order, page: nextPage, size: LIST_PAGE_SIZE, ...(needsPledge(useRules) ? { fields: "pledge_pct" } : {}) },
        token ? { token } : undefined,
      );
      setRows((prev) => (nextPage === 1 ? env.data : [...prev, ...env.data]));
      setTotal(env.page_info.total);
      const info = env.page_info as unknown as { roce_no_figure_count?: number; roce_not_applicable_count?: number; growth_up_no_figure_count?: number };
      setRoceCounts(typeof info.roce_no_figure_count === "number" ? { no: info.roce_no_figure_count, na: info.roce_not_applicable_count ?? 0 } : null);
      setGrowthNoFigure(typeof info.growth_up_no_figure_count === "number" ? info.growth_up_no_figure_count : null);
      setPage(nextPage);
      setShownRules(useRules);
      setShownFrom(fromName);
      setState("ok");
    } catch {
      if (nextPage > 1) setLimited(true);
      setState(nextPage > 1 ? "ok" : "error");
    }
  }
  function show(useRules: Rules = rules, fromName: string | null = active ? active.name : null) {
    setRows([]);
    setTotal(null);
    setLimited(false);
    setRunAgainLine(null);
    setSelected([]);
    void load(1, useRules, fromName);
  }

  /** Every symbol that meets the given rules, 200 at a time (only used when a rule is saved with its stock list, or run again). Null when it cannot be loaded. */
  async function fetchSymbols(useRules: Rules = rules): Promise<string[] | null> {
    try {
      const token = user ? await getToken() : null;
      const out: string[] = [];
      for (let p = 1; p <= 20; p += 1) {
        const env = await getSignals({ ...toParams(useRules), sort: "name", order: "asc", page: p, size: 200 }, token ? { token } : undefined);
        out.push(...env.data.map((r) => r.symbol));
        if (out.length >= env.page_info.total || env.data.length === 0) return out;
      }
      return out;
    } catch {
      return null;
    }
  }

  function openRule(s: MyScreen) {
    const r = fromParams(s.params);
    setRules(r);
    setActive({ id: s.id, name: s.name, base: r });
    setNotice(`Opened "${s.name}". The list below shows its stocks.`);
    show(r, s.name);
    document.getElementById("ladder-results-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function runAgain(s: MyScreen) {
    openRule(s);
    try {
      const token = await getToken();
      if (!token) return;
      const [snap, now] = await Promise.all([getMyScreenSnapshot(token, s.id), fetchSymbols(fromParams(s.params))]);
      if (!snap || !now) return setRunAgainLine("The saved list could not be compared just now.");
      const d = diffLists(snap.stocks.map((x) => x.symbol), now);
      setRunAgainLine(RUN_AGAIN_RESULT(fmtDate(snap.as_of) ?? fmtDate(snap.at), { added: d.added.length, left: d.left.length }));
    } catch {
      setRunAgainLine("The saved list could not be compared just now.");
    }
  }

  async function addWatch(symbol: string) {
    try {
      const token = await getToken();
      if (!token) throw new Error("no token");
      await addToWatchlist(token, symbol);
      setAdded((a) => ({ ...a, [symbol]: "added" }));
    } catch {
      setAdded((a) => ({ ...a, [symbol]: "error" }));
    }
  }
  function tick(symbol: string) {
    const r = toggleSelected(selected, symbol);
    setSelected(r.list);
    setCapNote(r.capped);
  }

  const asOf = fmtDate(data?.as_of);
  const more = state === "ok" && total !== null && rows.length < total && !limited;
  const busy = state === "loading";

  return (
    <div className="space-y-4" data-testid="ladder">
      <MyRulesCard
        rules={rules}
        setRules={(r) => { setRules(r); setNotice(null); }}
        sort={{ value: choice.value, order: choice.order }}
        left={left}
        asOf={data?.as_of ?? null}
        active={active}
        setActive={setActive}
        fetchSymbols={() => fetchSymbols(rules)}
        onOpen={openRule}
        onRunAgain={(s) => void runAgain(s)}
      />
      {notice && <p className="text-sm text-foreground-muted" role="status" data-testid="ladder-notice">{notice}</p>}
      <p className="text-sm text-foreground-muted">{LADDER_INTRO}</p>

      <div className="sticky top-0 z-20 -mx-1 rounded-xl border border-border bg-surface-raised px-4 py-2 shadow-sm md:top-[var(--header-height,0px)]" data-testid="ladder-bar" aria-live="polite">
        <p className="text-base font-semibold" data-testid="ladder-left">
          {left === null ? (dataError ? "Counts are not available right now" : "Loading the counts…") : `${left.toLocaleString("en-IN")} ${left === 1 ? "stock" : "stocks"} left`}
        </p>
        <p className="text-xs text-foreground-muted" data-testid="ladder-counts-note">{COUNTS_NOTE}</p>
        {left !== null && (
          <button
            type="button"
            onClick={() => {
              show();
              document.getElementById("ladder-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            disabled={busy}
            className="mt-1 min-h-[44px] w-full rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-60 sm:w-auto"
            data-testid="ladder-bar-show"
          >
            {`Show ${left.toLocaleString("en-IN")} ${left === 1 ? "stock" : "stocks"}`}
          </button>
        )}
        {data && <p className="text-xs text-foreground-muted" data-testid="ladder-asof">{asOf ? NUMBERS_AS_OF(asOf) : "Numbers as of the latest update"}</p>}
      </div>
      <p className="text-xs text-foreground-muted" data-testid="ladder-past">{PAST_LINE}</p>

      <ol className="space-y-3">
        {STEPS.map((s) => (
          <li key={s.n}>
            <section className="rounded-xl border border-border bg-surface" data-testid={`ladder-step-${s.n}`}>
              <button type="button" onClick={() => toggle(s.n)} aria-expanded={open[s.n]} className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-2 text-left">
                <span className="text-sm font-semibold">
                  Step {s.n + 1}. {s.title}
                  <span className="block text-xs font-normal text-foreground-muted" data-testid="ladder-step-line">{s.line}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-foreground-muted">
                  <span data-testid={`ladder-count-${s.n}`}>{counts ? `${counts[s.n].toLocaleString("en-IN")} left` : ""}</span>
                  <ChevronDown size={14} className={open[s.n] ? "rotate-180" : ""} aria-hidden />
                </span>
              </button>
              {open[s.n] && (
                <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
                  <div>
                    <p className="text-sm font-semibold">Why this rule</p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground-muted" data-testid="ladder-why">{s.why}</p>
                  </div>
                  <StepBody step={s.n} rules={rules} set={(p) => { set(p); setNotice(null); }} data={data} />
                </div>
              )}
            </section>
          </li>
        ))}
      </ol>

      <section id="ladder-results-section" aria-labelledby="ladder-results" className="space-y-3" data-testid="ladder-results">
        <h3 id="ladder-results" className="scroll-mt-40 text-lg font-semibold">{RESULTS_TITLE}</h3>
        <p className="text-sm text-foreground-muted">{RESULTS_LEAD}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="ladder-sort" className="text-sm font-medium">Sort by</label>
          <select id="ladder-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-lg border border-border bg-surface px-2 text-sm" data-testid="ladder-sort">
            {SORT_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button type="button" onClick={() => show()} disabled={busy} className="min-h-[44px] rounded-lg bg-accent px-5 text-sm font-semibold text-accent-foreground disabled:opacity-60" data-testid="ladder-show">
            {busy && page === 0 ? "Loading…" : SHOW_BUTTON}
          </button>
        </div>
        {state === "idle" && <p className="text-sm text-foreground-muted">With no rules set, every stock is listed.</p>}
        {state === "error" && <p className="text-sm text-foreground-muted">The list could not be loaded right now. Please try again in a moment.</p>}
        {(state === "ok" || (busy && rows.length > 0)) && (
          <>
            {shownFrom && <p className="text-base font-semibold" data-testid="showing-rule">{SHOWING_RULE(shownFrom)}</p>}
            <RulesApplied rules={shownRules} />
            {runAgainLine && <p className="text-sm text-foreground-muted" role="status" data-testid="run-again-line">{runAgainLine}</p>}
            <p className="text-sm font-medium" data-testid="ladder-total">
              {total !== null ? `${total.toLocaleString("en-IN")} ${total === 1 ? "stock meets" : "stocks meet"} the rules you chose.` : ""}
              {sort !== "name" ? ` Sorted by ${SORT_CHOICES.find((c) => c.value === sort)?.label.toLowerCase()}, as you chose.` : ""}
            </p>
            {roceCounts && roceCounts.no > 0 && <p className="text-sm text-foreground-muted" data-testid="ladder-roce-no-figure">{NO_ROCE_LINE(roceCounts.no)}.</p>}
            {growthNoFigure !== null && growthNoFigure > 0 && <p className="text-sm text-foreground-muted" data-testid="ladder-growth-no-figure">{NO_GROWTH_LINE(growthNoFigure)}.</p>}
            {rows.length === 0 && <p className="text-sm text-foreground-muted">No stock meets all of these rules on the stored data.</p>}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="ladder-cards">
              {rows.map((r) => (
                <li key={r.symbol} className="rounded-xl border border-border bg-surface p-4" data-testid="ladder-card">
                  <p className="text-sm font-semibold">{displayName(r.company_name) || r.symbol}</p>
                  <p className="text-xs text-foreground-muted">{r.symbol}{typeof r.last_price === "number" ? ` · ₹${formatNumber(r.last_price, 2)}` : ""}</p>
                  <dl className="mt-2 space-y-1 text-sm">
                    {cardValues(shownRules, r as unknown as Record<string, unknown>).map((v) => (
                      <div key={v.label} className="flex justify-between gap-2"><dt className="text-foreground-muted">{v.label}</dt><dd className="text-right font-medium tabular-nums">{v.value}</dd></div>
                    ))}
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={stockPath("/stocks", r.symbol)} className="inline-flex min-h-[44px] items-center rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10" data-testid="ladder-read">
                      Read this company
                    </Link>
                    {user ? (
                      <button type="button" onClick={() => void addWatch(r.symbol)} disabled={added[r.symbol] === "added"} className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-4 text-sm font-medium hover:border-accent disabled:opacity-60" data-testid="ladder-watch">
                        {added[r.symbol] === "added" ? "Added to watchlist" : added[r.symbol] === "error" ? "Could not add. Try again" : "Add to watchlist"}
                      </button>
                    ) : (
                      <Link href={signupHref("/shortlist-lab")} className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-4 text-sm font-medium hover:border-accent" data-testid="ladder-watch-login">
                        Add to watchlist
                      </Link>
                    )}
                  </div>
                  {user && (
                    <label className="mt-3 flex min-h-[44px] items-center gap-2 text-sm" data-testid="ladder-select">
                      <input type="checkbox" checked={selected.includes(r.symbol)} onChange={() => tick(r.symbol)} className="h-5 w-5 shrink-0" aria-label={`Select ${r.symbol} for Ask AI`} />
                      <span>Select for Ask AI</span>
                    </label>
                  )}
                </li>
              ))}
            </ul>
            {more && (
              <button type="button" onClick={() => void load(page + 1, shownRules)} disabled={busy} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground">
                {busy ? "Loading…" : `Show ${Math.min(LIST_PAGE_SIZE, (total ?? 0) - rows.length)} more`}
              </button>
            )}
            {limited && (
              <p className="text-sm text-foreground-muted">
                The full list is included with a free account. <Link href={signupHref("/shortlist-lab")} className="font-medium text-accent hover:underline">Sign up free</Link>
              </p>
            )}
          </>
        )}
        {capNote && <p className="text-sm text-foreground-muted" role="status" data-testid="ask-cap-note">You can select up to {ASK_GROUP_MAX} stocks at a time.</p>}
      </section>

      <AskAboutStocks selected={selected} onRemove={(s) => { setSelected((l) => l.filter((x) => x !== s)); setCapNote(false); }} onClear={() => { setSelected([]); setCapNote(false); }} />
    </div>
  );
}
