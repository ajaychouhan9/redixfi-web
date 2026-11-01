"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { ConditionLabel } from "@/components/ui/ConditionLabel";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { ScValue } from "@/components/ui/ScValue";
import { Spark } from "@/components/app/review/Spark";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { stockPath } from "@/lib/seo/stock-symbol";

/** A column of a stock list. `mobile`: "main" sits on the right of the company name on a phone, "pair" goes in the small grid, "hide" is table-only. */
export interface Col<T> {
  id: string;
  header: ReactNode;
  mobileLabel?: string;
  mobile: "main" | "pair" | "hide";
  cell: (r: T) => ReactNode;
}

export function Price({ v }: { v: number | null | undefined }) {
  return <span className="tabular-nums">{v === null || v === undefined ? "-" : formatNumber(v, 2)}</span>;
}

export function Pct({ v }: { v: number | null | undefined }) {
  return <DeltaValue value={v} kind="pct" />;
}

/** Stock Condition cell: the number, or the usual lock for anonymous and free callers (prices and changes stay public). */
export function Condition({ sc, locked }: { sc: number | null; locked?: boolean }) {
  return <ScValue value={sc} locked={locked} className="text-foreground-muted" />;
}

export const conditionHeader = <ConditionLabel />;

function Links({ symbol, rewind }: { symbol: string; rewind: boolean }) {
  const cls = "inline-flex min-h-[44px] items-center text-xs font-medium text-foreground underline decoration-accent underline-offset-2 hover:decoration-2";
  return (
    <span className="flex flex-wrap gap-x-4">
      {rewind && (
        <Link href={`/rewind?symbol=${encodeURIComponent(symbol)}`} className={cls}>
          Open in Market Rewind
        </Link>
      )}
      <Link href={stockPath("/research", symbol)} className={cls}>
        Research page
      </Link>
    </span>
  );
}

/**
 * One list of stocks, as compact cards on a phone and a table from the md breakpoint. `spark` (optional) is a small intraday line.
 * Rows are shown in the order given; this component never sorts, counts or scores them.
 */
export function StockList<T extends { symbol: string; name: string | null }>({
  rows,
  cols,
  rewind = false,
  spark,
  testid,
  empty,
}: {
  rows: T[];
  cols: Col<T>[];
  rewind?: boolean;
  spark?: (r: T) => { values: number[]; tone: "up" | "down" | "neutral" };
  testid: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-sm text-foreground-muted" data-testid={`${testid}-empty`}>
        {empty}
      </p>
    );
  }
  const th = "px-2 py-2 text-left text-xs font-medium text-foreground-muted";
  const main = cols.find((c) => c.mobile === "main");
  const pairs = cols.filter((c) => c.mobile === "pair");
  return (
    <div data-testid={testid}>
      <ul className="divide-y divide-border md:hidden" data-testid={`${testid}-cards`}>
        {rows.map((r, i) => (
          <li key={r.symbol} className="py-3" data-testid="intraday-row">
            <div className="flex items-start justify-between gap-3">
              <Link href={stockPath("/signals", r.symbol)} className="flex min-h-[44px] min-w-0 flex-col justify-center">
                <span className="truncate text-sm font-semibold">
                  <span className="mr-1.5 text-xs font-normal text-foreground-muted">{i + 1}</span>
                  {displayName(r.name) || r.symbol}
                </span>
                <span className="text-xs text-foreground-muted">{r.symbol}</span>
              </Link>
              {main && <span className="shrink-0 pt-1 text-base">{main.cell(r)}</span>}
            </div>
            <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {pairs.map((c) => (
                <div key={c.id} className="flex justify-between gap-2">
                  <dt className="text-foreground-muted">{c.mobileLabel ?? c.header}</dt>
                  <dd className="text-right tabular-nums">{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-center justify-between gap-3">
              <Links symbol={r.symbol} rewind={rewind} />
              {spark && (() => {
                const s = spark(r);
                return <Spark values={s.values} label={`${r.symbol} price, 15-minute closes today`} tone={s.tone} />;
              })()}
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm" data-testid={`${testid}-table`}>
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Company</th>
              {cols.map((c) => (
                <th key={c.id} className={`${th} text-right`}>
                  {c.header}
                </th>
              ))}
              {spark && <th className={th}>Today</th>}
              <th className={th}>Links</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.symbol} className="border-b border-border last:border-0" data-testid="intraday-row">
                <td className="px-2 py-1.5">
                  <Link href={stockPath("/signals", r.symbol)} className="flex min-h-[44px] flex-col justify-center hover:text-foreground">
                    <span className="font-medium">
                      <span className="mr-1.5 text-xs font-normal text-foreground-muted">{i + 1}</span>
                      {displayName(r.name) || r.symbol}
                    </span>
                    <span className="text-xs text-foreground-muted">{r.symbol}</span>
                  </Link>
                </td>
                {cols.map((c) => (
                  <td key={c.id} className="px-2 py-1.5 text-right tabular-nums">
                    {c.cell(r)}
                  </td>
                ))}
                {spark && (
                  <td className="px-2 py-1.5">
                    {(() => {
                      const s = spark(r);
                      return <Spark values={s.values} label={`${r.symbol} price, 15-minute closes today`} tone={s.tone} />;
                    })()}
                  </td>
                )}
                <td className="px-2 py-1.5">
                  <Links symbol={r.symbol} rewind={rewind} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
