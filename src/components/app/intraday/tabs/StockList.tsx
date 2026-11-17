"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { DeltaValue } from "@/components/ui/DeltaValue";
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

/**
 * One list of stocks, as compact cards on a phone and a table from the md breakpoint. A row is the company, the change, the price and the
 * volume; tapping it opens the stock page (corrected 18 Nov 2026: no per-row links and no chart column).
 * Rows are shown in the order given; this component never sorts, counts or scores them.
 */
export function StockList<T extends { symbol: string; name: string | null }>({
  rows,
  cols,
  testid,
  empty,
  rankOf,
}: {
  rows: T[];
  cols: Col<T>[];
  testid: string;
  empty: string;
  /** The number shown beside the name; default is the position in `rows`. A filtered list passes the row's position in the full list. */
  rankOf?: (r: T, index: number) => number;
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
          <li key={r.symbol} data-testid="intraday-row">
            <Link href={stockPath("/stocks", r.symbol)} className="block py-3 hover:bg-hover">
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-h-[44px] min-w-0 flex-col justify-center">
                  <span className="truncate text-sm font-semibold">
                    <span className="mr-1.5 text-xs font-normal text-foreground-muted">{rankOf ? rankOf(r, i) : i + 1}</span>
                    {displayName(r.name) || r.symbol}
                  </span>
                  <span className="text-xs text-foreground-muted">{r.symbol}</span>
                </span>
                {main && <span className="shrink-0 pt-1 text-base">{main.cell(r)}</span>}
              </span>
              <dl className="mt-1 grid grid-cols-1 gap-y-1 text-xs min-[420px]:grid-cols-2 min-[420px]:gap-x-4">
                {pairs.map((c) => (
                  <div key={c.id} className="flex justify-between gap-2">
                    <dt className="shrink-0 text-foreground-muted">{c.mobileLabel ?? c.header}</dt>
                    <dd className="text-right tabular-nums">{c.cell(r)}</dd>
                  </div>
                ))}
              </dl>
            </Link>
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
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.symbol} className="border-b border-border last:border-0" data-testid="intraday-row">
                <td className="px-2 py-1.5">
                  <Link href={stockPath("/stocks", r.symbol)} className="flex min-h-[44px] flex-col justify-center hover:text-foreground">
                    <span className="font-medium">
                      <span className="mr-1.5 text-xs font-normal text-foreground-muted">{rankOf ? rankOf(r, i) : i + 1}</span>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
