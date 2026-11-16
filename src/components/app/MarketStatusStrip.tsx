import { DeltaValue } from "@/components/ui/DeltaValue";
import { LIVE_LABEL, atCloseLabel } from "@/lib/market-labels";
import type { IntradaySession, MarketOverview, MarketState } from "@/lib/api/types";

const PHASE: Record<string, string> = { live: "Market open", premarket: "Pre-market", postmarket: "Market closed", closed: "Market closed" };

/**
 * The first line of Home: market status, the Nifty and breadth (stocks up against down). Each figure carries its own time basis
 * (16 Nov 2026): a live figure says "Live (15 min delayed)", a closing figure says "At <date> close", so "Market open" is never shown
 * beside an earlier session's reading without a label.
 */
export function MarketStatusStrip({ overview, session, marketState }: { overview: MarketOverview | null; session: IntradaySession | null; marketState: MarketState | null }) {
  const live = marketState?.state === "live" || session?.state === "live";
  const status = overview?.market_status_label ?? (live ? "Market open" : PHASE[session?.state ?? ""] ?? "Market status");
  const asOfDate = overview?.as_of_date ?? marketState?.latest_completed_session ?? null;
  const niftyLabel = live ? LIVE_LABEL : asOfDate ? atCloseLabel(asOfDate) : null;
  const breadthLabel = session?.breadth_date ? atCloseLabel(session.breadth_date) : null;
  return (
    <section className="rounded-xl border border-border bg-surface-raised px-4 py-3" data-testid="market-status-strip">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-sm font-semibold text-foreground" data-testid="market-status">{status}</span>
        {overview?.nifty && (
          <span className="flex items-baseline gap-2 text-sm">
            <span className="text-foreground-muted">NIFTY</span>
            <span className="font-mono font-semibold">{overview.nifty.close.toLocaleString("en-IN")}</span>
            <DeltaValue value={overview.nifty.change_pct} kind="pct" />
            {niftyLabel && <span className="text-[11px] text-foreground-faint" data-testid="market-nifty-basis">{niftyLabel}</span>}
          </span>
        )}
      </div>
      {session?.breadth_line && (
        <p className="mt-1 text-sm text-foreground-muted" data-testid="market-breadth">
          {session.breadth_line}
          {breadthLabel ? <span className="text-[11px] text-foreground-faint"> · {breadthLabel}</span> : ""}
        </p>
      )}
      {!overview?.nifty && niftyLabel && <p className="mt-1 text-[11px] text-foreground-faint">{niftyLabel}</p>}
    </section>
  );
}
