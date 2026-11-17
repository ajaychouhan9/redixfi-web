"use client";

import { Sparkles } from "lucide-react";

import { AskPills } from "@/components/app/signals/AskPills";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";

/**
 * The Ask AI tab of the stock page. The chat itself is the one RedixFi AI panel (it already knows which stock this page is: the page
 * registers it); this tab opens it, and offers the few ready questions for the company, loaded only when the tab is opened.
 */
export function AskAiTab({ symbol, company }: { symbol: string; company: string }) {
  const { openPanel } = useAskPanel();
  return (
    <section className="space-y-3" aria-labelledby="ask-ai-title" data-testid="ask-ai-tab">
      <div>
        <h2 id="ask-ai-title" className="text-base font-semibold">Ask AI about {company}</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          RedixFi AI answers from this company&apos;s own filings and the data on this page, with its sources. It gives no buy or sell advice and no forecasts.
        </p>
      </div>
      <button
        type="button"
        onClick={openPanel}
        data-testid="ask-ai-open"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
      >
        <Sparkles size={15} aria-hidden /> Open Ask AI for {symbol}
      </button>
      <AskPills symbol={symbol} />
    </section>
  );
}
