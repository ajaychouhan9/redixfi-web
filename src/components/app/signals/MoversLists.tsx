"use client";

import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { ProLock, ScValue } from "@/components/ui/ScValue";
import { useMovers } from "@/components/app/useMovers";
import { displayName } from "@/lib/company-name";
import { stockPath } from "@/lib/seo/stock-symbol";
import { formatShortDate } from "@/lib/format";
import type { MoverRow, SignalsMovers } from "@/lib/api/types";

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
          <Link href={stockPath("/signals", r.symbol)} className="flex items-center justify-between py-2.5 text-sm hover:text-accent">
            <span>
              <span className="font-medium">{r.symbol}</span>{" "}
              <span className="text-foreground-faint">{displayName(r.company_name)}</span>
              <div className="text-xs text-foreground-faint">{CAUSE_LABEL[r.cause] ?? r.cause}</div>
            </span>
            <span className="flex items-center gap-3">
              {r.sc_locked ? (
                <ProLock />
              ) : (
                <>
                  <span className="text-foreground-muted">
                    <ScValue value={r.composite_score} />
                  </span>
                  <DeltaValue value={r.delta_1d} />
                </>
              )}
            </span>
          </Link>
        </li>
      ))}
      {rows.length === 0 && <li className="py-4 text-sm text-foreground-faint">No movers yet today.</li>}
    </ul>
  );
}

/** The two mover lists. The server's anonymous copy first; a signed-in visitor gets their own copy (the one Stock Condition visibility rule). */
export function MoversLists({ initial }: { initial: SignalsMovers }) {
  const movers = useMovers(initial, 20) ?? initial;
  const asOf = movers.date ? `As of ${formatShortDate(movers.date)} close.` : "At the latest close.";
  return (
    <div>
      <p className="mb-2 text-[11px] text-foreground-faint">Stock Condition changes: {asOf}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Largest Stock Condition increases">
          <MoverList rows={movers.up} />
        </Card>
        <Card title="Largest Stock Condition decreases">
          <MoverList rows={movers.down} />
        </Card>
      </div>
    </div>
  );
}
