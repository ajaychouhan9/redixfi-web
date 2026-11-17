"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { DeltaValue } from "@/components/ui/DeltaValue";
import { getPriceMovers } from "@/lib/api/endpoints";
import type { PriceMoverRow, PriceMovers } from "@/lib/api/types";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { stockPath } from "@/lib/seo/stock-symbol";

function Rows({ rows, title }: { rows: PriceMoverRow[]; title: string }) {
  return (
    <div className="min-w-0 flex-1">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">{title}</h3>
      <ul className="space-y-1">
        {rows.slice(0, 5).map((r) => (
          <li key={r.symbol}>
            <Link href={stockPath("/stocks", r.symbol)} className="block min-h-[44px] hover:text-accent" data-testid="home-mover-row">
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium">{displayName(r.name) || r.symbol}</span>
                <DeltaValue value={r.pct} kind="pct" />
              </span>
              <span className="text-xs text-foreground-muted">{r.symbol}{typeof r.price === "number" ? ` · ₹${formatNumber(r.price, 2)}` : ""}</span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-foreground-faint">No stocks to list yet.</li>}
      </ul>
    </div>
  );
}

/** The movers preview on Home: five price rises and five falls, side by side with the same weight, dated. Loaded in the browser. */
export function HomeMovers() {
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
  return (
    <section className="rounded-xl border border-border bg-surface-raised p-4" aria-labelledby="home-movers-title" data-testid="home-movers">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="home-movers-title" className="text-sm font-semibold">Price movers</h2>
        <Link href="/market" className="text-xs font-medium text-accent hover:underline">See all on Market today</Link>
      </div>
      {data === undefined && <p className="text-sm text-foreground-muted">Loading…</p>}
      {data === null && <p className="text-sm text-foreground-muted">Price movers are not available right now.</p>}
      {data && (
        <>
          <p className="mb-2 text-[11px] text-foreground-faint" data-testid="home-movers-asof">{data.as_of_label} · {data.universe}</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Rows rows={data.up} title="Largest price rises" />
            <Rows rows={data.down} title="Largest price falls" />
          </div>
          <p className="mt-3 text-[11px] text-foreground-faint">{data.note}</p>
        </>
      )}
    </section>
  );
}
