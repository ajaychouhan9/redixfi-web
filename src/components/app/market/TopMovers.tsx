"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { DeltaValue } from "@/components/ui/DeltaValue";
import { getPriceMovers } from "@/lib/api/endpoints";
import type { PriceMoverRow, PriceMovers } from "@/lib/api/types";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { closeTag } from "@/lib/market-overview";
import { stockPath } from "@/lib/seo/stock-symbol";

function Rows({ rows, title }: { rows: PriceMoverRow[]; title: string }) {
  return (
    <div className="min-w-0 flex-1">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">{title}</h2>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {rows.map((r) => (
          <li key={r.symbol}>
            <Link href={stockPath("/stocks", r.symbol)} className="flex min-h-[52px] items-center justify-between gap-3 px-3 hover:bg-hover" data-testid="gainers-losers-row">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{displayName(r.name) || r.symbol}</span>
                <span className="block text-xs text-foreground-muted">{r.symbol}{typeof r.price === "number" ? ` · ₹${formatNumber(r.price, 2)}` : ""}</span>
              </span>
              <DeltaValue value={r.pct} kind="pct" />
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="px-3 py-3 text-sm text-foreground-faint">No stocks to list yet.</li>}
      </ul>
    </div>
  );
}

/**
 * Top Gainers & Losers (18 Nov 2026): the five largest price rises and the five largest falls among liquid stocks, from the existing price-movers
 * list. Loaded in the browser so the page is static. The tag is "As of <date> close" when the list is from a finished session; when the list
 * itself says it is from a time of day, that text is shown as it is.
 */
export function TopMovers() {
  const [data, setData] = useState<PriceMovers | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    // @auth-ok: the same list for every visitor (the Stock Condition that used to differ by plan was removed on 11 Nov 2026), loaded in the browser.
    getPriceMovers({ revalidate: 60 })
      .then((env) => !cancelled && setData(env.data))
      .catch(() => !cancelled && setData(null));
    return () => {
      cancelled = true;
    };
  }, []);
  const fromTime = !!data?.as_of_label && data.as_of_label.includes("IST");
  const tag = data ? (fromTime ? data.as_of_label : closeTag(data.date) ?? data.as_of_label) : null;
  return (
    <section className="space-y-3" data-testid="gainers-losers">
      {data === undefined && <p className="py-6 text-sm text-foreground-muted">Loading…</p>}
      {data === null && <p className="py-6 text-sm text-foreground-muted">Top gainers and losers are not available right now. Please try again in a minute.</p>}
      {data && (
        <>
          <p className="flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
            {tag && <span className="rounded-full bg-neutral-bg px-2.5 py-0.5 text-xs font-semibold text-foreground" data-testid="gainers-losers-tag">{tag}</span>}
            <span>{data.universe}</span>
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Rows rows={data.up} title="Top gainers" />
            <Rows rows={data.down} title="Top losers" />
          </div>
          <p className="text-xs text-foreground-muted">{data.note}</p>
          <p className="text-xs text-foreground-muted">Past record. Not a forecast or a recommendation.</p>
        </>
      )}
    </section>
  );
}
