"use client";

import Link from "next/link";

import { LoggedOutPreview } from "@/components/app/stock-check/LoggedOutPreview";
import { findLine, LEARN_FIELDS, READY_LINE, LEARN_INTRO, LEARN_STEPS, STEP_WORD } from "@/lib/learn";

/** The Learn tab: seven steps with every example reading shown in full, then one button into Ask AI. Nothing runs on load. */
export function LearnTab({ onOpenRules }: { onOpenRules?: () => void }) {
  return (
    <div className="space-y-6" data-testid="learn-tab">
      <p className="text-sm leading-relaxed text-foreground-muted" data-testid="read-intro">{LEARN_INTRO}</p>

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
              <h3 className="mt-4 text-sm font-semibold">Each field in this step</h3>
              <ul className="mt-2 space-y-3" data-testid="learn-fields">
                {(LEARN_FIELDS[s.n] ?? []).map((f) => (
                  <li key={f.name} className="rounded-lg border border-border px-3 py-2" data-testid="learn-field">
                    <p className="text-sm font-medium">{f.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{f.text}</p>
                    <p className="mt-1 text-xs text-foreground-faint">Example: {f.example}</p>
                  </li>
                ))}
              </ul>
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
