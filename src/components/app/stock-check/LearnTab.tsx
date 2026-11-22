"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { LoggedOutPreview } from "@/components/app/stock-check/LoggedOutPreview";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { findLine, FIVE_QUESTIONS, READY_LINE, LEARN_INTRO, LEARN_STEPS, QUESTIONS_TITLE, STEP_WORD, TRY_BUTTON, TRY_FREE, TRY_LINE, TRY_LOGGED_OUT } from "@/lib/learn";
import { SAMPLE_SYMBOL } from "@/lib/read-company";

/** The Learn tab: seven steps with every example reading shown in full, then one button into Ask AI. Nothing runs on load. */
export function LearnTab({ onOpenRules }: { onOpenRules?: () => void }) {
  const { user } = useAuth();
  const { openPanel, openWithStocks } = useAskPanel();
  const free = !!user && user.tier === "free" && !user.is_pro_trial;
  return (
    <div className="space-y-6" data-testid="learn-tab">
      <p className="text-sm leading-relaxed text-foreground-muted" data-testid="read-intro">{LEARN_INTRO}</p>

      <section className="rounded-2xl border border-border bg-surface-raised p-4" aria-labelledby="learn-try" data-testid="learn-try">
        <h2 id="learn-try" className="text-base font-semibold">{QUESTIONS_TITLE}</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground-muted" data-testid="learn-questions">
          {FIVE_QUESTIONS.map((q) => <li key={q}>{q}</li>)}
        </ol>
        <button
          type="button"
          onClick={() => (user ? openWithStocks([SAMPLE_SYMBOL]) : openPanel())}
          className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-accent-foreground"
          data-testid="learn-try-button"
        >
          <Sparkles size={15} aria-hidden /> {TRY_BUTTON}
        </button>
        <p className="mt-2 text-xs text-foreground-muted" data-testid="learn-try-line">{TRY_LINE}</p>
        {!user && <p className="mt-1 text-xs text-foreground-muted" data-testid="learn-try-loggedout">{TRY_LOGGED_OUT}</p>}
        {free && <p className="mt-1 text-xs text-foreground-muted" data-testid="learn-try-free">{TRY_FREE}</p>}
      </section>

      <LoggedOutPreview />

      <ol className="space-y-4">
        {LEARN_STEPS.map((s) => (
          <li key={s.n}>
            <section className="rounded-xl border border-border bg-surface p-4" aria-labelledby={`learn-step-${s.n}`} data-testid={`learn-step-${s.n}`}>
              <h2 id={`learn-step-${s.n}`} className="text-base font-semibold">{STEP_WORD} {s.n}. {s.name}</h2>
              <p className="mt-1 text-sm text-foreground-muted" data-testid="learn-step-line">{s.line}</p>
              <h3 className="mt-3 text-sm font-semibold">What to look at</h3>
              <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{s.look}</p>
              <h3 className="mt-3 text-sm font-semibold">What it means</h3>
              <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{s.means}</p>
              <div className="mt-3 rounded-lg border border-border bg-surface-raised px-3 py-2" data-testid="learn-example">
                <p className="text-sm font-medium">{s.example.q}</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{s.example.a}</p>
              </div>
              <p className="mt-3 text-xs text-foreground-muted" data-testid="learn-find-line">
                {findLine(s.tabs).split("Screener")[0]}
                <Link href="/signals" className="font-medium text-accent hover:underline">Screener</Link>
                {findLine(s.tabs).split("Screener")[1]}
              </p>
            </section>
          </li>
        ))}
      </ol>

      <p className="text-sm" data-testid="learn-ready-line">
        {READY_LINE.split("My rules tab")[0]}
        <button type="button" onClick={onOpenRules} className="font-medium text-accent hover:underline" data-testid="learn-ready-link">My rules tab</button>
        {READY_LINE.split("My rules tab")[1]}
      </p>
    </div>
  );
}
