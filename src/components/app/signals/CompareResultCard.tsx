"use client";

import Link from "next/link";
import { ExplainTerm } from "@/components/ui/ExplainTerm";
import { compareExplainerCtx } from "@/lib/compare-explainer";
import type { CompareResult } from "@/lib/api/types";

/** Task 13 — chat-style comparison result card, rendered under the screener
 * bar. Symmetric table (rows = metrics, columns = symbols in the user's own
 * typed order — never re-sorted/ranked), a code-computed "biggest
 * differences" summary, and honest handling of unresolved symbol names.
 * Rendered EVEN when the query was refused (task doc: "refuse the verdict,
 * serve the facts") — the refusal banner is a sibling in SmartScreenerBox,
 * not a gate on this component. */
export function CompareResultCard({ compare }: { compare: CompareResult }) {
  const { symbols, companies, unresolved, rows, biggest_differences } = compare;

  return (
    <div className="mt-3 space-y-3">
      {unresolved.length > 0 && (
        <div className="rounded-lg bg-amber-bg px-3 py-2 text-sm text-amber">
          {unresolved.map((u) => (
            <p key={u.input}>
              Couldn&apos;t find &ldquo;{u.input}&rdquo;
              {u.suggestions.length > 0 ? <> — did you mean {u.suggestions.join(", ")}?</> : "."}
            </p>
          ))}
        </div>
      )}

      {symbols.length === 0 ? (
        <p className="text-sm text-foreground-muted">No stocks could be resolved to compare.</p>
      ) : (
        <>
          {biggest_differences.length > 0 && (
            <div className="rounded-lg border border-border bg-surface-raised p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                Biggest differences
              </p>
              <ul className="space-y-1 text-sm">
                {biggest_differences.map((d) => (
                  <li key={d.key}>
                    <span className="text-foreground-muted">{d.label}:</span> {d.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                <tr>
                  <th className="px-3 py-2">Metric</th>
                  {symbols.map((sym) => (
                    <th key={sym} className="px-3 py-2">
                      <Link href={`/stocks/${sym}`} className="text-accent hover:underline">
                        {sym}
                      </Link>
                      {companies[sym]?.company_name && (
                        <span className="block text-[11px] font-normal normal-case text-foreground-faint">
                          {companies[sym].company_name}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground-muted">{row.label}</td>
                    {symbols.map((sym) => {
                      const locked = row.layer === "measured" && companies[sym]?.locked;
                      const value = row.values[sym];
                      if (locked && value === "Not available") {
                        return (
                          <td key={sym} className="px-3 py-2">
                            <Link href="/pricing" className="text-xs font-medium text-accent hover:underline">
                              Upgrade to see
                            </Link>
                          </td>
                        );
                      }
                      return (
                        <td key={sym} className="px-3 py-2">
                          {value === "Not available" ? (
                            <span className="text-foreground-faint">Not available</span>
                          ) : (
                            <ExplainTerm metricKey={row.metric_key} symbol={sym} ctx={compareExplainerCtx(row, sym)}>
                              {value}
                            </ExplainTerm>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
