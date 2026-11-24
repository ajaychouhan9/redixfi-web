"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { createMyScreen, deleteMyScreen, listMyScreens, listRuleRuns, replaceMyScreen, type MyScreen, type MyScreenSaveExtras, type RuleRun } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import { signupHref } from "@/lib/nav-items";
import {
  DELETE_BUTTON, LIMIT_REACHED, LOGGED_OUT_LINE, PLAN_LINE, REPLACE_OLD, REPLACE_QUESTION,
  RULES_SET_LINE, SAVE_AS_NEW_RULE, SAVE_BUTTON, copyName, saveAction, savedLine,
  type ActiveRule,
} from "@/lib/my-rules";
import { DELETE_RULE_CONFIRM, DELETE_RULE_KEEP, DELETE_RULE_WARN } from "@/lib/saved-results";
import { NAME_LABEL } from "@/lib/report-flow";
import { CLEAR_ALL, CREATE_NEW_RULE, FILL_BLANK_NOTE, FILL_BUTTON, FILL_NOTE, RULES_LIST_NONE, fromParams, hasAnyRule, rulesSetCount, sameRules, toParams, type Rules } from "@/lib/stock-check";
import { DialogDownloads } from "@/components/app/stock-check/SavedResults";

const btn = "min-h-[44px] rounded-lg border border-border px-3 text-sm font-medium hover:border-accent";

/** The person's saved rules and the plan limit, read again when `reloadKey` changes. */
export function useSavedRules(reloadKey: number) {
  const { user, getToken } = useAuth();
  const [saved, setSaved] = useState<MyScreen[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getToken();
      if (!token) return;
      const r = await listMyScreens(token);
      setSaved(r.screens);
      setLimit(r.limit);
    } catch {
      /* the saved list is a convenience; the page works without it */
    }
  }, [user, getToken]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload, reloadKey]);
  return { saved, limit, reload };
}

interface SavedState {
  saved: MyScreen[];
  limit: number | null;
  reload: () => Promise<void>;
}

/** The rule name box, at the top of the rule page: clearly marked as required, filled in for a new rule ("My rule 24 Nov"), and the plain message when it is blank. */
export function NameBox({ name, setName, message, inputRef }: { name: string; setName: (v: string) => void; message: string | null; inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div className="space-y-1" data-testid="rule-name-box">
      <label htmlFor="save-name" className="block text-sm font-semibold" data-testid="save-name-label">{NAME_LABEL}</label>
      <input
        id="save-name"
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        aria-required="true"
        aria-invalid={message ? "true" : "false"}
        className={`h-11 w-full rounded-lg border bg-surface px-3 text-sm placeholder:text-foreground-faint sm:max-w-sm ${message ? "border-accent" : "border-border"}`}
        data-testid="save-name"
      />
      {message && <p className="text-sm font-medium" role="status" data-testid="save-name-message">{message}</p>}
    </div>
  );
}

/** Fill typical values and Clear all, above the steps, with the one-line note about where the numbers come from and, after Fill, how many fields were filled. */
export function FillRow({ onFill, onClear, filledLine }: { onFill: () => void; onClear: () => void; filledLine?: string | null }) {
  return (
    <div className="space-y-1" data-testid="ladder-fill-row">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <button type="button" onClick={onFill} className="min-h-[44px] rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10" data-testid="ladder-fill">{FILL_BUTTON}</button>
        <button type="button" onClick={onClear} className="min-h-[44px] text-sm text-foreground-muted underline underline-offset-2 hover:text-foreground" data-testid="ladder-clear">{CLEAR_ALL}</button>
      </div>
      <p className="text-xs text-foreground-muted" data-testid="ladder-fill-note">{FILL_NOTE}</p>
      {filledLine && (
        <p className="text-xs text-foreground-muted" role="status" data-testid="ladder-fill-count">
          <span className="font-medium text-foreground">{filledLine}.</span> {FILL_BLANK_NOTE}
        </p>
      )}
    </div>
  );
}

