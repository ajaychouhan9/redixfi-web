import type { GenericRecord } from "@/lib/api/types";

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
                  {String(r[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
