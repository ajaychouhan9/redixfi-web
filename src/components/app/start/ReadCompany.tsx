"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import {
  ASK_QUESTIONS,
  CHIP_COST,
  CHIP_LOGIN,
  NOTES_HELP,
  NOTES_LABELS,
  NOTES_TITLE,
  QUIZ,
  QUIZ_TITLE,
  READ_STEPS,
  SAMPLE_BUTTON,
  SAMPLE_NAME,
  SAMPLE_NOTE,
  SAMPLE_SYMBOL,
  askHref,
  notesLine,
} from "@/lib/read-company";

const NOTES_KEY = "redixfi:read-company-notes";
const btn = "inline-flex min-h-[44px] items-center rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10";

/** The five steps, the notes list and the reading questions. Nothing here runs on load except reading the saved ticks from this device. */
export function ReadCompany() {
  const [done, setDone] = useState<boolean[]>(() => READ_STEPS.map(() => false));
  const [open, setOpen] = useState<boolean[]>(() => QUIZ.map(() => false));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTES_KEY);
      const arr = raw ? JSON.parse(raw) : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(arr) && arr.length === READ_STEPS.length) setDone(arr.map((x) => x === true));
    } catch {
      /* no saved ticks: all unticked */
    }
  }, []);

  function tick(i: number) {
    setDone((d) => {
      const next = d.map((v, k) => (k === i ? !v : v));
      try {
        window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
      } catch {
        /* private mode: the ticks just are not kept */
      }
      return next;
    });
  }

  const count = done.filter(Boolean).length;
  return (
    <div className="space-y-6" data-testid="read-company">
      <section className="rounded-2xl border border-border bg-surface-raised p-5" data-testid="read-sample">
        <Link href={`/stocks/${SAMPLE_SYMBOL}`} className="inline-flex min-h-[44px] items-center rounded-lg bg-accent px-5 text-sm font-semibold text-accent-foreground" data-testid="read-sample-button">
          {SAMPLE_BUTTON}
        </Link>
        <p className="mt-3 text-sm text-foreground-muted">
          Sample: {SAMPLE_NAME} ({SAMPLE_SYMBOL}). {SAMPLE_NOTE}
        </p>
      </section>

      <ol className="space-y-4">
        {READ_STEPS.map((s) => (
          <li key={s.n}>
            <section className="rounded-xl border border-border bg-surface p-4" aria-labelledby={`read-step-${s.n}`} data-testid={`read-step-${s.n}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={`read-step-${s.n}`} className="text-base font-semibold">
                  Step {s.n}. {s.title}
                </h2>
                <span className="rounded-full bg-neutral-bg px-2.5 py-0.5 text-xs font-semibold text-foreground-muted" data-testid="read-time">
                  {s.minutes}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold">What to look at</h3>
              <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{s.look}</p>
              <h3 className="mt-3 text-sm font-semibold">What it means</h3>
              <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{s.means}</p>
              {s.rules && (
                <div className="mt-3 rounded-lg border border-border bg-surface-raised px-3 py-2" data-testid="read-rules">
                  <p className="text-sm leading-relaxed text-foreground-muted">{s.rules}</p>
                  <Link href="/signals" className="mt-1 inline-block text-sm font-medium text-accent hover:underline" data-testid="read-rules-screener">
                    Set your own numbers in the Screener
                  </Link>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {s.tabs.map((t) => (
                  <Link key={t.tab + t.label} href={`/stocks/${SAMPLE_SYMBOL}#${t.tab}`} className={btn} data-testid="read-tab-button">
                    {t.label}
                  </Link>
                ))}
              </div>
              <div className="mt-3">
                <Link
                  href={askHref(SAMPLE_SYMBOL, s.askKey)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-hover px-4 py-2 text-left text-sm text-foreground hover:border-accent"
                  data-testid="read-ask-chip"
                >
                  <Sparkles size={14} className="shrink-0 text-accent" aria-hidden />
                  <span>{ASK_QUESTIONS[s.askKey]}</span>
                </Link>
                <p className="mt-1 text-xs text-foreground-muted" data-testid="read-chip-cost">
                  {CHIP_COST}
                </p>
              </div>
            </section>
          </li>
        ))}
      </ol>
      <p className="text-xs text-foreground-muted" data-testid="read-chip-login">
        {CHIP_LOGIN}
      </p>

      <section className="rounded-xl border border-border bg-surface p-4" aria-labelledby="read-notes" data-testid="read-notes">
        <h2 id="read-notes" className="text-base font-semibold">
          {NOTES_TITLE}
        </h2>
        <p className="mt-1 text-xs text-foreground-muted">{NOTES_HELP}</p>
        <ul className="mt-3 space-y-1">
          {NOTES_LABELS.map((label, i) => (
            <li key={label}>
              <label className="flex min-h-[44px] items-center gap-3 text-sm">
                <input type="checkbox" checked={done[i]} onChange={() => tick(i)} className="h-5 w-5 shrink-0" data-testid="read-note-box" />
                <span>{label}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm font-medium" data-testid="read-notes-count" aria-live="polite">
          {notesLine(count)}
        </p>
      </section>

      <section aria-labelledby="read-quiz" data-testid="read-quiz">
        <h2 id="read-quiz" className="text-base font-semibold">
          {QUIZ_TITLE}
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {QUIZ.map((c, i) => (
            <li key={c.q} className="rounded-xl border border-border bg-surface p-4" data-testid="read-quiz-card">
              <p className="text-sm font-medium">{c.q}</p>
              <button
                type="button"
                onClick={() => setOpen((o) => o.map((v, k) => (k === i ? !v : v)))}
                aria-expanded={open[i]}
                className="mt-2 min-h-[44px] rounded-lg border border-border px-3 text-sm font-medium text-foreground-muted hover:text-foreground"
              >
                {open[i] ? "Hide the reading" : "Show the reading"}
              </button>
              {open[i] && <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{c.a}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
