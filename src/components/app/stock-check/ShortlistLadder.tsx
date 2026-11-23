"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getLadderData, getSignals } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { addToWatchlist, saveRuleRun, saveRuleWithResult, type MyScreen, type RuleRunSaved } from "@/lib/api/mutations";
import type { SignalRow } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { signupHref } from "@/lib/nav-items";
import { stockPath } from "@/lib/seo/stock-symbol";
import {
  ABOUT_MATCH, BACK_TO_STEPS, BANK_NOTE, BANK_WHY, BANK_WHY_LABEL, BLANK_LINE, DEBT_NOTE, DEBT_WHY, EXAMPLES, NEXT_STEP, NO_FILTER_LINE, SECTION_CREATE, SECTION_RESULTS, SECTION_SAVED,
  exampleLine, ruleProblem, COUNTS_NOTE, EMPTY_RULES, LIST_PAGE_SIZE, NO_GROWTH_LINE, NO_ROCE_LINE, NUMBERS_AS_OF, PAST_LINE, PV_FILTERS, PV_FOLD, RESULTS_TITLE, RULES, SHOW_BUTTON,
  SORT_CHOICES, STEPS, STEPS_TITLE, VOL_LABEL, VOL_LINE, VOL_OPTIONS, volNumLabel, stepSetCount, stepSetText,
  cardValues, chgOn, countsByStep, fromParams, growthGap, hasAnyRule, needsPledge, num, roceGap, toParams, typicalRules, validLadderData, volOn,
  type LadderData, type RuleDef, type Rules,
} from "@/lib/stock-check";
import { ASK_GROUP_MAX, toggleSelected } from "@/lib/ask-group";
import { useAskPanel, type LabLink } from "@/lib/ask-panel/AskPanelContext";
import {
  SAVED_RESULT_ONLY, SAVED_RULE_AND_RESULT, SAVE_RESULT_BUTTON, SAVE_RESULT_CANCEL, SAVE_RESULT_CONFIRM, SAVE_RESULT_NAME_HELP, SAVE_RESULT_NAME_LABEL, SAVE_RESULT_NEED_NAME,
  SAVE_RESULT_NEED_RULE, SHOWING_RULE, fmtDay, type ActiveRule,
} from "@/lib/my-rules";
import { DIFF_NOTE, DROP_CANCEL, DROP_CONFIRM, DROP_WARNING, SAME_DAY_NOTE, SAVED_NOTE } from "@/lib/saved-results";
import { ReportDownload, ResultsByRule, StockPdfButton } from "@/components/app/stock-check/SavedResults";
import { AskAboutStocks } from "@/components/app/stock-check/AskAboutStocks";
import { RulesToolbar, SavedRulesList, useSavedRules } from "@/components/app/stock-check/MyRulesParts";
import { RulesApplied } from "@/components/app/stock-check/RulesApplied";

const field = "h-10 w-28 rounded-lg border border-border bg-surface px-2 text-sm tabular-nums placeholder:text-foreground-faint";
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
          <span className="text-xs text-foreground-muted">times the usual</span>
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

type Section = "create" | "saved" | "results";
/** The result Ask AI answers, reports and the ticked stocks belong to: a saved rule and one of its saved results. */
interface Focus {
  ruleId: string;
  ruleName: string;
  runId: string;
}

