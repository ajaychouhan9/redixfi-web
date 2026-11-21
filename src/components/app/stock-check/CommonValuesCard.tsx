"use client";

import { COMMON_CARD_SUBTITLE, COMMON_CARD_TITLE, FILL_LINK, CLEAR_ALL, commonLines } from "@/lib/stock-check";

/** One card of typical starting numbers. "Fill with these values" puts every value shown here into the steps (all steps back in use); the person then changes any of them. */
export function CommonValuesCard({ onFill, onClear }: { onFill: () => void; onClear: () => void }) {
  const lines = commonLines();
  return (
    <section className="rounded-xl border border-border bg-surface p-4" aria-labelledby="common-values-title" data-testid="common-values">
      <h3 id="common-values-title" className="text-base font-semibold">{COMMON_CARD_TITLE}</h3>
      <p className="mt-1 text-sm text-foreground-muted" data-testid="common-values-subtitle">{COMMON_CARD_SUBTITLE}</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-foreground-muted" data-testid="common-values-list">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <button type="button" onClick={onFill} className="min-h-[44px] font-semibold text-accent underline underline-offset-2" data-testid="ladder-common">{FILL_LINK}</button>
        <button type="button" onClick={onClear} className="min-h-[44px] text-foreground-muted underline underline-offset-2 hover:text-foreground" data-testid="ladder-clear">{CLEAR_ALL}</button>
      </p>
    </section>
  );
}
