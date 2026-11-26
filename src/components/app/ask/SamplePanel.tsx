"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AskPreview } from "@/components/app/stock-check/AskPreview";
import samples from "@/data/ask-samples.json";
import { LOGIN_FOR_OWN, sampleIdFor } from "@/lib/ask-samples";
import { ASK_QUESTIONS, SAMPLE_NAME, SAMPLE_SYMBOL } from "@/lib/read-company";

/** The page chips (points, financials, management) are the same questions as the stored answers, worded for a stock page. */
const ALIASES: Record<string, string> = { [ASK_QUESTIONS.points]: "points", [ASK_QUESTIONS.financials]: "numbers", [ASK_QUESTIONS.management]: "management" };

/**
 * Ask AI for visitors who are logged out: the three sample questions on the sample company, answered from stored text (no request, no model call,
 * no quota). The question is typed in; pressing Send shows the stored answer. Any other question or company asks for a log-in.
 */
export function SamplePanel({ typed, onTypedUsed }: { typed: string | null; onTypedUsed: () => void }) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<{ q: string; id: string | null }[]>([]);

  // A question put in by a chip on another page is typed into the box (not sent). Adjusting state while rendering avoids an extra pass.
  const [lastTyped, setLastTyped] = useState<string | null>(null);
  if (typed && typed !== lastTyped) {
    setLastTyped(typed);
    setInput(typed);
  }
  useEffect(() => {
    if (typed) onTypedUsed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  function send() {
    const q = input.trim();
    if (!q) return;
    setTurns((t) => [...t, { q, id: sampleIdFor(q, samples.answers, ALIASES) }]);
    setInput("");
  }

  return (
    <div className="space-y-3" data-testid="sample-panel">
      <p className="text-xs text-foreground-muted" data-testid="sample-panel-context">
        Sample company: {SAMPLE_NAME} ({SAMPLE_SYMBOL}). The three questions below are answered from stored text. No log-in needed.
      </p>
      <ul className="flex flex-col gap-2" data-testid="sample-panel-chips">
        {samples.answers.map((x) => (
          <li key={x.id}>
            <button
              type="button"
              onClick={() => setInput(x.question)}
              className="min-h-[44px] w-full rounded-lg border border-border bg-hover px-3 py-2 text-left text-sm hover:border-accent"
              data-testid={`sample-chip-${x.id}`}
            >
              {x.question}
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Your question"
          placeholder="Ask about the sample company"
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
          data-testid="sample-input"
        />
        <button type="submit" className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground" data-testid="sample-send">
          Send
        </button>
      </form>
      {turns.map((t, i) => (
        <div key={i} className="space-y-2" data-testid="sample-turn">
          <p className="rounded-lg bg-hover px-3 py-2 text-sm" data-testid="sample-turn-q">{t.q}</p>
          {t.id ? (
            <AskPreview compact only={t.id} />
          ) : (
            <p className="rounded-lg border border-border px-3 py-2 text-sm text-foreground-muted" data-testid="sample-turn-login">
              {LOGIN_FOR_OWN}{" "}
              <Link prefetch={false} href="/login" className="font-medium text-accent underline">Log in</Link>
            </p>
          )}
        </div>
      ))}
      <p className="text-xs font-medium text-foreground-muted">Sample, not a suggestion. Not advice.</p>
    </div>
  );
}
