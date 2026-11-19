"use client";

import { useState } from "react";
import Link from "next/link";

import { ApiError } from "@/lib/api/client";
import { listMyScreens, saveRuleAnswer, type MyScreen } from "@/lib/api/mutations";
import { ADDED_TO, ADD_TO_RULE, ADD_TO_RULE_CHOOSE, ALREADY_IN, NO_RULES_YET, SAVE_A_RULE_LINK, saveErrorText } from "@/lib/rule-answers";

type State = "idle" | "loading" | "choosing" | "saving" | "done" | "none";

/** "Add to my rule" under an Ask AI answer: choose one of the saved rules; the server copies the answer, its sources and its date from the person's own conversation. */
export function AddToRuleButton({ conversationId, text, symbol, getToken }: {
  conversationId: string; text: string; symbol: string | null; getToken: () => Promise<string | null | undefined>;
}) {
  const [state, setState] = useState<State>("idle");
  const [rules, setRules] = useState<MyScreen[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function open() {
    setMsg(null);
    setState("loading");
    try {
      const token = await getToken();
      if (!token) throw new Error("login");
      const r = await listMyScreens(token);
      setRules(r.screens);
      setState(r.screens.length ? "choosing" : "none");
    } catch {
      setMsg(saveErrorText(undefined));
      setState("idle");
    }
  }
  async function choose(rule: MyScreen) {
    setState("saving");
    try {
      const token = await getToken();
      if (!token) throw new Error("login");
      const out = await saveRuleAnswer(token, rule.id, { conversation_id: conversationId, answer_text: text, symbol });
      setMsg(out.already_saved ? ALREADY_IN(rule.name) : ADDED_TO(rule.name));
      setState("done");
    } catch (e) {
      setMsg(saveErrorText(e instanceof ApiError ? e.detail : undefined));
      setState("choosing");
    }
  }

  return (
    <div className="mt-2 border-t border-border pt-2 text-[12px]" data-testid="add-to-rule">
      {state === "done" ? (
        <p role="status" data-testid="add-to-rule-done">{msg}</p>
      ) : (
        <>
          <button type="button" onClick={() => void (state === "choosing" ? setState("idle") : open())} disabled={state === "loading" || state === "saving"} aria-expanded={state === "choosing" || state === "none"}
            className="min-h-[36px] rounded-md border border-border bg-hover px-3 font-medium text-foreground-muted hover:border-accent hover:text-foreground disabled:opacity-60" data-testid="add-to-rule-button">
            {state === "loading" ? "Loading your rules…" : ADD_TO_RULE}
          </button>
          {state === "none" && (
            <p className="mt-1.5 text-foreground-muted" data-testid="add-to-rule-none">
              {NO_RULES_YET} <Link href="/stock-check" className="font-medium text-accent underline">{SAVE_A_RULE_LINK}</Link>
            </p>
          )}
          {(state === "choosing" || state === "saving") && (
            <div className="mt-1.5" role="group" aria-label={ADD_TO_RULE_CHOOSE} data-testid="add-to-rule-list">
              <p className="mb-1 text-foreground-faint">{ADD_TO_RULE_CHOOSE}</p>
              <ul className="flex flex-col gap-1">
                {rules.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => void choose(r)} disabled={state === "saving"} className="w-full min-h-[40px] rounded-md border border-border px-3 text-left hover:border-accent disabled:opacity-60" data-testid="add-to-rule-choice">
                      <span className="break-words font-medium">{r.name}</span>
                      {typeof r.answers === "number" && r.answers > 0 && <span className="ml-2 text-foreground-faint">{r.answers} saved</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {msg && <p className="mt-1.5 text-foreground-muted" role="status" data-testid="add-to-rule-msg">{msg}</p>}
        </>
      )}
    </div>
  );
}
