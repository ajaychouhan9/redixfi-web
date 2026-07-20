import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { IntradayRecap, RecapMoverRow, SectorPct } from "@/lib/api/types";

function MoverTable({ rows }: { rows: RecapMoverRow[] }) {
  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li key={r.symbol} className="flex items-center justify-between text-sm">
          <Link href={`/signals/${r.symbol}`} className="hover:text-accent">
            {r.symbol}
          </Link>
          <span className={`tabular-nums ${r.pct > 0 ? "text-up" : r.pct < 0 ? "text-down" : "text-neutral"}`}>
            {r.pct > 0 ? "+" : ""}
            {r.pct}%
          </span>
        </li>
      ))}
      {rows.length === 0 && <li className="text-sm text-foreground-faint">None.</li>}
    </ul>
  );
}

function SectorTable({ rows }: { rows: SectorPct[] }) {
  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li key={r.name} className="flex items-center justify-between text-sm">
          <span>{r.name}</span>
          <span className={`tabular-nums ${r.pct > 0 ? "text-up" : r.pct < 0 ? "text-down" : "text-neutral"}`}>
            {r.pct > 0 ? "+" : ""}
            {r.pct}%
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PostmarketRecap({ recap }: { recap: IntradayRecap | null }) {
  if (!recap) {
    return (
      <Card title="Post-market recap">
        <p className="text-sm text-foreground-muted">No recap generated yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm leading-relaxed">{recap.market_line}</p>
        <p className="mt-1 text-xs text-foreground-faint">
          {recap.advancers} advanced · {recap.decliners} declined · {recap.unchanged} unchanged
        </p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Top gainers">
          <MoverTable rows={recap.top_gainers} />
        </Card>
        <Card title="Top losers">
          <MoverTable rows={recap.top_losers} />
        </Card>
        <Card title="Sector leaders">
          <SectorTable rows={recap.sector_leaders} />
        </Card>
        <Card title="Sector laggards">
          <SectorTable rows={recap.sector_laggards} />
        </Card>
      </div>
      <Card title="Volume anomalies">
        <MoverTable rows={recap.volume_anomalies} />
      </Card>
    </div>
  );
}