/** "Build Your Shortlist" (My rules tab): three pages, Create rule, Saved rules and Results. One slim bar on top holds the one Show button. */
export function ShortlistLadder() {
  const { user, getToken } = useAuth();
  const { setLabLink } = useAskPanel();
  const [data, setData] = useState<LadderData | null>(null);
  const [dataError, setDataError] = useState(false);
  const [rules, setRules] = useState<Rules>(EMPTY_RULES);
  const [section, setSection] = useState<Section>("create");
  const [stepOpen, setStepOpen] = useState<number | null>(null);
  const [sort, setSort] = useState(SORT_CHOICES[0].value);
  const [noFilter, setNoFilter] = useState(false);

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
  const [selected, setSelected] = useState<string[]>([]);
  const [capNote, setCapNote] = useState(false);
  // saved results (runs) of the open rule
  const [runNote, setRunNote] = useState<string | null>(null);
  const [dropAsk, setDropAsk] = useState<{ ruleId: string; drops: string; limit: number; params: Record<string, unknown> } | null>(null);
  // "Save this result" on the results of any run, also for a rule that is not saved yet (it asks for a name)
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [rulesKey, setRulesKey] = useState(0);
  const [resultsKey, setResultsKey] = useState(0);
  const [focus, setFocus] = useState<Focus | null>(null);
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

  const applied = rules;
  const filled = hasAnyRule(rules);
  const counts = useMemo(() => (data ? countsByStep(data, applied) : null), [data, applied]);
  const left = counts ? counts[6] : null;
  const set = (patch: Partial<Rules>) => {
    setRules((r) => ({ ...r, ...patch }));
    setNotice(null);
    setNoFilter(false);
  };
  const choice = SORT_CHOICES.find((s) => s.value === sort) ?? SORT_CHOICES[0];
  const scrollTop = () => topRef.current?.scrollIntoView({ block: "start" });
  const goSection = (s: Section) => {
    setSection(s);
    setStepOpen(null);
    scrollTop();
  };
  const focusOf = (ruleId: string, ruleName: string, runId: string | null) => setFocus(runId ? { ruleId, ruleName, runId } : null);

  /** Save the result of this run with the open saved rule (the server runs the rule again and stores the stocks, the figures date and these values). */
  async function saveRun(ruleId: string, ruleName: string, params: Record<string, unknown>, confirmDrop = false, say?: string) {
    try {
      const token = await getToken();
      if (!token) return;
      const out: RuleRunSaved = await saveRuleRun(token, ruleId, params, confirmDrop);
      if (out.needs_confirm) {
        setDropAsk({ ruleId, drops: fmtDate(out.drops?.run_date) ?? out.drops?.run_date ?? "", limit: out.limit, params });
        return;
      }
      setDropAsk(null);
      if (out.run) focusOf(ruleId, ruleName, out.run.id);
      setResultsKey((k) => k + 1);
      const bits = [SAVED_NOTE(out.run?.count ?? 0)];
      if (out.replaced_same_day) bits.push(SAME_DAY_NOTE);
      if (out.diff) bits.push(DIFF_NOTE(fmtDate(out.diff.since) ?? out.diff.since, out.diff.added.length, out.diff.dropped.length));
      setRunNote(bits.join(" "));
      if (say) setSaveMsg(say);
    } catch {
      setRunNote("This result could not be saved with the rule right now. The list above is not affected.");
    }
  }

  async function load(nextPage: number, useRules: Rules = applied, fromName: string | null = shownFrom, save?: { ruleId: string; ruleName: string; params: Record<string, unknown> }, sortChoice = choice) {
    setState("loading");
    try {
      const token = user ? await getToken() : null;
      const env = await getSignals(
        { ...toParams(useRules), sort: sortChoice.value, order: sortChoice.order, page: nextPage, size: LIST_PAGE_SIZE, ...(needsPledge(useRules) ? { fields: "pledge_pct" } : {}) },
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
      if (save && nextPage === 1) void saveRun(save.ruleId, save.ruleName, save.params);
    } catch {
      if (nextPage > 1) setLimited(true);
      setState(nextPage > 1 ? "ok" : "error");
    }
  }
  /** The one Show button: with nothing filled it lists nothing and says so; otherwise it opens the Results page with the stocks. */
  function show(useRules: Rules = applied, fromName: string | null = active ? active.name : null, save?: { ruleId: string; ruleName: string; params: Record<string, unknown> }) {
    if (!hasAnyRule(useRules)) {
      setNoFilter(true);
      return;
    }
    setNoFilter(false);
    setRows([]);
    setTotal(null);
    setLimited(false);
    setRunNote(null);
    setDropAsk(null);
    setSelected([]);
    setSaveMsg(null);
    setSaveOpen(false);
    setSection("results");
    // Show stocks on an open saved rule also saves the result (the values on screen)
    const toSave = save ?? (user && active ? { ruleId: active.id, ruleName: active.name, params: toParams(rules) as Record<string, unknown> } : undefined);
    void load(1, useRules, fromName, toSave);
    window.setTimeout(scrollTop, 0);
  }

  /** Open: the saved rule is put into the Create rule page, ready to change. */
  function openRule(s: MyScreen) {
    const r = fromParams(s.params);
    setRules(r);
    setActive({ id: s.id, name: s.name, base: r });
    setFocus(null);
    setNoFilter(false);
    setNotice(`Opened "${s.name}". Change any field, or press the button above to show its stocks.`);
    setSection("create");
    setStepOpen(null);
    window.setTimeout(scrollTop, 0);
  }
  /** Run again: open the rule and show its stocks now; the result is saved with the rule and compared with the one before. */
  function runAgain(s: MyScreen) {
    const r = fromParams(s.params);
    setRules(r);
    setActive({ id: s.id, name: s.name, base: r });
    setFocus(null);
    setNotice(null);
    show(r, s.name, { ruleId: s.id, ruleName: s.name, params: toParams(r) as Record<string, unknown> });
  }

  /** "Save this result": with a saved rule open, the result is saved with it now; with no saved rule, the person gives a name and the rule and the result are saved together. */
  async function saveThisResult() {
    setSaveMsg(null);
    if (active) {
      await saveRun(active.id, active.name, toParams(shownRules) as Record<string, unknown>, false, SAVED_RESULT_ONLY(active.name, total ?? 0));
      return;
    }
    if (!hasAnyRule(shownRules)) return setSaveMsg(SAVE_RESULT_NEED_RULE);
    setSaveOpen(true);
  }
  /** Save the rule and this result together under a name. Used by the Save this result form and by Ask AI's "Save result with answers". */
  async function saveRuleWithName(name: string): Promise<{ ruleId: string; runId: string; count: number; ruleName: string }> {
    const token = await getToken();
    if (!token) throw new Error("login");
    const out = await saveRuleWithResult(token, name, { ...toParams(shownRules), sort: choice.value, order: choice.order } as Record<string, unknown>);
    setActive({ id: out.rule.id, name: out.rule.name, base: shownRules });
    focusOf(out.rule.id, out.rule.name, out.run.id);
    setResultsKey((k) => k + 1);
    setRulesKey((k) => k + 1);
    return { ruleId: out.rule.id, runId: out.run.id, count: out.run.count, ruleName: out.rule.name };
  }
  async function saveRuleAndResult() {
    const name = saveName.trim();
    if (!name) return setSaveMsg(SAVE_RESULT_NEED_NAME);
    setSaveBusy(true);
    setSaveMsg(null);
    try {
      const out = await saveRuleWithName(name);
      setSaveOpen(false);
      setSaveName("");
      setSaveMsg(SAVED_RULE_AND_RESULT(out.ruleName, out.count));
    } catch (e) {
      setSaveMsg(e instanceof ApiError && e.message ? e.message : "The rule and its result could not be saved right now. Nothing was saved. Please try again in a moment.");
    } finally {
      setSaveBusy(false);
    }
  }

  // What Ask AI may do with several stocks ticked here: attach the answers to this rule's latest saved result, or save the result first.
  const linkRef = useRef<LabLink | null>(null);
  useEffect(() => {
    linkRef.current = {
      ruleId: active?.id ?? null,
      ruleName: active?.name ?? null,
      hasResult: !!(active && focus && focus.ruleId === active.id),
      saveResult: async (name?: string) => {
        if (active) {
          const token = await getToken();
          if (!token) throw new Error("login");
          const out = await saveRuleRun(token, active.id, toParams(shownRules) as Record<string, unknown>, false);
          if (out.needs_confirm || !out.run) throw new Error(`Your plan keeps ${out.limit} saved results for each rule. Save this result from the Results page to confirm removing the oldest.`);
          focusOf(active.id, active.name, out.run.id);
          setResultsKey((k) => k + 1);
          return { ruleId: active.id, runId: out.run.id };
        }
        if (!name?.trim()) throw new Error(SAVE_RESULT_NEED_NAME);
        const out = await saveRuleWithName(name.trim());
        return { ruleId: out.ruleId, runId: out.runId };
      },
    };
  });
  useEffect(() => {
    setLabLink(() => linkRef.current);
    return () => setLabLink(null);
  }, [setLabLink]);

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
  const SECTIONS: { id: Section; label: string }[] = [
    { id: "create", label: SECTION_CREATE },
    { id: "saved", label: SECTION_SAVED },
    { id: "results", label: SECTION_RESULTS },
  ];
  const stepDef = stepOpen !== null ? STEPS[stepOpen] : null;

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

      <div className="sticky top-[var(--tabs-h)] z-20 -mx-1 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-surface-raised px-3 py-2 shadow-sm md:top-[calc(var(--header-height,0px)+var(--tabs-h))]" data-testid="ladder-bar" aria-live="polite">
        <button
          type="button"
          onClick={() => show()}
          disabled={busy}
          className="min-h-[44px] w-full rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-60 sm:w-auto"
          data-testid="ladder-bar-show"
        >
          {busy && page === 0 ? "Loading…" : SHOW_BUTTON}
        </button>
        {filled && (
          <p className="text-sm font-medium" data-testid="ladder-left">
            {left === null ? (dataError ? "Counts are not available right now" : "Loading the counts…") : ABOUT_MATCH(left)}
          </p>
        )}
        {filled && left !== null && <p className="basis-full text-xs text-foreground-muted" data-testid="ladder-counts-note">{COUNTS_NOTE}</p>}
        {noFilter && <p className="basis-full text-sm" role="status" data-testid="ladder-nofilter">{NO_FILTER_LINE}</p>}
      </div>

      {section === "create" && (
        <div className="space-y-3" data-testid="section-create">
          {notice && <p className="text-sm text-foreground-muted" role="status" data-testid="ladder-notice">{notice}</p>}
          <RulesToolbar
            {...savedState}
            rules={rules}
            sort={{ value: choice.value, order: choice.order }}
            left={left}
            active={active}
            setActive={setActive}
            onFill={() => { setRules(typicalRules()); setNotice(null); setNoFilter(false); }}
            onClear={() => { setRules(EMPTY_RULES); setNotice(null); setNoFilter(false); }}
          />
          <p className="text-sm font-medium" data-testid="ladder-blank-line">{BLANK_LINE}</p>
          <p className="text-xs text-foreground-muted" data-testid="ladder-past">{PAST_LINE}</p>

          {stepDef === null ? (
            <ol className="space-y-2" aria-label={STEPS_TITLE} data-testid="step-list">
              {STEPS.map((s) => {
                const n = stepSetCount(rules, s.n);
                return (
                  <li key={s.n}>
                    <button type="button" onClick={() => { setStepOpen(s.n); scrollTop(); }} className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2 text-left hover:border-accent" data-testid={`ladder-step-${s.n}`}>
                      <span className="text-sm font-semibold" data-testid="ladder-step-name">{s.n + 1}. {s.title}</span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-foreground-muted">
                        <span data-testid={`ladder-set-${s.n}`} data-set={n}>{stepSetText(n)}</span>
                        <ChevronRight size={14} aria-hidden />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <section className="space-y-3 rounded-xl border border-border bg-surface p-4" aria-labelledby="step-page-title" data-testid={`step-page-${stepDef.n}`}>
              <button type="button" onClick={() => { setStepOpen(null); scrollTop(); }} className="min-h-[44px] text-sm font-medium text-accent hover:underline" data-testid="step-back">{BACK_TO_STEPS}</button>
              <h3 id="step-page-title" className="text-base font-semibold">Step {stepDef.n + 1} of {STEPS.length}. {stepDef.title}</h3>
              <p className="text-xs text-foreground-muted" data-testid="ladder-step-line">{stepDef.line}</p>
              <div data-testid={`step-body-${stepDef.n}`}>
                <StepBody step={stepDef.n} rules={rules} set={set} data={data} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <button type="button" onClick={() => { setStepOpen(null); scrollTop(); }} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium hover:border-accent">{BACK_TO_STEPS}</button>
                {stepDef.n < STEPS.length - 1 && (
                  <button type="button" onClick={() => { setStepOpen(stepDef.n + 1); scrollTop(); }} className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground" data-testid="step-next">{NEXT_STEP(stepDef.n + 2)}</button>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {section === "saved" && (
        <div data-testid="section-saved">
          <SavedRulesList {...savedState} rules={rules} active={active} setActive={setActive} onOpen={openRule} onRunAgain={runAgain} />
        </div>
      )}

      {section === "results" && (
        <div className="space-y-4" data-testid="section-results">
          <section id="ladder-results-section" aria-labelledby="ladder-results" className="space-y-3" data-testid="ladder-results">
            <h3 id="ladder-results" className="scroll-mt-40 text-lg font-semibold">{RESULTS_TITLE}</h3>
            {state === "idle" && <p className="text-sm text-foreground-muted" data-testid="results-idle">Press the button above to list the stocks that match your rule today.</p>}
            {state === "error" && <p className="text-sm text-foreground-muted">The list could not be loaded right now. Please try again in a moment.</p>}
            {(state === "ok" || (busy && rows.length > 0)) && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="ladder-sort" className="text-sm font-medium">Sort by</label>
                  <select
                    id="ladder-sort"
                    value={sort}
                    onChange={(e) => {
                      const c = SORT_CHOICES.find((x) => x.value === e.target.value) ?? SORT_CHOICES[0];
                      setSort(c.value);
                      setRows([]);
                      setLimited(false);
                      void load(1, shownRules, shownFrom, undefined, c);
                    }}
                    className="h-10 rounded-lg border border-border bg-surface px-2 text-sm"
                    data-testid="ladder-sort"
                  >
                    {SORT_CHOICES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  {data && <p className="text-xs text-foreground-muted" data-testid="ladder-asof">{asOf ? NUMBERS_AS_OF(asOf) : "Numbers as of the latest update"}</p>}
                </div>
                {shownFrom && <p className="text-base font-semibold" data-testid="showing-rule">{SHOWING_RULE(shownFrom)}</p>}
                <RulesApplied rules={shownRules} />
                {runNote && <p className="text-sm text-foreground-muted" role="status" data-testid="run-saved-note">{runNote}</p>}
                {dropAsk && (
                  <div className="rounded-lg border border-accent bg-surface-raised p-3 text-sm" role="group" aria-label="Remove the oldest result?" data-testid="run-drop-ask">
                    <p>{DROP_WARNING(dropAsk.limit, dropAsk.drops)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void saveRun(dropAsk.ruleId, active?.name ?? "", dropAsk.params, true)} className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground" data-testid="run-drop-confirm">{DROP_CONFIRM}</button>
                      <button type="button" onClick={() => setDropAsk(null)} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium" data-testid="run-drop-cancel">{DROP_CANCEL}</button>
                    </div>
                  </div>
                )}
                <p className="text-sm font-medium" data-testid="ladder-total">
                  {total !== null ? `${total.toLocaleString("en-IN")} ${total === 1 ? "stock matches" : "stocks match"} your rule today.` : ""}
                  {sort !== "name" ? ` Sorted by ${SORT_CHOICES.find((c) => c.value === sort)?.label.toLowerCase()}, as you chose.` : ""}
                </p>
                {user && state === "ok" && !busy && (
                  <div className="space-y-2 rounded-lg border border-border bg-surface p-3" data-testid="save-result-block">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => void saveThisResult()} disabled={saveBusy} className="min-h-[44px] rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-60" data-testid="save-result-button">{SAVE_RESULT_BUTTON}</button>
                      {focus && <ReportDownload ruleId={focus.ruleId} runId={focus.runId} selected={selected} />}
                    </div>
                    {saveOpen && (
                      <div className="space-y-2" data-testid="save-result-form">
                        <label htmlFor="save-result-name" className="block text-sm font-medium">{SAVE_RESULT_NAME_LABEL}</label>
                        <p className="text-xs text-foreground-muted">{SAVE_RESULT_NAME_HELP}</p>
                        <input id="save-result-name" value={saveName} onChange={(e) => setSaveName(e.target.value)} maxLength={60} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm sm:max-w-sm" data-testid="save-result-name" />
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => void saveRuleAndResult()} disabled={saveBusy} className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-60" data-testid="save-result-confirm">{saveBusy ? "Saving…" : SAVE_RESULT_CONFIRM}</button>
                          <button type="button" onClick={() => { setSaveOpen(false); setSaveMsg(null); }} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium" data-testid="save-result-cancel">{SAVE_RESULT_CANCEL}</button>
                        </div>
                      </div>
                    )}
                    {saveMsg && <p className="text-sm" role="status" data-testid="save-result-msg">{saveMsg}</p>}
                  </div>
                )}
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
                        {focus && <StockPdfButton ruleId={focus.ruleId} runId={focus.runId} symbol={r.symbol} />}
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

          {user && (
            <ResultsByRule
              rules={savedState.saved}
              activeId={active?.id ?? null}
              refreshKey={resultsKey}
              selected={selected}
              onTick={tick}
              focus={focus}
              onFocus={focusOf}
            />
          )}

          <AskAboutStocks
            selected={selected}
            onRemove={(s) => { setSelected((l) => l.filter((x) => x !== s)); setCapNote(false); }}
            onClear={() => { setSelected([]); setCapNote(false); }}
            ruleId={focus?.ruleId ?? null}
            runId={focus?.runId ?? null}
          />
        </div>
      )}
    </div>
  );
}
