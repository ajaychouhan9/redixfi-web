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
    <Card title="Market Pulse" action={<span className="rounded bg-hover px-2 py-0.5 font-mono text-[11px] text-foreground-muted">{volState}</span>}>
      <div className="space-y-3">
        <Row label="FII net">
          <DeltaValue value={overview.fii_net} />
        </Row>
        <Row label="DII net">
          <DeltaValue value={overview.dii_net} />
        </Row>
        <Row label="India VIX">
          <DeltaValue value={overview.india_vix_change_pct} kind="pct" />
        </Row>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-xs text-foreground-muted">Sectors</span>
          <span className="font-mono text-sm">
            <span className="text-up">{overview.sectors_up}↑</span> <span className="text-down">{overview.sectors_down}↓</span>
          </span>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-foreground-muted">{label}</span>
      <span className="font-mono text-sm">{children}</span>
    </div>
  );
}
