"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getLadderData, getSignals } from "@/lib/api/endpoints";
import { getRuleRun, listRuleRuns, saveRuleRun, saveRuleWithResult, type MyScreen, type RuleRun, type RuleRunSaved } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import { displayName } from "@/lib/company-name";
import { signupHref } from "@/lib/nav-items";
import {
  ABOUT_MATCH, AFTER_STEP, BACK_TO_STEPS, BANK_NOTE, BANK_WHY, BANK_WHY_LABEL, BLANK_LINE, DEBT_NOTE, DEBT_WHY, EARLIER_VALUES_LINE, EXAMPLES, NEXT_STEP, NO_FILTER_LINE,
  REMOVED_DEPENDS, SECTION_RESULTS, SECTION_RULES, VIEW_STOCKS, exampleLine, ruleProblem, COUNTS_NOTE, EMPTY_RULES, NO_GROWTH_LINE, NO_ROCE_LINE, PAST_LINE,
  PV_FILTERS, PV_FOLD, RULES, SHOW_BUTTON, STEPS, STEPS_TITLE, VOL_LABEL, VOL_LINE, VOL_OPTIONS, volNumLabel, stepRowText, stepSetCount,
  countsByStep, fromParams, growthGap, hasAnyRule, roceGap, sameRules, toParams, typicalRules, validLadderData, volOn, chgOn, num, rulesUpTo,
  FILL_COUNT, mostRemovedStep, rulesSetCount, splitCounts,
  type LadderData, type RuleDef, type Rules,
} from "@/lib/stock-check";
import { OVER_LIMIT_LINE } from "@/lib/saved-results";
import { defaultRuleName, fmtDay, stocksText, type ActiveRule } from "@/lib/my-rules";
import {
  BACK_BUTTON, CREATE_REPORT, DAILY_LINE, DAILY_LINE_PRICE, EDIT_RULE, FIGURES_AS_OF, NAMES_TITLE_AFTER, NAMES_TITLE_LIVE, NAME_NEEDED, NO_MATCH_LINE, NO_MATCH_OPEN, NO_SAVED_RESULT, READONLY_LINE,
  RESULTS_LOGGED_OUT, RULE_REPORTS_TITLE, SEE_IN_RESULTS, STEADY_LINE,
} from "@/lib/report-flow";
import { CompareBlock, ResultsTab, RuleReports } from "@/components/app/stock-check/SavedResults";
import { ReportSheet, type EnsureOut } from "@/components/app/stock-check/ReportSheet";
import { NAMES_PAGE, StockNames, staticLoader, type NameItem, type NamesLoader } from "@/components/app/stock-check/StockNames";
import { FillRow, NameBox, RuleBottomBlock, RulesListPage, useSavedRules } from "@/components/app/stock-check/MyRulesParts";
import { RulesApplied } from "@/components/app/stock-check/RulesApplied";

const fmtDate = fmtDay;
const field = "h-10 w-28 rounded-lg border border-border bg-surface px-2 text-sm tabular-nums placeholder:text-foreground-faint";

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
          placeholder={EXAMPLES[d.key] ? `e.g. ${EXAMPLES[d.key].value}` : ""}
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

const sel = "h-10 rounded-lg border border-border bg-surface px-2 text-sm";

function PvBlock({ id, children }: { id: (typeof PV_FILTERS)[number]["id"]; children: React.ReactNode }) {
  const f = PV_FILTERS.find((x) => x.id === id) as (typeof PV_FILTERS)[number];
  return (
    <div className="rounded-lg border border-border p-3" data-testid={`pv-${id}`}>
      <p className="text-sm font-medium">{f.label}</p>
      <p className="text-xs text-foreground-muted" data-testid={`pv-${id}-line`}>{f.line}</p>
      <div className="mt-2">{children}</div>
      <p className="mt-1 text-[11px] text-foreground-faint" data-testid={`pv-${id}-example`}>{exampleLine(f.example.replace(/^e\.g\. /, ""))}</p>
      <details className="mt-2 text-xs text-foreground-muted" data-testid={`pv-${id}-fold`}>
        <summary className="min-h-[32px] cursor-pointer py-1 font-medium text-foreground">{PV_FOLD}</summary>
        <p data-testid={`pv-${id}-tells`}><span className="font-medium text-foreground">What it tells you:</span> {f.tells}</p>
        <p data-testid={`pv-${id}-not`}><span className="font-medium text-foreground">What it does not tell you:</span> {f.not}</p>
      </details>
    </div>
  );
}

