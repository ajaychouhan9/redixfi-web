"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { getLadderData, getSignals } from "@/lib/api/endpoints";
import { addToWatchlist, createMyScreen, deleteMyScreen, listMyScreens, type MyScreen } from "@/lib/api/mutations";
import type { SignalRow } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { signupHref } from "@/lib/nav-items";
import { stockPath } from "@/lib/seo/stock-symbol";
import {
  BANK_NOTE, BANK_WHY, BANK_WHY_LABEL, CLEAR_ALL, COMMON_LABEL, COMMON_RULES, COMPARE_NOTE, EMPTY_RULES, LADDER_INTRO, LIST_PAGE_SIZE, NO_ROCE_LINE,
  NUMBERS_AS_OF, PAST_LINE, RESULTS_LEAD, RESULTS_TITLE, RULES, SHOW_BUTTON, SORT_CHOICES, START_COMMON, STEP6_TITLE, STEP6_WHY, STEPS,
  cardValues, countsByStep, fromParams, hasAnyRule, needsPledge, num, roceGap, toParams, validLadderData,
  type LadderData, type RuleDef, type Rules,
} from "@/lib/stock-check";
import { ASK_QUESTIONS, SAMPLE_NAME, SAMPLE_SYMBOL, askHref } from "@/lib/read-company";
import { AskPreview } from "@/components/app/stock-check/AskPreview";

const field = "h-10 w-28 rounded-lg border border-border bg-surface px-2 text-sm tabular-nums";
const fmtDate = (iso: string | null | undefined): string | null => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

