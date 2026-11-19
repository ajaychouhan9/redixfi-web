"use client";

import { useState } from "react";
import Link from "next/link";

import { ApiError } from "@/lib/api/client";
import { estimateFullCheck, startFullCheck, type FullCheckEstimate } from "@/lib/api/fullcheck";
import { useAuth } from "@/lib/auth/AuthContext";
import { ASK_ALL_LABEL, ASK_ALL_LEAD, ASK_GROUP_LEAD, ASK_GROUP_MAX, ASK_GROUP_TITLE } from "@/lib/ask-group";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { costLine } from "@/lib/fullcheck-copy";
import { signupHref } from "@/lib/nav-items";
import { AskPreview } from "@/components/app/stock-check/AskPreview";

interface Props {
  /** Symbols ticked on the stock list, in the order they were ticked. */
  selected: string[];
  onRemove: (symbol: string) => void;
  onClear: () => void;
}

const btn = "min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium hover:border-accent disabled:opacity-60";

/** "Ask AI about these stocks": below the stock list. Ask AI opens a new session with the ticked stocks; Ask all 5 runs the full check (cost shown, confirmed first). */
export function AskAboutStocks({ selected, onRemove, onClear }: Props) {
  const { user, getToken } = useAuth();
  const { openWithStocks } = useAskPanel();
  const [estimate, setEstimate] = useState<FullCheckEstimate | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  async function askAll() {
    setMessage(null);
    setStarted(false);
    setEstimate(null);
    setLocked(null);
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("login");
      const e = await estimateFullCheck(selected, { token });
      if (e.locked) setLocked(e.locked_message ?? "Full check is on Basic and Pro. Free accounts can read the stored sample below.");
      else if (selected.length > e.max_companies) setMessage(`Ask all 5 runs at most ${e.max_companies} stocks at a time.`);
      else setEstimate(e);
    } catch {
      setMessage("The cost could not be worked out just now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("login");
      await startFullCheck(selected, { token });
      setEstimate(null);
      setStarted(true);
    } catch (e) {
      const d = e instanceof ApiError ? (e.detail as { message?: string; reason?: string } | undefined) : undefined;
      if (d?.reason === "plan_locked") {
        setEstimate(null);
        setLocked(d.message ?? "Full check is on Basic and Pro. Free accounts can read the stored sample below.");
      } else setMessage(d?.message ?? "The run could not be started. Nothing was used. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4" aria-labelledby="ask-about-title" data-testid="ask-about">
      <h3 id="ask-about-title" className="text-base font-semibold">{ASK_GROUP_TITLE}</h3>
      {!user ? (
        <>
          <p className="text-sm text-foreground-muted">
            Log in to tick stocks on your list and ask about them. Below is a stored sample answer for one company.{" "}
            <Link href={signupHref("/stock-check")} className="font-medium text-accent hover:underline">Sign up free</Link> or <Link href="/login" className="font-medium text-accent hover:underline">log in</Link>.
          </p>
          <AskPreview />
        </>
      ) : (
        <>
          <p className="text-sm text-foreground-muted">{ASK_GROUP_LEAD}</p>
          <p className="text-sm font-medium" data-testid="ask-selected-count" aria-live="polite">
            {selected.length} of {ASK_GROUP_MAX} selected
          </p>
          {selected.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" data-testid="ask-selected-list">
              {selected.map((s) => (
                <li key={s} className="flex items-center overflow-hidden rounded-full border border-border text-xs">
                  <span className="px-3 py-2 font-medium">{s}</span>
                  <button type="button" onClick={() => onRemove(s)} aria-label={`Remove ${s}`} className="min-h-[36px] px-2 text-foreground-muted hover:text-foreground">×</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={selected.length === 0} onClick={() => openWithStocks(selected)} className="min-h-[44px] rounded-lg bg-accent px-5 text-sm font-semibold text-accent-foreground disabled:opacity-50" data-testid="ask-ai-button">
              Ask AI
            </button>
            <button type="button" disabled={selected.length === 0 || busy} onClick={() => void askAll()} className={btn} data-testid="ask-all-button">
              {busy && !estimate ? "Checking the cost…" : ASK_ALL_LABEL}
            </button>
            {selected.length > 0 && <button type="button" onClick={onClear} className={`${btn} text-foreground-muted`}>Clear selection</button>}
          </div>
          <p className="text-xs text-foreground-muted">{ASK_ALL_LEAD}</p>

          {estimate && (
            <div className="rounded-lg border border-accent bg-surface-raised p-3 text-sm" role="group" aria-label="Confirm the full check" data-testid="ask-all-confirm">
              <p className="font-medium" data-testid="ask-all-cost">{costLine(estimate.total, estimate.items)}</p>
              <p className="mt-1 text-xs text-foreground-muted">For {selected.length} {selected.length === 1 ? "stock" : "stocks"}: {estimate.items.map((i) => `${i.symbol} ${i.cost}`).join(", ")}. Nothing is used until you confirm.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => void confirm()} disabled={busy} className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-60" data-testid="ask-all-run">
                  {busy ? "Starting…" : `Confirm and use ${estimate.total} ${estimate.total === 1 ? "question" : "questions"}`}
                </button>
                <button type="button" onClick={() => setEstimate(null)} className={btn}>Cancel</button>
              </div>
            </div>
          )}
          {started && (
            <p className="text-sm" role="status" data-testid="ask-all-started">
              The full check has started. <Link href="/full-check" className="font-medium text-accent hover:underline">Follow it and read the reports on the Full check page</Link>.
            </p>
          )}
          {locked && (
            <div className="space-y-3" data-testid="ask-all-locked">
              <p className="text-sm text-foreground-muted">{locked}</p>
              <AskPreview />
            </div>
          )}
          {message && <p className="text-sm text-foreground-muted" role="status" data-testid="ask-all-message">{message}</p>}
        </>
      )}
    </section>
  );
}