/** Step 7, "Price and volume": four optional filters about past prices and volume. A blank field is not used. */
function PriceVolumeStep({ rules, set }: { rules: Rules; set: (p: Partial<Rules>) => void }) {
  const near = RULES.find((d) => d.key === "near52") as RuleDef;
  const vday = RULES.find((d) => d.key === "volDay") as RuleDef;
  const chgHalf = (rules.chgMonths !== "") !== (rules.chgMin.trim() !== "");
  return (
    <div className="space-y-3" data-testid="pv-step">
      <PvBlock id="chg">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="rule-chgMonths">Price change over the last</label>
          <select id="rule-chgMonths" value={rules.chgMonths} onChange={(e) => set({ chgMonths: e.target.value as Rules["chgMonths"] })} className={sel} data-testid="rule-chgMonths">
            <option value="">Choose a period</option>
            <option value="1">1 month</option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
          </select>
          <label htmlFor="rule-chgMin">at least</label>
          <input id="rule-chgMin" inputMode="decimal" value={rules.chgMin} onChange={(e) => set({ chgMin: e.target.value })} placeholder="e.g. 10" className={field} data-testid="rule-chgMin" />
          <span className="text-xs text-foreground-muted">%</span>
        </div>
        {rules.chgMin.trim() !== "" && num(rules.chgMin) === undefined && <p className="mt-1 text-[11px] text-foreground-muted" role="status" data-testid="problem-chgMin">Enter a number. This is not used yet.</p>}
        {rules.chgMin.trim() !== "" && num(rules.chgMin) !== undefined && !chgOn(rules) && rules.chgMonths !== "" && <p className="mt-1 text-[11px] text-foreground-muted" role="status" data-testid="problem-chgMin">Enter a number from -100 to 100,000. This is not used yet.</p>}
        {chgHalf && <p className="mt-1 text-[11px] text-foreground-muted" role="status" data-testid="problem-chg-pair">Choose both the period and the number. This is not used yet.</p>}
      </PvBlock>
      <PvBlock id="near52">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="rule-near52">No more than</label>
          <input id="rule-near52" inputMode="decimal" value={rules.near52} onChange={(e) => set({ near52: e.target.value })} placeholder="e.g. 10" className={field} data-testid="rule-near52" />
          <span className="text-xs text-foreground-muted">% below its 52-week high</span>
        </div>
        {ruleProblem(near, rules.near52) && <p className="mt-1 text-[11px] text-foreground-muted" role="status" data-testid="problem-near52">{ruleProblem(near, rules.near52)}</p>}
      </PvBlock>
      <PvBlock id="avg">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="rule-avgDays">Price above its</label>
          <select id="rule-avgDays" value={rules.avgDays} onChange={(e) => set({ avgDays: e.target.value as Rules["avgDays"] })} className={sel} data-testid="rule-avgDays">
            <option value="">Choose an average</option>
            <option value="50">50-day average</option>
            <option value="200">200-day average</option>
          </select>
        </div>
      </PvBlock>
      <PvBlock id="volDay">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="rule-volDay">At least</label>
          <input id="rule-volDay" inputMode="decimal" value={rules.volDay} onChange={(e) => set({ volDay: e.target.value })} placeholder="e.g. 1.5" className={field} data-testid="rule-volDay" />
          <span className="text-xs text-foreground-muted">times its 20-day average volume</span>
        </div>
        {ruleProblem(vday, rules.volDay) && <p className="mt-1 text-[11px] text-foreground-muted" role="status" data-testid="problem-volDay">{ruleProblem(vday, rules.volDay)}</p>}
      </PvBlock>
    </div>
  );
}