/** The note shown on the ROCE and debt steps and under the Screener ROCE filter, with a Why? that opens the fuller reason. */
export function BankNote({ testId = "bank-note" }: { testId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground-muted" data-testid={testId}>
      <p>
        {BANK_NOTE}{" "}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="font-medium text-accent underline" data-testid="bank-why-toggle">
          {BANK_WHY_LABEL}
        </button>
      </p>
      {open && (
        <p className="mt-2 leading-relaxed" data-testid="bank-why">
          {BANK_WHY}
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
          placeholder="Not set"
          className={field}
        />
        {d.unit && <span className="text-xs text-foreground-muted">{d.unit}</span>}
      </span>
    </div>
  );
}

function StepBody({ step, rules, set, data }: { step: number; rules: Rules; set: (p: Partial<Rules>) => void; data: LadderData | null }) {
  const defs = RULES.filter((d) => d.step === step);
  const gap = useMemo(() => (data && step === 2 ? roceGap(data, rules) : null), [data, rules, step]);
  return (
    <div className="space-y-3">
      {defs.map((d) =>
        d.op === "gt0" ? (
          <label key={d.key} className="flex items-start gap-2 text-sm" data-testid={`rule-${d.key}`}>
            <input type="checkbox" checked={rules.profitQ} onChange={(e) => set({ profitQ: e.target.checked })} className="mt-1 h-4 w-4 shrink-0" />
            <span>
              <span className="font-medium">{d.label}</span>
              <span className="block text-xs text-foreground-muted">{d.hint}</span>
            </span>
          </label>
        ) : (
          <NumberRule key={d.key} d={d} rules={rules} set={set} />
        ),
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
                  onChange={() => set({ vol: v, volNum: v === "" ? "" : rules.volNum || (v === "calmer" ? "25" : "75") })}
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
      {step === 3 && <BankNote testId="bank-note-debt" />}
      {step === 5 && <p className="text-sm text-foreground-muted">A good company can still be priced high.</p>}
    </div>
  );
}

/** "Build Your Shortlist": the rule ladder, counts after each step (in the browser), the shortlist, and Save my rules. */
export function ShortlistLadder() {
  const { user, getToken } = useAuth();
  const [data, setData] = useState<LadderData | null>(null);
  const [dataError, setDataError] = useState(false);
  const [rules, setRules] = useState<Rules>(EMPTY_RULES);
  const [open, setOpen] = useState<boolean[]>([true, false, false, false, false, false, false]);
  const [sort, setSort] = useState(SORT_CHOICES[0].value);

  const [rows, setRows] = useState<SignalRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [roceCounts, setRoceCounts] = useState<{ no: number; na: number } | null>(null);
  const [page, setPage] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [limited, setLimited] = useState(false);
  const [shownRules, setShownRules] = useState<Rules>(EMPTY_RULES);
  const [added, setAdded] = useState<Record<string, "added" | "error">>({});

  const [saved, setSaved] = useState<MyScreen[]>([]);
  const [savedLimit, setSavedLimit] = useState<number | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

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

  const loadSaved = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getToken();
      if (!token) return;
      const r = await listMyScreens(token);
      setSaved(r.screens);
      setSavedLimit(r.limit);
    } catch {
      /* the saved list is a convenience; the ladder works without it */
    }
  }, [user, getToken]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSaved();
  }, [loadSaved]);

  const counts = useMemo(() => (data ? countsByStep(data, rules) : null), [data, rules]);
  const left = counts ? counts[5] : null;
  const set = (patch: Partial<Rules>) => setRules((r) => ({ ...r, ...patch }));
  const toggle = (i: number) => setOpen((o) => o.map((v, k) => (k === i ? !v : v)));
  const anyRule = hasAnyRule(rules);

  async function load(nextPage: number) {
    setState("loading");
    const choice = SORT_CHOICES.find((s) => s.value === sort) ?? SORT_CHOICES[0];
    try {
      const token = user ? await getToken() : null;
      const env = await getSignals(
        { ...toParams(rules), sort: choice.value, order: choice.order, page: nextPage, size: LIST_PAGE_SIZE, ...(needsPledge(rules) ? { fields: "pledge_pct" } : {}) },
        token ? { token } : undefined,
      );
      setRows((prev) => (nextPage === 1 ? env.data : [...prev, ...env.data]));
      setTotal(env.page_info.total);
      const info = env.page_info as unknown as { roce_no_figure_count?: number; roce_not_applicable_count?: number };
      setRoceCounts(typeof info.roce_no_figure_count === "number" ? { no: info.roce_no_figure_count, na: info.roce_not_applicable_count ?? 0 } : null);
      setPage(nextPage);
      setShownRules(rules);
      setState("ok");
    } catch {
      if (nextPage > 1) setLimited(true);
      setState(nextPage > 1 ? "ok" : "error");
    }
  }
  function show() {
    setRows([]);
    setTotal(null);
    setLimited(false);
    void load(1);
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

  async function saveRules() {
    setSaveMsg(null);
    const name = saveName.trim();
    if (!name) return setSaveMsg("Give your rules a name first.");
    if (!anyRule) return setSaveMsg("Set at least one rule first.");
    try {
      const token = await getToken();
      if (!token) throw new Error("Log in to save your rules.");
      const choice = SORT_CHOICES.find((s) => s.value === sort) ?? SORT_CHOICES[0];
      await createMyScreen(token, name, { ...toParams(rules), sort: choice.value, order: choice.order } as never);
      setSaveName("");
      setSaveMsg("Saved.");
      await loadSaved();
    } catch (e) {
      setSaveMsg(e instanceof Error && e.message ? e.message : "The rules could not be saved right now.");
    }
  }
  async function removeSaved(id: string) {
    try {
      const token = await getToken();
      if (!token) return;
      await deleteMyScreen(token, id);
      await loadSaved();
    } catch {
      setSaveMsg("That saved set could not be removed right now.");
    }
  }

  const asOf = fmtDate(data?.as_of);
  const more = state === "ok" && total !== null && rows.length < total && !limited;
  const busy = state === "loading";

  return (
    <div className="space-y-4" data-testid="ladder">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setRules(COMMON_RULES)} className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground" data-testid="ladder-common">
          {START_COMMON}
        </button>
        <button type="button" onClick={() => setRules(EMPTY_RULES)} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium text-foreground-muted hover:text-foreground" data-testid="ladder-clear">
          {CLEAR_ALL}
        </button>
      </div>
      <p className="text-xs text-foreground-muted" data-testid="ladder-common-label">{COMMON_LABEL}</p>
      <p className="text-sm text-foreground-muted">{LADDER_INTRO}</p>

      <div className="sticky top-0 z-20 -mx-1 rounded-xl border border-border bg-surface-raised px-4 py-2 shadow-sm md:top-[var(--header-height,0px)]" data-testid="ladder-bar" aria-live="polite">
        <p className="text-base font-semibold" data-testid="ladder-left">
          {left === null ? (dataError ? "Counts are not available right now" : "Loading the counts…") : `${left.toLocaleString("en-IN")} ${left === 1 ? "stock" : "stocks"} left`}
        </p>
        {data && <p className="text-xs text-foreground-muted" data-testid="ladder-asof">{asOf ? NUMBERS_AS_OF(asOf) : "Numbers as of the latest update"}</p>}
      </div>
      <p className="text-xs text-foreground-muted" data-testid="ladder-past">{PAST_LINE}</p>

      <ol className="space-y-3">
        {STEPS.map((s) => (
          <li key={s.n}>
            <section className="rounded-xl border border-border bg-surface" data-testid={`ladder-step-${s.n}`}>
              <button type="button" onClick={() => toggle(s.n)} aria-expanded={open[s.n]} className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-2 text-left">
                <span className="text-sm font-semibold">
                  Step {s.n}. {s.title}
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
                  <StepBody step={s.n} rules={rules} set={set} data={data} />
                </div>
              )}
            </section>
          </li>
        ))}
        <li>
          <section className="rounded-xl border border-border bg-surface" data-testid="ladder-step-6">
            <button type="button" onClick={() => toggle(6)} aria-expanded={open[6]} className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-2 text-left">
              <span className="text-sm font-semibold">Step 6. {STEP6_TITLE}</span>
              <ChevronDown size={14} className={open[6] ? "rotate-180" : ""} aria-hidden />
            </button>
            {open[6] && (
              <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
                <p className="text-sm leading-relaxed text-foreground-muted">{STEP6_WHY}</p>
                {user ? (
                  <ul className="space-y-2" data-testid="ladder-chips">
                    {Object.entries(ASK_QUESTIONS).map(([key, q]) => (
                      <li key={key}>
                        <Link href={askHref(SAMPLE_SYMBOL, key)} className="inline-flex min-h-[44px] items-center rounded-full border border-border bg-hover px-4 py-2 text-sm hover:border-accent">
                          {q}
                        </Link>
                      </li>
                    ))}
                    <li className="text-xs text-foreground-muted">These open Ask AI on {SAMPLE_NAME}, a sample company. Open any company from your shortlist and ask the same questions there.</li>
                  </ul>
                ) : (
                  <AskPreview />
                )}
              </div>
            )}
          </section>
        </li>
      </ol>

      <section aria-labelledby="save-rules" className="rounded-xl border border-border bg-surface p-4" data-testid="save-rules">
        <h3 id="save-rules" className="text-sm font-semibold">Save my rules</h3>
        {!user ? (
          <p className="mt-1 text-sm text-foreground-muted">
            Keep your rules under a name and open them again later.{" "}
            <Link href={signupHref("/stock-check")} className="font-medium text-accent hover:underline">Sign up free</Link> or <Link href="/login" className="font-medium text-accent hover:underline">log in</Link>.
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="save-name" className="sr-only">Name for these rules</label>
              <input id="save-name" value={saveName} onChange={(e) => setSaveName(e.target.value)} maxLength={60} placeholder="Name these rules" className="h-10 min-w-[12rem] flex-1 rounded-lg border border-border bg-surface px-3 text-sm" />
              <button type="button" onClick={() => void saveRules()} className="min-h-[44px] rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10" data-testid="save-rules-button">
                Save my rules
              </button>
            </div>
            {savedLimit !== null && <p className="text-xs text-foreground-muted">Your plan keeps {savedLimit} saved {savedLimit === 1 ? "set" : "sets"} of rules. You have {saved.length}.</p>}
            {saveMsg && <p className="text-sm" role="status" data-testid="save-rules-msg">{saveMsg}</p>}
            {saved.length > 0 && (
              <ul className="space-y-2" data-testid="saved-list">
                {saved.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="flex gap-2">
                      <button type="button" onClick={() => { setRules(fromParams(s.params)); setSaveMsg(`Opened "${s.name}". Change the rules and press the show button to run them again.`); }} className="min-h-[44px] rounded-lg border border-border px-3 text-sm hover:border-accent">Open</button>
                      <button type="button" onClick={() => void removeSaved(s.id)} className="min-h-[44px] rounded-lg border border-border px-3 text-sm text-foreground-muted hover:text-foreground">Delete</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="ladder-results" className="space-y-3" data-testid="ladder-results">
        <h3 id="ladder-results" className="text-lg font-semibold">{RESULTS_TITLE}</h3>
        <p className="text-sm text-foreground-muted">{RESULTS_LEAD}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="ladder-sort" className="text-sm font-medium">Sort by</label>
          <select id="ladder-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-lg border border-border bg-surface px-2 text-sm" data-testid="ladder-sort">
            {SORT_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button type="button" onClick={show} disabled={busy} className="min-h-[44px] rounded-lg bg-accent px-5 text-sm font-semibold text-accent-foreground disabled:opacity-60" data-testid="ladder-show">
            {busy && page === 0 ? "Loading…" : SHOW_BUTTON}
          </button>
        </div>
        {state === "idle" && <p className="text-sm text-foreground-muted">With no rules set, every stock is listed.</p>}
        {state === "error" && <p className="text-sm text-foreground-muted">The list could not be loaded right now. Please try again in a moment.</p>}
        {(state === "ok" || (busy && rows.length > 0)) && (
          <>
            <p className="text-sm font-medium" data-testid="ladder-total">
              {total !== null ? `${total.toLocaleString("en-IN")} ${total === 1 ? "stock meets" : "stocks meet"} the rules you chose.` : ""}
              {sort !== "name" ? ` Sorted by ${SORT_CHOICES.find((c) => c.value === sort)?.label.toLowerCase()}, as you chose.` : ""}
            </p>
            {roceCounts && roceCounts.no > 0 && <p className="text-sm text-foreground-muted" data-testid="ladder-roce-no-figure">{NO_ROCE_LINE(roceCounts.no)}.</p>}
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
                      <Link href={signupHref("/stock-check")} className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-4 text-sm font-medium hover:border-accent" data-testid="ladder-watch-login">
                        Add to watchlist
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {more && (
              <button type="button" onClick={() => void load(page + 1)} disabled={busy} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground">
                {busy ? "Loading…" : `Show ${Math.min(LIST_PAGE_SIZE, (total ?? 0) - rows.length)} more`}
              </button>
            )}
            {limited && (
              <p className="text-sm text-foreground-muted">
                The full list is included with a free account. <Link href={signupHref("/stock-check")} className="font-medium text-accent hover:underline">Sign up free</Link>
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
