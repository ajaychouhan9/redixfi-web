import Link from "next/link";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { SignalsMovers, MoverRow } from "@/lib/api/types";

function MoverList({ rows, label, tone }: { rows: MoverRow[]; label: string; tone: "up" | "down" }) {
  const Icon = tone === "up" ? TrendingUp : TrendingDown;
  return (
    <div className="flex-1">
      <h3 className={`mb-2 font-mono text-[10px] uppercase tracking-wider ${tone === "up" ? "text-up" : "text-down"}`}>{label}</h3>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.symbol}>
            <Link href={`/signals/${r.symbol}`} className="flex items-center justify-between text-sm hover:text-accent">
              <span className="truncate font-medium">{r.symbol}</span>
              <span className={`flex items-center gap-0.5 font-mono text-sm ${tone === "up" ? "text-up" : "text-down"}`}>
                <Icon size={11} /> {r.delta_1d > 0 ? "+" : ""}
                {r.delta_1d}
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-foreground-faint">No movers yet today.</li>}
      </ul>
    </div>
  );
}

export function TopSignalChangesCard({ movers }: { movers: SignalsMovers | null }) {
  return (
    <Card
      title="Top Signal Changes"
      action={
        <Link href="/signals/movers" className="flex items-center gap-0.5 text-xs font-medium text-accent">
          See all <ChevronRight size={12} />
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-x-6">
        <MoverList rows={movers?.up.slice(0, 3) ?? []} label="Gainers" tone="up" />
        <MoverList rows={movers?.down.slice(0, 3) ?? []} label="Decliners" tone="down" />
      </div>
    </Card>
  );
}
