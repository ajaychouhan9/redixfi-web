"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { ApiError } from "@/lib/api/client";
import { createMyScreen, deleteMyScreen, listMyScreens, replaceMyScreen, type MyScreen, type MyScreenSaveExtras } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import { signupHref } from "@/lib/nav-items";
import {
  DELETE_BUTTON, LIMIT_REACHED, LOGGED_OUT_LINE, MY_RULES_LEAD, MY_RULES_TITLE, NAME_PLACEHOLDER, OPEN_BUTTON, PLAN_LINE, REPLACE_OLD, REPLACE_QUESTION,
  RULES_SET_LINE, RUN_AGAIN_BUTTON, SAVE_AS_NEW_RULE, SAVE_BUTTON, SAVE_NEW_BUTTON, copyName, saveAction, savedLine,
  type ActiveRule,
} from "@/lib/my-rules";
import { RuleReport } from "@/components/app/stock-check/RuleReport";
import { fromParams, hasAnyRule, rulesSetCount, sameRules, toParams, type Rules } from "@/lib/stock-check";

interface Props {
  rules: Rules;
  /** Changes when a rule was saved somewhere else on the page (Save this result), so the list is read again. */
  reloadKey?: number;
  /** The list sort the saved rule keeps (a saved rule is a query, as in the Screener). */
  sort: { value: string; order: "asc" | "desc" };
  /** The live count after all steps (from the figures file), or null while it loads. */
  left: number | null;
  /** The date the figures are as of (YYYY-MM-DD). */
  asOf: string | null;
  active: ActiveRule | null;
  setActive: (a: ActiveRule | null) => void;
  onOpen: (s: MyScreen) => void;
  onRunAgain: (s: MyScreen) => void;
}

const btn = "min-h-[44px] rounded-lg border border-border px-3 text-sm font-medium hover:border-accent";

/** One card: common rules, then the rules the person saved (name, date, stock count), with Open, Save, Save as new and Delete. */
export function MyRulesCard({ rules, reloadKey = 0, sort, left, active, setActive, onOpen, onRunAgain }: Props) {
  const { user, getToken } = useAuth();
  const [saved, setSaved] = useState<MyScreen[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [asking, setAsking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getToken();
      if (!token) return;
      const r = await listMyScreens(token);
      setSaved(r.screens);
      setLimit(r.limit);
    } catch {
      /* the saved list is a convenience; the ladder works without it */
    }
  }, [user, getToken]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, reloadKey]);

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
      await load();
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
  async function remove(id: string) {
    setConfirmDelete(null);
    try {
      const token = await getToken();
      if (!token) return;
      await deleteMyScreen(token, id);
      if (active?.id === id) setActive(null);
      await load();
    } catch {
      setMsg("That rule could not be removed right now.");
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4" data-testid="my-rules" aria-labelledby="my-rules-title">
      <h3 id="my-rules-title" className="text-base font-semibold">{MY_RULES_TITLE}</h3>
      <p className="mt-1 text-sm text-foreground-muted">{MY_RULES_LEAD}</p>

      {!user ? (
        <p className="mt-3 border-t border-border pt-3 text-sm text-foreground-muted" data-testid="my-rules-loggedout">
          {LOGGED_OUT_LINE}{" "}
          <Link href={signupHref("/shortlist-lab")} className="font-medium text-accent hover:underline">Sign up free</Link> or <Link href="/login" className="font-medium text-accent hover:underline">log in</Link>.
        </p>
      ) : (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
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
                      <button type="button" onClick={() => { setAsking(false); onOpen(s); }} className={btn} data-testid="saved-open">{OPEN_BUTTON}</button>
                      <button type="button" onClick={() => { setAsking(false); onRunAgain(s); }} className={btn} data-testid="saved-run-again">{RUN_AGAIN_BUTTON}</button>
                      {confirmDelete === s.id ? (
                        <>
                          <button type="button" onClick={() => void remove(s.id)} className={`${btn} border-accent`} data-testid="saved-delete-confirm">Delete this rule</button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className={btn}>Keep it</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirmDelete(s.id)} className={`${btn} text-foreground-muted`} data-testid="saved-delete">{DELETE_BUTTON}</button>
                      )}
                    </div>
                    <RuleReport rule={s} onChanged={() => void load()} />
                  </li>
                );
              })}
            </ul>
          )}
          {saved.length === 0 && <p className="text-sm text-foreground-muted" data-testid="saved-none">You have no saved rules yet.</p>}

          <div className="space-y-2">
            <label htmlFor="save-name" className="sr-only">Name for these rules</label>
            <input id="save-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={NAME_PLACEHOLDER} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm" data-testid="save-name" />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onSave} disabled={busy} className="min-h-[44px] rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-60" data-testid="save-rules-button">{SAVE_BUTTON}</button>
              <button type="button" onClick={onSaveNew} disabled={busy} className={`${btn} disabled:opacity-60`} data-testid="save-new-button">{SAVE_NEW_BUTTON}</button>
            </div>
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
            {limit !== null && <p className="text-xs text-foreground-muted" data-testid="my-rules-plan">{PLAN_LINE(limit, saved.length)}</p>}
            {msg && <p className="text-sm" role="status" data-testid="save-rules-msg">{msg}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
