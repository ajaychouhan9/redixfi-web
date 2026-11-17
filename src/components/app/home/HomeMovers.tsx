"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { DeltaValue } from "@/components/ui/DeltaValue";
import { getIntradayTab } from "@/lib/api/endpoints";
import type { IntradayTabData } from "@/lib/api/types";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { previewLabel, previewRows } from "@/lib/home-movers";
import { stockPath } from "@/lib/seo/stock-symbol";

/**
 * The movers preview on Home (corrected 18 Nov 2026): five Intraday movers (the largest moves of the Nifty 500 in the last Live scan, rises and
 * falls on the same footing), with "See all" to the Intraday page. The label is "Live" while the market is open and "As of <date> close"
 * otherwise. One small read in the browser after the page opens, so the page itself stays a cached static file.
 */
export function HomeMovers() {
  const [data, setData] = useState<IntradayTabData | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    // @auth-ok: the Live scan list is the same for every visitor (the Stock Condition that used to differ by plan was removed on 11 Nov 2026).
    getIntradayTab("scan")
      .then((env) => !cancelled && setData(env.data))
      .catch(() => !cancelled && setData(null));
    return () => {
      cancelled = true;
    };
  }, []);
  const rows = previewRows(data);
  const label = previewLabel(data);
  return (
    <section className="rounded-xl border border-border bg-surface-raised p-4" aria-labelledby="home-movers-title" data-testid="home-movers">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="home-movers-title" className="text-sm font-semibold">Intraday movers</h2>
        <Link href="/intraday" className="inline-flex min-h-[44px] items-center text-xs font-medium text-accent hover:underline" data-testid="home-movers-seeall">See all</Link>
      </div>
      {data === undefined && <p className="text-sm text-foreground-muted">Loading…</p>}
      {(data === null || (data && rows.length === 0)) && <p className="text-sm text-foreground-muted">The movers list is not available right now.</p>}
      {data && rows.length > 0 && (
        <>
          {label && <p className="mb-2 text-[11px] font-semibold text-foreground-muted" data-testid="home-movers-asof">{label}</p>}
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.symbol}>
                <Link href={stockPath("/stocks", r.symbol)} className="flex min-h-[48px] items-center justify-between gap-3 hover:text-accent" data-testid="home-mover-row">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{displayName(r.name) || r.symbol}</span>
                    <span className="block text-xs text-foreground-muted">{r.symbol}{typeof r.price === "number" ? ` · ₹${formatNumber(r.price, 2)}` : ""}</span>
                  </span>
                  <DeltaValue value={r.change} kind="pct" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-foreground-faint">Past record. Not a forecast or a recommendation.</p>
        </>
      )}
    </section>
  );
}