interface BottomProps extends SavedState {
  rules: Rules;
  sort: { value: string; order: "asc" | "desc" };
  left: number | null;
  active: ActiveRule | null;
  setActive: (a: ActiveRule | null) => void;
  /** The one result button: "View stocks" on an opened rule with no edits, otherwise "Show stocks that meet my rule". */
  resultLabel: string;
  onResult: () => void;
  busy: boolean;
  noFilter: string | null;
  /** Called after the open rule was deleted. */
  onDeleted: () => void;
  /** A line said once, above the buttons (the opened rule has saved results made with the earlier values). */
  earlierLine: string | null;
  /** The rule's name (the box is at the top of the page) and what to do when it is blank. */
  name: string;
  onNameMissing: () => void;
}

/** The bottom block of the rule page (after the steps, and at the end of step 7): the rule name box, Save, Delete (saved rules only) and ONE result button. */
export function RuleBottomBlock({ rules, sort, left, saved, limit, reload, active, setActive, resultLabel, onResult, busy, noFilter, onDeleted, earlierLine, name, onNameMissing }: BottomProps) {
  const { user, getToken } = useAuth();
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<{ runs: RuleRun[] } | null>(null);

  // a different rule was opened: the questions and messages start again
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAsking(false);
    setDeleting(null);
    setMsg(null);
  }, [active?.id]);

  const anyRule = hasAnyRule(rules);
  const changed = !!active && !sameRules(rules, active.base);

  async function persist(mode: "new" | "replace", wantedName: string) {
    setMsg(null);
    setAsking(false);
    if (!anyRule) return setMsg("Set at least one rule first.");
    if (!wantedName.trim()) return onNameMissing();
    if (mode === "new" && limit !== null && saved.length >= limit) return setMsg(LIMIT_REACHED(limit));
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Log in to save your rules.");
      const extras: MyScreenSaveExtras = { stock_count: left };
      const params = { ...toParams(rules), sort: sort.value, order: sort.order } as never;
      let out: MyScreen;
      if (mode === "replace" && active) {
        out = await replaceMyScreen(token, active.id, params, { ...extras, name: wantedName.trim() || active.name, keep_snapshot: true });
        setMsg(`Replaced "${out.name}".`);
      } else {
        out = await createMyScreen(token, wantedName.trim(), params, extras);
        setMsg(`Saved "${out.name}".`);
      }
      setActive({ id: out.id, name: out.name, base: rules });
      await reload();
    } catch (e) {
      setMsg(e instanceof ApiError && e.message ? e.message : e instanceof Error && e.message ? e.message : "The rules could not be saved right now.");
    } finally {
      setSaving(false);
    }
  }
  function onSave() {
    setMsg(null);
    if (!name.trim()) return onNameMissing();
    if (!anyRule) return setMsg("Set at least one rule first.");
    const action = saveAction(!!active, changed);
    if (action === "ask") return setAsking(true);
    void persist(action === "replace" ? "replace" : "new", name);
  }
  async function askDelete() {
    setMsg(null);
    if (!active) return;
    let runs: RuleRun[] = [];
    try {
      const token = await getToken();
      if (token) runs = (await listRuleRuns(token, active.id)).runs;
    } catch {
      /* the warning still shows, without the downloads */
    }
    setDeleting({ runs });
  }
  async function doDelete() {
    if (!active) return;
    try {
      const token = await getToken();
      if (!token) return;
      await deleteMyScreen(token, active.id);
      setDeleting(null);
      setActive(null);
      await reload();
      onDeleted();
    } catch {
      setMsg("That rule could not be removed right now.");
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-3" data-testid="my-rules" aria-label="Name, save and show">
      {earlierLine && <p className="text-sm text-foreground-muted" data-testid="earlier-values-line">{earlierLine}</p>}
      {user && (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onSave} disabled={saving} className="min-h-[44px] rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-60" data-testid="save-rules-button">{SAVE_BUTTON}</button>
            {active && <button type="button" onClick={() => void askDelete()} className={`${btn} text-foreground-muted`} data-testid="rule-delete">{DELETE_BUTTON}</button>}
          </div>
        </>
      )}
      {!user && (
        <p className="text-sm text-foreground-muted" data-testid="my-rules-loggedout">
          {LOGGED_OUT_LINE}{" "}
          <Link href={signupHref("/shortlist-lab")} className="font-medium text-accent hover:underline">Sign up free</Link> or <Link href="/login" className="font-medium text-accent hover:underline">log in</Link>.
        </p>
      )}
      {asking && active && (
        <div className="rounded-lg border border-accent bg-surface-raised p-3 text-sm" role="group" aria-label="Replace or save as new" data-testid="replace-ask">
          <p>{REPLACE_QUESTION(active.name)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => void persist("replace", name)} className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground" data-testid="replace-old">{REPLACE_OLD}</button>
            <button type="button" onClick={() => void persist("new", copyName(name, active.name))} className={btn} data-testid="replace-new">{SAVE_AS_NEW_RULE}</button>
            <button type="button" onClick={() => setAsking(false)} className={`${btn} text-foreground-muted`}>Cancel</button>
          </div>
        </div>
      )}
      {deleting && active && (
        <div className="rounded-lg border border-accent bg-surface-raised p-3 text-sm" role="group" aria-label="Delete this rule" data-testid="rule-delete-ask">
          <p data-testid="rule-delete-warn">{DELETE_RULE_WARN(deleting.runs.length)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {deleting.runs.length > 0 && <DialogDownloads ruleId={active.id} runId={deleting.runs[0].id} />}
            <button type="button" onClick={() => void doDelete()} className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground" data-testid="rule-delete-confirm">{DELETE_RULE_CONFIRM}</button>
            <button type="button" onClick={() => setDeleting(null)} className={btn} data-testid="rule-delete-keep">{DELETE_RULE_KEEP}</button>
          </div>
          {deleting.runs.length > 1 && <p className="mt-2 text-xs text-foreground-muted">The downloads above are for the newest result. Download the others from the Results page first.</p>}
        </div>
      )}
      {msg && <p className="text-sm" role="status" data-testid="save-rules-msg">{msg}</p>}
      <button
        type="button"
        onClick={onResult}
        disabled={busy}
        className="min-h-[44px] w-full rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-60 sm:w-auto"
        data-testid="rule-result-button"
      >
        {busy ? "Loading…" : resultLabel}
      </button>
      {noFilter && <p className="text-sm" role="status" data-testid="ladder-nofilter">{noFilter}</p>}
    </section>
  );
}

