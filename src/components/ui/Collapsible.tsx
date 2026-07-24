"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Question-titled collapsible panel — Task 09's "depth on demand" framing:
 * ship answers to questions a person asks, not a dozen more signals. Each
 * fundamentals panel on the research page is one of these.
 */
export function Collapsible({
  question,
  defaultOpen = false,
  action,
  children,
}: {
  question: string;
  defaultOpen?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-border bg-surface-raised shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-foreground">{question}</span>
        <span className="flex items-center gap-2">
          {action}
          <span
            aria-hidden
            className={clsx("text-foreground-faint transition-transform", open && "rotate-180")}
          >
            ▾
          </span>
        </span>
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </section>
  );
}
