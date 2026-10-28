import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import type { IntradayRecap, RecapMoverRow, SectorPct } from "@/lib/api/types";
import { stockPath } from "@/lib/seo/stock-symbol";

// Step A4 polish (2026-08-11): both tables used to hand-roll their own
// +/-/color logic instead of the shared DeltaValue component every other
// page (Signals, Home) already uses for a numeric delta — same data,
// genuinely more consistent styling (adds the up/down arrow glyph too),
// not a data or logic change.
function MoverTable({ rows, showVolume = false }: { rows: RecapMoverRow[]; showVolume?: boolean }) {
  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li key={r.symbol} className="flex items-center justify-between text-sm">
          <Link href={stockPath("/signals", r.symbol)} className="hover:text-accent">
            {r.symbol}
          </Link>
          <span className="flex items-center gap-3">
            {showVolume && r.volume_ratio != null && (
              <span className="text-xs text-foreground-faint">volume {r.volume_ratio.toLocaleString("en-IN", { maximumFractionDigits: 1 })}× its 20-day average</span>
            )}
            <DeltaValue value={r.pct} kind="pct" />
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
          <DeltaValue value={r.pct} kind="pct" />
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
        {/* Step A2 (2026-08-11): "NIFTY 500" label added — confirmed real,
            not fabricated: data-pipeline/intraday_recap_builder.py computes
            advancers/decliners/unchanged against that exact universe
            ("NIFTY 500 preferred anchor" in build_market_line()'s own
            comment). Numbers themselves are unchanged. */}
        <p className="mt-1 text-xs text-foreground-faint">
          NIFTY 500: {recap.advancers} advanced · {recap.decliners} declined · {recap.unchanged} unchanged
        </p>
        {recap.breadth_line && <p className="mt-1 text-sm text-foreground-muted">{recap.breadth_line}</p>}
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Largest price increases">
          <MoverTable rows={recap.top_gainers} />
        </Card>
        <Card title="Largest price decreases">
          <MoverTable rows={recap.top_losers} />
        </Card>
        <Card title="Highest sector readings">
          <SectorTable rows={recap.sector_leaders} />
        </Card>
        <Card title="Lowest sector readings">
          <SectorTable rows={recap.sector_laggards} />
        </Card>
      </div>
      <Card title="Volume anomalies">
        <MoverTable rows={recap.volume_anomalies} showVolume />
      </Card>
    </div>
  );
}
