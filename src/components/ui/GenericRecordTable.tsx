import type { GenericRecord } from "@/lib/api/types";

/** Defensive cell formatter: never String()s an object directly — that
 * renders as literal "[object Object]" (found on corporate_events'
 * `meta` field, a real nested object per data-pipeline/corprate_event.py
 * — BUG 6, 2026-08-16). Arrays render as a comma-joined list (still
 * meaningful, e.g. deal_types_present on bulk_block_deals); plain
 * objects render as "—" since there's no single scalar to show. */
function safeGenericCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return "—";
  return String(value);
}

/** Renders whatever keys are actually present — used for collections whose live shape we couldn't verify (empty in every sampled symbol). */
export function GenericRecordTable({ rows, emptyText }: { rows: GenericRecord[]; emptyText: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-foreground-muted">{emptyText}</p>;
  }
  const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).slice(0, 6);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
          <tr>
            {columns.map((c) => (
              <th key={c} className="py-1.5 pr-3">
                {c.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {columns.map((c) => (
                <td key={c} className="py-1.5 pr-3">
                  {safeGenericCell(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
