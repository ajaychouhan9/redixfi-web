import { Card } from "@/components/ui/Card";
import type { SectorMomentum } from "@/lib/api/types";

function toneClasses(pct: number) {
  if (pct > 1) return "bg-up-bg text-up";
  if (pct > 0) return "bg-up-bg/50 text-up";
  if (pct < -1) return "bg-down-bg text-down";
  if (pct < 0) return "bg-down-bg/50 text-down";
  return "bg-neutral-bg text-neutral";
}

export function SectorHeatmap({ sectors }: { sectors: SectorMomentum[] }) {
  return (
    <Card title="Sector heatmap (5-day momentum)">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {sectors.map((s) => (
          <div key={s.sector} className={`rounded-lg px-3 py-2 text-xs font-medium ${toneClasses(s.momentum_5d_pct)}`}>
            <div className="truncate">{s.sector.replace(/^NIFTY\s*/, "")}</div>
            <div className="tabular-nums">{s.momentum_5d_pct > 0 ? "+" : ""}{s.momentum_5d_pct}%</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
