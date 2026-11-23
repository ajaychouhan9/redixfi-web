"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { ApiError } from "@/lib/api/client";
import { createMyScreen, deleteMyScreen, listMyScreens, replaceMyScreen, type MyScreen, type MyScreenSaveExtras } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import { signupHref } from "@/lib/nav-items";
import {
  DELETE_BUTTON, LIMIT_REACHED, LOGGED_OUT_LINE, NAME_PLACEHOLDER, OPEN_BUTTON, PLAN_LINE, REPLACE_OLD, REPLACE_QUESTION,
  RULES_SET_LINE, RUN_AGAIN_BUTTON, SAVE_AS_NEW_RULE, SAVE_BUTTON, SAVE_NEW_BUTTON, copyName, saveAction, savedLine,
  type ActiveRule,
} from "@/lib/my-rules";
import { RuleReport } from "@/components/app/stock-check/RuleReport";
import { CLEAR_ALL, FILL_BUTTON, fromParams, hasAnyRule, rulesSetCount, sameRules, toParams, type Rules } from "@/lib/stock-check";

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

interface ToolbarProps extends SavedState {
  rules: Rules;
  sort: { value: string; order: "asc" | "desc" };
  left: number | null;
  active: ActiveRule | null;
  setActive: (a: ActiveRule | null) => void;
  onFill: () => void;
  onClear: () => void;
}

/** The compact bar on the Create rule page: the rule name, Save, Save as new, Fill typical values and Clear all. */
export function RulesToolbar({ rules, sort, left, saved, limit, reload, active, setActive, onFill, onClear }: ToolbarProps) {
  const { user, getToken } = useAuth();
  const [name, setName] = useState("");
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // the name box follows the opened rule
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active) setName(active.name);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const anyRule = hasAnyRule(rules);
  const changed = !!active && !sameRules(rules, active.base);

  async function persist(mode: "new" | "replace", wantedName: string) {
    setMsg(null);
    setAsking(false);
    if (!anyRule) return setMsg("Set at least one rule first.");
    if (mode === "new" && !wantedName.trim()) return setMsg("Give your rules a name first.");
    if (mode === "new" && limit !== null && saved.length >= limit) return setMsg(LIMIT_REACHED(limit));
    setBusy(true);
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
      setName(out.name);
      await reload();
    } catch (e) {
      setMsg(e instanceof ApiError && e.message ? e.message : e instanceof Error && e.message ? e.message : "The rules could not be saved right now.");
    } finally {
      setBusy(false);
    }
  }
  function onSave() {
    setMsg(null);
    if (!anyRule) return setMsg("Set at least one rule first.");
    const action = saveAction(!!active, changed);
    if (action === "ask") return setAsking(true);
    void persist(action === "replace" ? "replace" : "new", name);
  }
  function onSaveNew() {
    setMsg(null);
    if (!anyRule) return setMsg("Set at least one rule first.");
    if (!name.trim()) return setMsg("Give your rules a name first.");
    void persist("new", active ? copyName(name, active.name) : name);
  }

  return (
    <section className="space-y-2 rounded-xl border border-border bg-surface p-3" data-testid="my-rules" aria-label="Rule name and actions">
      {user && (
        <>
          <label htmlFor="save-name" className="sr-only">Name for these rules</label>
          <input id="save-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={NAME_PLACEHOLDER} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm placeholder:text-foreground-faint" data-testid="save-name" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onSave} disabled={busy} className="min-h-[44px] rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-60" data-testid="save-rules-button">{SAVE_BUTTON}</button>
            <button type="button" onClick={onSaveNew} disabled={busy} className={`${btn} disabled:opacity-60`} data-testid="save-new-button">{SAVE_NEW_BUTTON}</button>
          </div>
        </>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1" data-testid="ladder-fill-row">
        <button type="button" onClick={onFill} className="min-h-[44px] rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10" data-testid="ladder-fill">{FILL_BUTTON}</button>
        <button type="button" onClick={onClear} className="min-h-[44px] text-sm text-foreground-muted underline underline-offset-2 hover:text-foreground" data-testid="ladder-clear">{CLEAR_ALL}</button>
      </div>
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
      {msg && <p className="text-sm" role="status" data-testid="save-rules-msg">{msg}</p>}
    </section>
  );
}

interface ListProps extends SavedState {
  rules: Rules;
  active: ActiveRule | null;
  setActive: (a: ActiveRule | null) => void;
  onOpen: (s: MyScreen) => void;
  onRunAgain: (s: MyScreen) => void;
}

/** The Saved rules page: each rule with Open, Run again and Delete, and the plan limit line once. */
export function SavedRulesList({ rules, saved, limit, reload, active, setActive, onOpen, onRunAgain }: ListProps) {
  const { user, getToken } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const changed = !!active && !sameRules(rules, active.base);

  async function remove(id: string) {
    setConfirmDelete(null);
    try {
      const token = await getToken();
      if (!token) return;
      await deleteMyScreen(token, id);
      if (active?.id === id) setActive(null);
      await reload();
    } catch {
      setMsg("That rule could not be removed right now.");
    }
  }

  if (!user) {
    return (
      <p className="text-sm text-foreground-muted" data-testid="my-rules-loggedout-saved">
        {LOGGED_OUT_LINE}{" "}
        <Link href={signupHref("/shortlist-lab")} className="font-medium text-accent hover:underline">Sign up free</Link> or <Link href="/login" className="font-medium text-accent hover:underline">log in</Link>.
      </p>
    );
  }
  return (
    <div className="space-y-3" data-testid="saved-rules-page">
      {limit !== null && <p className="text-xs text-foreground-muted" data-testid="my-rules-plan">{PLAN_LINE(limit, saved.length)}</p>}
      {saved.length === 0 && <p className="text-sm text-foreground-muted" data-testid="saved-none">You have no saved rules yet.</p>}
      {saved.length > 0 && (
        <ul className="space-y-2" data-testid="saved-list">
          {saved.map((s) => {
            const isActive = active?.id === s.id;
            return (
              <li key={s.id} className={`rounded-lg border px-3 py-2 text-sm ${isActive ? "border-accent" : "border-border"}`} data-testid="saved-rule" data-active={isActive ? "1" : "0"}>
                <p className="break-words font-medium">
                  {s.name}
                  {isActive && changed ? <span className="ml-2 text-xs font-normal text-foreground-muted">(changed, not saved)</span> : null}
                </p>
                <p className="text-xs text-foreground-muted" data-testid="saved-rule-line">{savedLine(s)}</p>
                <p className="text-xs text-foreground-muted" data-testid="saved-rule-filters">{RULES_SET_LINE(rulesSetCount(fromParams(s.params)))}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onOpen(s)} className={btn} data-testid="saved-open">{OPEN_BUTTON}</button>
                  <button type="button" onClick={() => onRunAgain(s)} className={btn} data-testid="saved-run-again">{RUN_AGAIN_BUTTON}</button>
                  {confirmDelete === s.id ? (
                    <>
                      <button type="button" onClick={() => void remove(s.id)} className={`${btn} border-accent`} data-testid="saved-delete-confirm">Delete this rule</button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className={btn}>Keep it</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(s.id)} className={`${btn} text-foreground-muted`} data-testid="saved-delete">{DELETE_BUTTON}</button>
                  )}
                </div>
                <RuleReport rule={s} onChanged={() => void reload()} />
              </li>
            );
          })}
        </ul>
      )}
      {msg && <p className="text-sm text-foreground-muted" role="status">{msg}</p>}
    </div>
  );
}