function StepBody({ step, rules, set, data }: { step: number; rules: Rules; set: (p: Partial<Rules>) => void; data: LadderData | null }) {
  const defs = RULES.filter((d) => d.step === step && step !== 6);
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
        <div className="space-y-2" data-testid="rule-vol">
          <label htmlFor="rule-volSel" className="block text-sm font-medium">{VOL_LABEL}</label>
          <p className="text-xs text-foreground-muted" data-testid="rule-vol-line">{VOL_LINE}</p>
          <select
            id="rule-volSel"
            value={rules.vol}
            onChange={(e) => {
              const v = e.target.value as Rules["vol"];
              set({ vol: v, volNum: v === "" ? "" : v === "calmer" ? "25" : "75" });
            }}
            className={sel}
            data-testid="rule-vol-select"
          >
            {VOL_OPTIONS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          {rules.vol !== "" && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor="rule-volNum">{volNumLabel(rules.vol)}</label>
              <input id="rule-volNum" inputMode="decimal" value={rules.volNum} onChange={(e) => set({ volNum: e.target.value })} placeholder="e.g. 25" className={field} data-testid="rule-volNum" />
              <span className="text-xs text-foreground-muted">% of stocks</span>
              {rules.volNum.trim() !== "" && !volOn(rules) && (
                <p className="basis-full text-[11px] text-foreground-muted" role="status" data-testid="problem-volNum">Enter a number from 0 to 100. This is not used yet.</p>
              )}
            </div>
          )}
          <p className="text-[11px] text-foreground-faint" data-testid="example-volNum">{exampleLine(EXAMPLES.volNum.text)}</p>
        </div>
      )}
      {step === 2 && (
        <>
          {num(rules.roce) !== undefined && <BankNote />}
          {gap && num(rules.roce) !== undefined && gap.noFigure > 0 && (
            <p className="text-sm text-foreground-muted" data-testid="roce-gap">
              {NO_ROCE_LINE(gap.noFigure)}
              {gap.notApplicable > 0 ? ` (${gap.notApplicable.toLocaleString("en-IN")} of them are banks, insurers or finance companies, where it does not apply)` : ""}.
            </p>
          )}
        </>
      )}
      {step === 3 && num(rules.de) !== undefined && <BankNote testId="bank-note-debt" note={DEBT_NOTE} why={DEBT_WHY} whyTestId="debt-why" />}
      {step === 6 && <PriceVolumeStep rules={rules} set={set} />}
    </div>
  );
}

type Section = "rules" | "results";
/** The latest saved result of the open rule (its count and date are what the one-line summary shows). */
type Latest = RuleRun;

/** One quiet line: which steps can change the list every day. */
function DailyNote({ testId = "ladder-daily-line" }: { testId?: string }) {
  return <p className="text-xs text-foreground-muted" data-testid={testId}>{DAILY_LINE} {DAILY_LINE_PRICE}</p>;
}

/** "Build Your Shortlist" (My rules tab): two top tabs, Rules and Results. The Rules tab lists the saved rules and holds the rule page (read-only for an opened saved rule until "Edit rule");
 *  Results is a shelf of saved reports. */
