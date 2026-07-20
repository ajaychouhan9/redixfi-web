import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import type { SignalsMovers, MoverRow } from "@/lib/api/types";

function MoverList({ rows, label }: { rows: MoverRow[]; label: string }) {
  return (
    <div className="flex-1">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-faint">{label}</h3>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.symbol}>
            <Link href={`/signals/${r.symbol}`} className="flex items-center justify-between text-sm hover:text-accent">
              <span className="truncate">{r.symbol}</span>
              <DeltaValue value={r.delta_1d} />
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
    <Card title="Top Signal Changes" action={<Link href="/signals/movers" className="text-xs font-medium text-accent">See all</Link>}>
      <div className="flex gap-6">
        <MoverList rows={movers?.up.slice(0, 3) ?? []} label="Gainers" />
        <MoverList rows={movers?.down.slice(0, 3) ?? []} label="Decliners" />
      </div>
    </Card>
  );
}
