import type { Metadata } from "next";
import Link from "next/link";
import { getSignalMovers } from "@/lib/api/endpoints";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { Card } from "@/components/ui/Card";
import type { MoverRow } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Signal Movers",
  description: "Today's biggest composite signal score gainers and decliners, reported symmetrically.",
};

const CAUSE_LABEL: Record<string, string> = {
  trend: "trend signal strengthened",
  volume: "volume signal strengthened",
  delivery: "delivery signal strengthened",
  rsi: "RSI signal moved",
  sector: "sector signal turned",
  options: "options positioning shifted",
  fii: "FII flow signal shifted",
};

function MoverList({ rows }: { rows: MoverRow[] }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.symbol}>
          <Link href={`/signals/${r.symbol}`} className="flex items-center justify-between py-2.5 text-sm hover:text-accent">
            <span>
              <span className="font-medium">{r.symbol}</span>{" "}
              <span className="text-foreground-faint">{r.company_name}</span>
              <div className="text-xs text-foreground-faint">{CAUSE_LABEL[r.cause] ?? r.cause}</div>
            </span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums text-foreground-muted">{r.composite_score}</span>
              <DeltaValue value={r.delta_1d} />
            </span>
          </Link>
        </li>
      ))}
      {rows.length === 0 && <li className="py-4 text-sm text-foreground-faint">No movers yet today.</li>}
    </ul>
  );
}

export default async function SignalMoversPage() {
  const env = await getSignalMovers(undefined, 20);
  const movers = env.data;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Signal Movers</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Score Gainers">
          <MoverList rows={movers.up} />
        </Card>
        <Card title="Score Decliners">
          <MoverList rows={movers.down} />
        </Card>
      </div>
    </div>
  );
}
