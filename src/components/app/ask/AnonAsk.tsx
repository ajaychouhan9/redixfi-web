"use client";

import { useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";

import { MarkdownAnswer } from "@/components/app/ask/MarkdownAnswer";
import { ApiError } from "@/lib/api/client";
import { askAnonymous } from "@/lib/api/mutations";
import { stockPath } from "@/lib/seo/stock-symbol";
import { track } from "@/lib/analytics";

export const ANON_SIGNUP_LINE = "Sign up free to ask more and start your 5-day Pro trial.";

/**
 * One free Ask AI question a day for a visitor who is not signed in (26 Nov 2026), about the stock page they are on. The server answers through the same
 * code as the signed-in Ask AI and allows one question a day per browser and per network address. After the answer the visitor is asked to sign up.
 */
export function AnonAsk({ symbol, onNavigate }: { symbol: string | null; onNavigate?: () => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(false);
  const next = symbol ? stockPath("/stocks", symbol) : "/";
  const signup = `/login?mode=signup&next=${encodeURIComponent(next)}`;

  async function ask() {
    if (!symbol || busy || q.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const out = await askAnonymous(symbol, q.trim());
      setAnswer(out.answer);
      setUsed(!out.refused);
      track("ask_ai_question", { signed_in: false });
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setUsed(true);
        setError(`You have used today's free question. ${ANON_SIGNUP_LINE}`);
      } else {
        setError("We could not answer that right now. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 px-4 py-4" data-testid="anon-ask">
      {!symbol ? (
        <p className="text-[15px] leading-[1.5]">Open a stock page, then ask one free question about it. Or <Link href={signup} onClick={onNavigate} className="font-bold text-accent underline">sign up free</Link> to ask about any stock.</p>
      ) : answer === null && !used ? (
        <>
          <p className="text-[15px] font-bold">Ask one free question about {symbol}</p>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void ask()}
              maxLength={300}
              placeholder="Ask about a stock…"
              aria-label="Your question"
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-[15px] outline-none focus:border-accent"
              data-testid="anon-ask-input"
            />
            <button type="button" onClick={() => void ask()} disabled={busy || q.trim().length < 3} aria-label="Ask" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground disabled:opacity-50" data-testid="anon-ask-send">
              <Send size={16} />
            </button>
          </div>
          <p className="text-[12px] text-foreground-muted">1 free question a day without an account.</p>
        </>
      ) : null}
      {busy && <p className="text-[13px] text-foreground-muted" role="status">Reading the data…</p>}
      {answer && (
        <div className="rounded-xl border border-border bg-hover px-3.5 py-2.5" data-testid="anon-ask-answer">
          <MarkdownAnswer text={answer} />
        </div>
      )}
      {error && <p className="text-[13px] text-foreground-muted" role="status" data-testid="anon-ask-error">{error}</p>}
      {used && (
        <div className="border-t border-border pt-3" data-testid="anon-ask-signup">
          <p className="text-[15px] font-bold">{ANON_SIGNUP_LINE}</p>
          <Link href={signup} onClick={onNavigate} className="mt-2 inline-flex min-h-[44px] items-center rounded-lg bg-accent px-4 text-[15px] font-bold text-accent-foreground">Sign up free</Link>
        </div>
      )}
      <p className="text-[12px] text-foreground-muted">RedixFi shows market data for information only. It gives no buy or sell advice or predictions.</p>
    </div>
  );
}
