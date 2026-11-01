"use client";

import { useEffect, useState } from "react";

import { getAskPills } from "@/lib/api/endpoints";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import type { AskPill } from "@/lib/api/types";

/**
 * Up to three fixed questions about this stock. Tapping one opens Ask AI with the question typed in; the person reads it and presses Send (nothing is
 * sent here, so Ask AI's own plan limits and Stock Condition visibility rule apply exactly as for a typed question). The list is fetched from the server (public) and
 * names only topics the stock has data for; no pill asks for the Stock Condition number.
 */
export function AskPills({ symbol }: { symbol: string }) {
  const { openWithQuestion } = useAskPanel();
  const [pills, setPills] = useState<AskPill[]>([]);
  useEffect(() => {
    let cancelled = false;
    getAskPills(symbol)
      .then((env) => {
        if (!cancelled) setPills(env.data.pills ?? []);
      })
      .catch(() => {
        if (!cancelled) setPills([]);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);
  if (pills.length === 0) return null;
  return (
    <section className="mt-3" aria-label="Ask AI about this company" data-testid="ask-pills">
      <p className="mb-1.5 text-xs font-medium text-foreground-muted">Ask AI about this company</p>
      <div className="flex flex-wrap gap-2">
        {pills.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => openWithQuestion(p.question)}
            title={p.question}
            data-testid="ask-pill"
            className="inline-flex min-h-11 max-w-full items-center rounded-full border border-border bg-surface-raised px-4 text-left text-sm text-foreground hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="min-w-0 truncate">{p.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
