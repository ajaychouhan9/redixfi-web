import Link from "next/link";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { SignalStateChip } from "@/components/ui/Chip";
import type { SignalRow } from "@/lib/api/types";

export interface VisibleColumns {
  sector: boolean;
  delivery: boolean;
  chips: boolean;
  eventRisk: boolean;
}

export function SignalTableRow({ row, columns }: { row: SignalRow; columns: VisibleColumns }) {
  const locked = row.locked;
  return (
    <tr className="border-b border-border last:border-0 hover:bg-neutral-bg/50">
      <td className="whitespace-nowrap px-3 py-2">
        <Link href={`/signals/${row.symbol}`} className="font-medium hover:text-accent">
          {row.symbol}
        </Link>
        <div className="max-w-[16rem] truncate text-xs text-foreground-faint">{row.company_name}</div>
      </td>
      {columns.sector && <td className="px-3 py-2 text-xs text-foreground-muted">{row.sector}</td>}
      <td className="px-3 py-2 tabular-nums">
        {locked || row.composite_score === null ? (
          <LockedCell />
        ) : (
          <span className="font-semibold">{row.composite_score}</span>
        )}
      </td>
      <td className="px-3 py-2 tabular-nums">
        {locked || row.delta_1d === null ? <LockedCell /> : <DeltaValue value={row.delta_1d} />}
      </td>
      {columns.delivery && (
        <td className="px-3 py-2 text-xs tabular-nums">
          {locked || row.delivery_pct === null ? (
            <LockedCell />
          ) : (
            <>
              {row.delivery_pct}%{" "}
              <span className="text-foreground-faint">vs {row.delivery_avg20}%</span>
            </>
          )}
        </td>
      )}
      {columns.chips && (
        <td className="px-3 py-2">
          {!locked && (
            <div className="flex flex-wrap gap-1">
              {row.signal_states.slice(0, 2).map((s) => (
                <SignalStateChip key={s} code={s} />
              ))}
            </div>
          )}
        </td>
      )}
      {columns.eventRisk && (
        <td className="px-3 py-2 text-center">{row.event_risk ? <span title="Event risk">⚠️</span> : ""}</td>
      )}
    </tr>
  );
}

function LockedCell() {
  return (
    <span className="select-none text-foreground-faint" title="Unlock all 750 measured scores">
      🔒
    </span>
  );
}
