import { DeltaValue } from "@/components/ui/DeltaValue";
import { formatShortDate } from "@/lib/format";
import type { IntradaySession, MarketOverview, MarketState } from "@/lib/api/types";

const PHASE: Record<string, string> = { live: "Market open", premarket: "Pre-market", postmarket: "Market closed", closed: "Market closed" };

/** The first line of Home: market status, the Nifty and breadth (stocks up against down), each with its As-of label. */
export function MarketStatusStrip({ overview, session, marketState }: { overview: MarketOverview | null; session: IntradaySession | null; marketState: MarketState | null }) {
  const live = marketState?.state === "live" || session?.state === "live";
  const status = overview?.market_status_label ?? (live ? "Market open" : PHASE[session?.state ?? ""] ?? "Market status");
  const asOfDate = overview?.as_of_date ?? marketState?.latest_completed_session ?? null;
  const asOf = live ? "Prices are delayed or as of the last update" : asOfDate ? `As of ${formatShortDate(asOfDate)} close` : null;
  return (
    <section className="rounded-xl border border-border bg-surface-raised px-4 py-3" data-testid="market-status-strip">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-sm font-semibold text-foreground" data-testid="market-status">{status}</span>
        {overview?.nifty && (
          <span className="flex items-baseline gap-2 text-sm">
            <span className="text-foreground-muted">NIFTY</span>
            <span className="font-mono font-semibold">{overview.nifty.close.toLocaleString("en-IN")}</span>
            <DeltaValue value={overview.nifty.change_pct} kind="pct" />
          </span>
        )}
      </div>
      {session?.breadth_line && (
        <p className="mt-1 text-sm text-foreground-muted" data-testid="market-breadth">
          {session.breadth_line}
          {session.breadth_date ? ` · ${formatShortDate(session.breadth_date)}` : ""}
        </p>
      )}
      {asOf && <p className="mt-1 text-[11px] text-foreground-faint">{asOf}</p>}
    </section>
  );
}