interface ListProps extends SavedState {
  active: ActiveRule | null;
  onOpen: (s: MyScreen) => void;
  onCreate: () => void;
}

/** The Rules page: a Create new rule button at the top, the plan limit line once, then the saved rules. Tap a rule to open and edit it. */
export function RulesListPage({ saved, limit, onOpen, onCreate, active }: ListProps) {
  const { user } = useAuth();
  return (
    <div className="space-y-3" data-testid="rules-list-page">
      <button type="button" onClick={onCreate} className="min-h-[48px] w-full rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground sm:w-auto" data-testid="create-new-rule">{CREATE_NEW_RULE}</button>
      {!user && (
        <p className="text-sm text-foreground-muted" data-testid="my-rules-loggedout-saved">
          {LOGGED_OUT_LINE}{" "}
          <Link href={signupHref("/shortlist-lab")} className="font-medium text-accent hover:underline">Sign up free</Link> or <Link href="/login" className="font-medium text-accent hover:underline">log in</Link>.
        </p>
      )}
      {user && limit !== null && <p className="text-xs text-foreground-muted" data-testid="my-rules-plan">{PLAN_LINE(limit, saved.length)}</p>}
      {user && saved.length === 0 && <p className="text-sm text-foreground-muted" data-testid="saved-none">{RULES_LIST_NONE}</p>}
      {user && saved.length > 0 && (
        <ul className="space-y-2" data-testid="saved-list">
          {saved.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onOpen(s)}
                className={`flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-2 text-left hover:border-accent ${active?.id === s.id ? "border-accent" : "border-border"}`}
                data-testid="saved-rule"
                data-active={active?.id === s.id ? "1" : "0"}
              >
                <span className="min-w-0">
                  <span className="block break-words text-sm font-semibold" data-testid="saved-rule-name">{s.name}</span>
                  <span className="block text-xs text-foreground-muted" data-testid="saved-rule-line">{savedLine(s)}</span>
                  <span className="block text-xs text-foreground-muted" data-testid="saved-rule-filters">{RULES_SET_LINE(rulesSetCount(fromParams(s.params)))}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-foreground-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