export function ShortlistLadder() {
  const { user, getToken } = useAuth();
  const [data, setData] = useState<LadderData | null>(null);
  const [dataError, setDataError] = useState(false);
  const [rules, setRules] = useState<Rules>(EMPTY_RULES);
  const [section, setSection] = useState<Section>("rules");
  const [page, setPage] = useState<"list" | "edit">("list");
  const [stepOpen, setStepOpen] = useState<number | null>(null);
  const [noFilter, setNoFilter] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // the rule that is open (if any) and whether it is being edited; a saved rule opens read-only
  const [active, setActive] = useState<ActiveRule | null>(null);
  const [editing, setEditing] = useState(true);
  const [latest, setLatest] = useState<Latest | null | undefined>(undefined);
  const [latestStocks, setLatestStocks] = useState<NameItem[] | null>(null);
  const [readOpen, setReadOpen] = useState(false);
  // names of the stocks left after a step ("step"), or after every step ("all"); and the Create report sheet
  const [names, setNames] = useState<{ kind: "all" } | { kind: "step"; n: number } | null>(null);
  const [sheet, setSheet] = useState<"live" | "saved" | null>(null);
  const [rulesKey, setRulesKey] = useState(0);
  const [resultsKey, setResultsKey] = useState(0);
  // the rule's name (the box is above the steps) and the plain message when it is blank
  const [name, setName] = useState("");
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const [fillLine, setFillLine] = useState<string | null>(null);
  // the rule whose reports are open on the Results tab (null: the list of rules)
  const [resultsRuleId, setResultsRuleId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const savedState = useSavedRules(rulesKey);

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

  const filled = hasAnyRule(rules);
  const counts = useMemo(() => (data ? countsByStep(data, rules) : null), [data, rules]);
  const left = counts ? counts[6] : null;
  const universe = data ? data.rows.length : null;
  const split = useMemo(() => (data && filled ? splitCounts(data, rules) : null), [data, rules, filled]);
  const noMatchStep = useMemo(() => (data && filled && left === 0 ? mostRemovedStep(data, rules) : null), [data, rules, filled, left]);
  const figuresDate = data?.as_of ? fmtDate(data.as_of) ?? data.as_of : null;
  const set = (patch: Partial<Rules>) => {
    setRules((r) => ({ ...r, ...patch }));
    setNotice(null);
    setNoFilter(false);
  };
  const scrollTop = () => topRef.current?.scrollIntoView({ block: "start" });
  const goSection = (s: Section) => {
    setSection(s);
    setStepOpen(null);
    if (s === "results") setResultsRuleId(null);
    scrollTop();
  };
  /** Take the person to one rule's reports (the Results tab, that rule open). */
  const goReports = (ruleId: string) => {
    setResultsRuleId(ruleId);
    setSection("results");
    setStepOpen(null);
    setRulesKey((k) => k + 1);
    setResultsKey((k) => k + 1);
    window.setTimeout(scrollTop, 0);
  };
  /** A logged-in person cannot show, save or report a rule with no name: the plain message appears beside the name box. */
  const requireName = (): boolean => {
    if (!user || name.trim()) return true;
    setNameMsg(NAME_NEEDED);
    nameRef.current?.focus();
    nameRef.current?.scrollIntoView({ block: "center" });
    return false;
  };
  const readOnly = !!active && !editing;
  const changed = !!active && !sameRules(rules, active.base);

  // the latest saved result of the open rule: the summary line, the "View stocks" list and "Create report" all come from it
  useEffect(() => {
    if (!user || !active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLatest(undefined);
      return;
    }
    let live = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const r = await listRuleRuns(token, active.id);
        if (live) setLatest(r.runs.length ? r.runs[0] : null);
      } catch {
        if (live) setLatest(undefined);
      }
    })();
    return () => {
      live = false;
    };
  }, [user, active?.id, resultsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // the saved result's stocks (names only), read when "View stocks" is pressed
  async function openRead() {
    setReadOpen(true);
    if (!active || !latest) return;
    try {
      const token = await getToken();
      if (!token) return;
      const d = await getRuleRun(token, active.id, latest.id);
      setLatestStocks(d.stocks.map((s) => ({ symbol: s.symbol, company: s.company })));
    } catch {
      setLatestStocks([]);
    }
  }

  /** The names of the stocks left after step `upTo` (0 to 6): the same rules the counts use, with later steps left out. */
  const liveLoader = useCallback(
    (upTo: number): NamesLoader =>
      async (q, pageNo) => {
        const token = user ? await getToken() : null;
        const env = await getSignals(
          { ...toParams(rulesUpTo(rules, upTo)), sort: "name", order: "asc", page: pageNo, size: NAMES_PAGE, ...(q.trim() ? { q: q.trim() } : {}) } as never,
          token ? { token } : undefined,
        );
        return { items: env.data.map((r) => ({ symbol: r.symbol, company: displayName(r.company_name) || r.symbol })), total: env.page_info.total };
      },
    [rules, user, getToken], 
  );
  const loadKey = (upTo: number) => `${upTo}|${JSON.stringify(toParams(rulesUpTo(rules, upTo)))}`;

  /** The one result button on an edited or new rule: list the names of the stocks that meet the rule today (nothing is saved). */
  function onResult() {
    if (!requireName()) return;
    if (!hasAnyRule(rules)) {
      setNoFilter(true);
      return;
    }
    setNoFilter(false);
    setNames({ kind: "all" });
    setSheet(null);
  }

  function createRule() {
    setRules(EMPTY_RULES);
    setName(defaultRuleName());
    setNameMsg(null);
    setFillLine(null);
    setActive(null);
    setEditing(true);
    setNotice(null);
    setNoFilter(false);
    setStepOpen(null);
    setNames(null);
    setSheet(null);
    setReadOpen(false);
    setPage("edit");
    window.setTimeout(scrollTop, 0);
  }
  /** Tap a saved rule: it opens read-only. Nothing is run. */
  function openRule(s: MyScreen) {
    const r = fromParams(s.params);
    setRules(r);
    setName(s.name);
    setNameMsg(null);
    setFillLine(null);
    setActive({ id: s.id, name: s.name, base: r });
    setEditing(false);
    setNotice(null);
    setNoFilter(false);
    setStepOpen(null);
    setNames(null);
    setSheet(null);
    setReadOpen(false);
    setLatestStocks(null);
    setPage("edit");
    window.setTimeout(scrollTop, 0);
  }
  function backToList() {
    setPage("list");
    setStepOpen(null);
    setNames(null);
    setSheet(null);
    setReadOpen(false);
    scrollTop();
  }

  /** Save the list as a result of the open rule (or of a new rule saved under a name) so a report can be added to it. Asks before replacing or removing a result at the plan limit. */
  async function ensure(name: string | undefined, confirmDrop: boolean): Promise<EnsureOut> {
    const token = await getToken();
    if (!token) throw new Error("login");
    const params = toParams(rules) as Record<string, unknown>;
    if (active) {
      const out: RuleRunSaved = await saveRuleRun(token, active.id, params, confirmDrop);
      if (out.blocked) return { kind: "blocked", message: out.message ?? OVER_LIMIT_LINE(out.limit, out.count ?? 0) };
      if (out.needs_confirm && out.drops) return { kind: "confirm", drops: { ruleId: active.id, drops: out.drops, limit: out.limit } };
      if (!out.run) return { kind: "blocked", message: "This result could not be saved right now. Please try again." };
      setResultsKey((k) => k + 1);
      return { kind: "saved", ruleId: active.id, runId: out.run.id };
    }
    const out = await saveRuleWithResult(token, (name ?? "").trim(), { ...toParams(rules), sort: "name", order: "asc" } as Record<string, unknown>);
    setActive({ id: out.rule.id, name: out.rule.name, base: rules });
    setResultsKey((k) => k + 1);
    setRulesKey((k) => k + 1);
    return { kind: "saved", ruleId: out.rule.id, runId: out.run.id };
  }

  const SECTIONS: { id: Section; label: string }[] = [
    { id: "rules", label: SECTION_RULES },
    { id: "results", label: SECTION_RESULTS },
  ];
  const stepDef = stepOpen !== null ? STEPS[stepOpen] : null;
  const leftAfter = (n: number): number | null => (counts && stepsFilledUpTo(rules, n) ? counts[n] : null);
  const removedBy = (n: number): number | null => {
    if (!counts || universe === null || !stepsFilledUpTo(rules, n)) return null;
    const before = n === 0 ? universe : counts[n - 1];
    return Math.max(0, before - counts[n]);
  };
  const capNote = !user ? (
    <>
      The full list is included with a free account. <Link href={signupHref("/shortlist-lab")} className="font-medium text-accent hover:underline">Sign up free</Link>
    </>
  ) : undefined;
  const nameLimit = !user ? NAMES_PAGE : undefined;

  /** The names card for an edited or new rule: after one step, or after every step, with Create report under it. */
  const namesCard = (upTo: number, title: string, withReport: boolean) => (
    <div className="space-y-2" data-testid="live-names">
      <StockNames title={title} loadKey={loadKey(upTo)} loader={liveLoader(upTo)} testId="live-names-card" maxItems={nameLimit} maxNote={capNote} asOf={figuresDate} />
      {withReport && user && sheet !== "live" && (
        <button type="button" onClick={() => { if (requireName()) setSheet("live"); }} className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground" data-testid="create-report">{CREATE_REPORT}</button>
      )}
      {withReport && !user && (
        <p className="text-sm text-foreground-muted" data-testid="create-report-loggedout">
          Log in to create a report. <Link href={signupHref("/shortlist-lab")} className="font-medium text-accent hover:underline">Sign up free</Link> or <Link href="/login" className="font-medium text-accent hover:underline">log in</Link>.
        </p>
      )}
      {withReport && sheet === "live" && (
        <ReportSheet
          ruleName={active?.name ?? ""}
          forResult={null}
          ensure={ensure}
          needsName={!active}
          name={name}
          onNameMissing={() => void requireName()}
          asOf={figuresDate}
          loader={liveLoader(6)}
          loadKey={loadKey(6)}
          total={left}
          onClose={() => setSheet(null)}
          onDone={() => setResultsKey((k) => k + 1)}
          onStarted={(ref) => goReports(ref.ruleId)}
        />
      )}
    </div>
  );

  /** The bottom block of the rule page. */
  function bottom() {
    return (
      <RuleBottomBlock
        {...savedState}
        rules={rules}
        sort={{ value: "name", order: "asc" }}
        left={left}
        active={active}
        setActive={setActive}
        resultLabel={SHOW_BUTTON}
        onResult={onResult}
        busy={false}
        noFilter={noFilter ? NO_FILTER_LINE : null}
        onDeleted={() => {
          setPage("list");
          setStepOpen(null);
          setRules(EMPTY_RULES);
          setNames(null);
          setResultsKey((k) => k + 1);
          setRulesKey((k) => k + 1);
        }}
        earlierLine={active && latest ? EARLIER_VALUES_LINE : null}
        name={name}
        onNameMissing={() => void requireName()}
      />
    );
  }

  const ruleOpen = active ? savedState.saved.find((x) => x.id === active.id) ?? null : null;
  const summaryLine = active ? (latest ? READONLY_LINE(active.name, latest.count, fmtDate(latest.run_date) ?? latest.run_date) : latest === null ? `${active.name} · ${NO_SAVED_RESULT}` : active.name) : "";

  return (
    <div className="space-y-4" data-testid="ladder" ref={topRef}>
      <div role="tablist" aria-label="My rules" className="flex gap-1 rounded-xl border border-border bg-surface p-1" data-testid="rules-sections">
        {SECTIONS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={section === t.id}
            onClick={() => goSection(t.id)}
            data-testid={`rules-sec-${t.id}`}
            className={`min-h-[44px] flex-1 rounded-lg px-2 text-sm font-semibold ${section === t.id ? "bg-accent text-accent-foreground" : "text-foreground-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === "rules" && page === "list" && (
        <div data-testid="section-rules">
          <RulesListPage {...savedState} active={active} onOpen={openRule} onCreate={createRule} />
        </div>
      )}

      {section === "rules" && page === "edit" && readOnly && active && (
        <div className="space-y-3" data-testid="section-readonly">
          <button type="button" onClick={backToList} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium hover:border-accent" data-testid="back-to-rules">{BACK_BUTTON}</button>
          <p className="break-words text-base font-semibold" data-testid="open-rule-line">{summaryLine}</p>
          {latest && (latest.as_of || latest.run_date) && <p className="text-xs text-foreground-muted" data-testid="open-rule-asof">{FIGURES_AS_OF(fmtDate(latest.as_of) ?? fmtDate(latest.run_date) ?? "")}</p>}
          {latest && <CompareBlock ruleId={active.id} run={latest} />}
          <RulesApplied rules={rules} />
          <DailyNote testId="readonly-daily-line" />
          <div className="flex flex-wrap gap-2" data-testid="readonly-buttons">
            <button type="button" onClick={() => { setEditing(true); setReadOpen(false); setSheet(null); }} className="min-h-[44px] rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10" data-testid="edit-rule">{EDIT_RULE}</button>
            <button type="button" onClick={() => void openRead()} className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground" data-testid="rule-result-button">{VIEW_STOCKS}</button>
          </div>
          {readOpen && latest === null && <p className="text-sm text-foreground-muted" role="status" data-testid="read-none">{NO_SAVED_RESULT}. Press {EDIT_RULE}, then {SHOW_BUTTON}, to see the stocks that meet this rule today.</p>}
          {readOpen && latest && (
            <div className="space-y-2" data-testid="read-card">
              {latestStocks === null ? (
                <p className="text-sm text-foreground-muted">Loading…</p>
              ) : (
                <StockNames title={`${stocksText(latest.count)} · ${fmtDate(latest.run_date) ?? latest.run_date}`} loadKey={latest.id} loader={staticLoader(latestStocks)} testId="read-names" asOf={fmtDate(latest.as_of) ?? fmtDate(latest.run_date)} />
              )}
              <div className="flex flex-wrap items-center gap-3">
                {user && sheet !== "saved" && <button type="button" onClick={() => setSheet("saved")} className="min-h-[44px] rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10" data-testid="create-report">{CREATE_REPORT}</button>}
                <button type="button" onClick={() => goReports(active.id)} className="min-h-[44px] text-sm font-medium text-accent underline" data-testid="see-in-results">{SEE_IN_RESULTS}</button>
              </div>
              {sheet === "saved" && latestStocks && (
                <ReportSheet
                  ruleName={active.name}
                  forResult={{ ruleId: active.id, runId: latest.id }}
                  ensure={async () => ({ kind: "saved", ruleId: active.id, runId: latest.id })}
                  needsName={false}
                  existing={(latest.answers ?? 0) > 0}
                  asOf={fmtDate(latest.as_of) ?? fmtDate(latest.run_date)}
                  loader={staticLoader(latestStocks)}
                  loadKey={latest.id}
                  total={latestStocks.length}
                  onClose={() => setSheet(null)}
                  onDone={() => setResultsKey((k) => k + 1)}
                  onStarted={(ref) => goReports(ref.ruleId)}
                />
              )}
            </div>
          )}
          {user && ruleOpen && (
            <section className="space-y-2 border-t border-border pt-3" aria-labelledby="rule-reports-heading" data-testid="rule-reports-section">
              <h3 id="rule-reports-heading" className="text-base font-semibold">{RULE_REPORTS_TITLE}</h3>
              <RuleReports rule={ruleOpen} refreshKey={resultsKey} onChanged={() => setResultsKey((k) => k + 1)} />
            </section>
          )}
        </div>
      )}

      {section === "rules" && page === "edit" && !readOnly && (
        <div className="space-y-3" data-testid="section-create">
          <button type="button" onClick={backToList} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium hover:border-accent" data-testid="back-to-rules">{BACK_BUTTON}</button>
          {user && <NameBox name={name} setName={(v) => { setName(v); setNameMsg(null); }} message={nameMsg} inputRef={nameRef} />}
          {filled && (
            <div className="space-y-1 rounded-xl border border-border bg-surface-raised px-3 py-2" data-testid="ladder-bar" aria-live="polite">
              <p className="text-sm font-medium" data-testid="ladder-left">
                {left === null ? (dataError ? "Counts are not available right now" : "Loading the counts…") : ABOUT_MATCH(left)}
              </p>
              {left === 0 && noMatchStep !== null && (
                <p className="text-sm" data-testid="ladder-nomatch">
                  {NO_MATCH_LINE(noMatchStep + 1)}{" "}
                  <button type="button" onClick={() => { setStepOpen(noMatchStep); scrollTop(); }} className="font-medium text-accent underline" data-testid="ladder-nomatch-open">{NO_MATCH_OPEN(noMatchStep + 1)}</button>
                </p>
              )}
              {split && split.hasDaily && left !== null && <p className="text-xs text-foreground-muted" data-testid="ladder-split">{STEADY_LINE(split.steady, split.all)}</p>}
              {left !== null && figuresDate && <p className="text-xs text-foreground-muted" data-testid="ladder-figures-asof">{FIGURES_AS_OF(figuresDate)}</p>}
              {left !== null && <p className="text-xs text-foreground-muted" data-testid="ladder-counts-note">{COUNTS_NOTE}</p>}
            </div>
          )}
          <DailyNote />
          {notice && <p className="text-sm text-foreground-muted" role="status" data-testid="ladder-notice">{notice}</p>}
          <FillRow
            onFill={() => { const t = typicalRules(); setRules(t); setFillLine(FILL_COUNT(rulesSetCount(t))); setNotice(null); setNoFilter(false); setNames(null); }}
            onClear={() => { setRules(EMPTY_RULES); setFillLine(null); setNotice(null); setNoFilter(false); setNames(null); }}
            filledLine={fillLine}
          />
          <p className="text-sm font-medium" data-testid="ladder-blank-line">{BLANK_LINE}</p>
          <p className="text-xs text-foreground-muted" data-testid="ladder-past">{PAST_LINE}</p>

          {stepDef === null ? (
            <>
              <ol className="space-y-2" aria-label={STEPS_TITLE} data-testid="step-list">
                {STEPS.map((s) => {
                  const n = stepSetCount(rules, s.n);
                  const l = leftAfter(s.n);
                  return (
                    <li key={s.n}>
                      <button type="button" onClick={() => { setStepOpen(s.n); scrollTop(); }} className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2 text-left hover:border-accent" data-testid={`ladder-step-${s.n}`}>
                        <span className="text-sm font-semibold" data-testid="ladder-step-name">{s.n + 1}. {s.title}</span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-foreground-muted">
                          <span data-testid={`ladder-set-${s.n}`} data-set={n} data-left={l === null ? "" : l}>{stepRowText(n, l)}</span>
                          <ChevronRight size={14} aria-hidden />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {bottom()}
              {names?.kind === "all" && namesCard(6, NAMES_TITLE_LIVE, true)}
            </>
          ) : (
            <>
              <section className="space-y-3 rounded-xl border border-border bg-surface p-4" aria-labelledby="step-page-title" data-testid={`step-page-${stepDef.n}`}>
                <button type="button" onClick={() => { setStepOpen(null); scrollTop(); }} className="min-h-[44px] text-sm font-medium text-accent hover:underline" data-testid="step-back">{BACK_TO_STEPS}</button>
                <h3 id="step-page-title" className="text-base font-semibold">Step {stepDef.n + 1} of {STEPS.length}. {stepDef.title}</h3>
                <p className="text-xs text-foreground-muted" data-testid="ladder-step-line">{stepDef.line}</p>
                <div data-testid={`step-body-${stepDef.n}`}>
                  <StepBody step={stepDef.n} rules={rules} set={set} data={data} />
                </div>
                {leftAfter(stepDef.n) !== null && removedBy(stepDef.n) !== null && (
                  <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm" data-testid="step-after">
                    <p className="font-medium" data-testid="step-after-line">{AFTER_STEP(leftAfter(stepDef.n) as number, removedBy(stepDef.n) as number)}</p>
                    <p className="text-xs text-foreground-muted" data-testid="step-after-note">{REMOVED_DEPENDS}</p>
                    <button type="button" onClick={() => { if (names?.kind === "step" && names.n === stepDef.n) setNames(null); else if (requireName()) setNames({ kind: "step", n: stepDef.n }); }} aria-expanded={names?.kind === "step" && names.n === stepDef.n} className="mt-2 min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium hover:border-accent" data-testid="step-view-stocks">{VIEW_STOCKS}</button>
                  </div>
                )}
                {names?.kind === "step" && names.n === stepDef.n && namesCard(stepDef.n, NAMES_TITLE_AFTER(stepDef.n + 1), false)}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <button type="button" onClick={() => { setStepOpen(null); scrollTop(); }} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium hover:border-accent">{BACK_TO_STEPS}</button>
                  {stepDef.n < STEPS.length - 1 && (
                    <button type="button" onClick={() => { setStepOpen(stepDef.n + 1); setNames(null); scrollTop(); }} className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground" data-testid="step-next">{NEXT_STEP(stepDef.n + 2)}</button>
                  )}
                </div>
              </section>
              {stepDef.n === STEPS.length - 1 && bottom()}
              {stepDef.n === STEPS.length - 1 && names?.kind === "all" && namesCard(6, NAMES_TITLE_LIVE, true)}
            </>
          )}
          {changed && active && <p className="text-xs text-foreground-muted" data-testid="rule-changed-note">You changed this rule. Press Save to keep the change.</p>}
        </div>
      )}

      {section === "results" && (
        <div className="space-y-4" data-testid="section-results">
          {user ? (
            <ResultsTab rules={savedState.saved} refreshKey={resultsKey} onChanged={() => setResultsKey((k) => k + 1)} openRuleId={resultsRuleId} setOpenRuleId={setResultsRuleId} />
          ) : (
            <p className="text-sm text-foreground-muted" data-testid="results-loggedout">
              {RESULTS_LOGGED_OUT}{" "}
              <Link href={signupHref("/shortlist-lab")} className="font-medium text-accent hover:underline">Sign up free</Link> or <Link href="/login" className="font-medium text-accent hover:underline">log in</Link>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Whether any rule is set in steps 0 up to this one (the counts for a step show only then). */
function stepsFilledUpTo(r: Rules, step: number): boolean {
  for (let s = 0; s <= step; s += 1) if (stepSetCount(r, s) > 0) return true;
  return false;
}
