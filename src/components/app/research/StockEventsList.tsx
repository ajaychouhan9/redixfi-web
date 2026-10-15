import { formatDateIst } from "@/lib/format";
import type { GenericRecord } from "@/lib/api/types";

/** One stock's corporate events with plain names. Scheduled (future-dated)
 * rows carry a "Scheduled" label; recent rows stay neutral. */
export function StockEventsList({ rows, emptyText }: { rows: GenericRecord[]; emptyText: string }) {
  if (rows.length === 0) return <p className="text-sm text-foreground-muted">{emptyText}</p>;
  return (
    <ul className="divide-y divide-border text-sm">
      {rows.map((r, i) => {
        const label = typeof r.event_label === "string" && r.event_label ? r.event_label : "Corporate event";
        const headline = typeof r.headline === "string" ? r.headline : "";
        const date = r.event_date ? String(r.event_date) : "";
        return (
          <li key={i} className="py-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="whitespace-nowrap tabular-nums">{date ? formatDateIst(date) : "Date not available"}</span>
              <span className="font-medium">{label}</span>
              {r.scheduled === true && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                  Scheduled
                </span>
              )}
            </div>
            {headline && headline !== label && <p className="mt-0.5 break-words text-xs text-foreground-muted">{headline}</p>}
          </li>
        );
      })}
    </ul>
  );
}
