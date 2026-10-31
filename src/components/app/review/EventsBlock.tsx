"use client";

import { Sparkles } from "lucide-react";

import { useMine } from "@/components/app/review/MineProvider";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { explainQuestion } from "@/lib/review-copy";
import type { ReviewEvents, SevenDayReview } from "@/lib/api/types";

function Counts({ e, scope }: { e: ReviewEvents; scope: string }) {
  const items: [string, number, string][] = [
    ["Results announced", e.results.stocks, "stocks"],
    ["Board meetings", e.board_meetings.stocks, "stocks"],
    ["Bulk or block deals", e.deals.deals, `deals in ${e.deals.stocks} stocks`],
    ["Insider trade disclosures", e.insider.disclosures, `in ${e.insider.stocks} stocks`],
  ];
  return (
    <div data-testid={`events-${scope}`}>
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {items.map(([label, n, unit]) => (
          <div key={label} className="rounded-lg border border-border bg-surface p-3">
            <dt className="text-xs text-foreground-muted">{label}</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums">
              {n.toLocaleString("en-IN")}
              <span className="block text-xs font-normal text-foreground-muted">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Block E: counts of what was announced in the window, market-wide and (logged in) for the watchlist, and the button that opens Ask AI with a
 *  neutral question describing the numbers on this page. */
export function EventsBlock({ review }: { review: SevenDayReview }) {
  const mine = useMine();
  const { openWithQuestion } = useAskPanel();
  const e = review.events!;
  const m = review.market!;
  const behind = [e.deals.covered_to, e.insider.covered_to].filter((d): d is string => !!d && d < review.as_of!);

  function explain() {
    openWithQuestion(
      explainQuestion({
        label: review.window!.label,
        asOf: review.window!.as_of_label,
        niftyPct: m.nifty?.pct ?? null,
        advancing: m.breadth.advancing,
        declining: m.breadth.declining,
        n: m.breadth.n,
        industriesHigher: m.industries.higher,
        industriesTotal: m.industries.total,
        results: e.results.stocks,
        deals: e.deals.deals,
        insider: e.insider.disclosures,
        fiiNet: m.flows?.fii_net ?? null,
        diiNet: m.flows?.dii_net ?? null,
      }),
    );
  }

  return (
    <div className="space-y-4" data-testid="review-block-e">
      <div>
        <h3 className="mb-1.5 text-sm font-semibold">Across the market</h3>
        <Counts e={e} scope="market" />
        {behind.length > 0 && <p className="mt-1 text-xs text-foreground-muted">Deal and insider data are loaded up to {behind.sort()[0]}; later days in this window may be missing.</p>}
      </div>
      {mine.status === "ready" && mine.data.events && mine.data.rows.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-sm font-semibold">For your watchlist</h3>
          <Counts e={mine.data.events} scope="watchlist" />
        </div>
      )}
      <button
        type="button"
        onClick={explain}
        data-testid="explain-week"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-accent px-4 text-sm font-medium text-foreground hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Sparkles size={15} aria-hidden /> Explain this week
      </button>
      <p className="text-xs text-foreground-muted">Opens RedixFi AI with a question that describes the numbers on this page. The answer describes the data only.</p>
    </div>
  );
}
