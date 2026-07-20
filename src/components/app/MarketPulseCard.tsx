import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import type { MarketOverview } from "@/lib/api/types";

export function MarketPulseCard({ overview }: { overview: MarketOverview | null }) {
  if (!overview) {
    return (
      <Card title="Market Pulse">
        <p className="text-sm text-foreground-muted">Market data unavailable right now.</p>
      </Card>
    );
  }

  const volState = overview.india_vix_change_pct > 5 ? "VOLATILE" : overview.india_vix_change_pct < -5 ? "CALM" : "NORMAL";

  return (
    <Card title="Market Pulse">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-xs font-semibold text-neutral">{volState}</span>
        <span>
          FII net <DeltaValue value={overview.fii_net} />
        </span>
        <span>
          DII net <DeltaValue value={overview.dii_net} />
        </span>
        <span>
          Sectors <span className="text-up">{overview.sectors_up}↑</span> <span className="text-down">{overview.sectors_down}↓</span>
        </span>
        <span>
          India VIX <DeltaValue value={overview.india_vix_change_pct} kind="pct" />
        </span>
      </div>
    </Card>
  );
}
