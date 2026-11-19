"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { NO_RULES_LINE, RULES_APPLIED_NOTE, RULES_APPLIED_TITLE } from "@/lib/my-rules";
import { describeRules, type Rules } from "@/lib/stock-check";

/** A small read-only card above the stocks that lists every rule applied, so the person need not scroll back up. Collapsible. */
export function RulesApplied({ rules }: { rules: Rules }) {
  const lines = describeRules(rules);
  const [open, setOpen] = useState(false);
  if (lines.length === 0) return <p className="text-sm text-foreground-muted" data-testid="rules-applied-none">{NO_RULES_LINE}</p>;
  return (
    <section className="rounded-xl border border-border bg-surface-raised" data-testid="rules-applied">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-left">
        <span className="text-sm font-semibold">{RULES_APPLIED_TITLE} ({lines.length})</span>
        <ChevronDown size={14} className={open ? "rotate-180" : ""} aria-hidden />
      </button>
      {open && (
        <div className="border-t border-border px-3 pb-3 pt-2">
          <ul className="list-disc space-y-1 pl-5 text-sm" data-testid="rules-applied-list">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-foreground-muted">{RULES_APPLIED_NOTE}</p>
        </div>
      )}
    </section>
  );
}
