"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExplainTerm } from "@/components/ui/ExplainTerm";
import { compareExplainerCtx } from "@/lib/compare-explainer";
import type { CompareResult } from "@/lib/api/types";
import { stockPath } from "@/lib/seo/stock-symbol";
import { displayName, shortName } from "@/lib/company-name";

/** Task 13 — chat-style comparison result card, rendered under the screener
 * bar. Symmetric table (rows = metrics, columns = symbols in the user's own
 * typed order — never re-sorted/ranked), a code-computed "biggest
 * differences" summary, and honest handling of unresolved symbol names.
 * Rendered EVEN when the query was refused (task doc: "refuse the verdict,
 * serve the facts") — the refusal banner is a sibling in SmartScreenerBox,
 * not a gate on this component. */
export function CompareResultCard({ compare }: { compare: CompareResult }) {
  const { symbols, companies, unresolved, rows, biggest_differences } = compare;
  // sideways scrolling: the metric column stays put, the right edge fades while there is more to see, and a small hint says so
  const scrollRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [symbols.length, rows.length]);

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

          <div className="relative rounded-lg border border-border">
            {more && (
              <span className="pointer-events-none absolute right-2 top-1 z-20 rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-foreground-faint shadow-sm" data-testid="swipe-hint">
                Swipe →
              </span>
            )}
            {more && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 rounded-r-lg"
                style={{ background: "linear-gradient(to left, var(--surface-raised, var(--surface)), transparent)" }}
              />
            )}
          <div ref={scrollRef} className="overflow-x-auto rounded-lg">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                <tr>
                  <th className="sticky left-0 z-10 bg-surface px-3 py-2">Metric</th>
                  {symbols.map((sym) => (
                    <th key={sym} className="px-3 py-2">
                      <Link href={stockPath("/stocks", sym)} className="text-accent hover:underline">
                        {sym}
                      </Link>
                      {companies[sym]?.company_name && (
                        <span className="block max-w-[9rem] truncate text-[12px] font-normal normal-case text-foreground-faint" title={displayName(companies[sym].company_name)}>
                          {shortName(companies[sym].company_name)}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-border">
                    <td className="sticky left-0 z-10 bg-surface px-3 py-2 text-foreground-muted">{row.label}</td>
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
          </div>
        </>
      )}
    </div>
  );
}
