"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getIntradayTab } from "@/lib/api/endpoints";
import type { IntradayTabData } from "@/lib/api/types";
import { displayName } from "@/lib/company-name";
import { previewLabel, sideRows, type MoverSide } from "@/lib/home-movers";
import { stockPath } from "@/lib/seo/stock-symbol";
import { signedPct, toneOf } from "@/lib/stock-visual";

/**
 * The movers preview on Home (26 Nov 2026): five Intraday movers with two tabs, Gainers and Losers. Each row shows the company, its price and the
 * signed, coloured change. "See all" opens the Intraday page. The label is "Live" while the market is open and "As of <date> close" otherwise.
 * One small read in the browser after the page opens, so the page itself stays a cached static file. No data (loading, failed or empty) hides the card.
 */
export function HomeMovers() {
  const [data, setData] = useState<IntradayTabData | null | undefined>(undefined);
  const [side, setSide] = useState<MoverSide>("up");
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
  const up = sideRows(data, "up");
  const down = sideRows(data, "down");
  const label = previewLabel(data);
  if (data === undefined || data === null || (up.length === 0 && down.length === 0)) return null;
  const shownSide: MoverSide = side === "up" && up.length === 0 ? "down" : side === "down" && down.length === 0 ? "up" : side;
  const rows = shownSide === "up" ? up : down;
  const tab = (id: MoverSide, text: string, n: number) =>
    n === 0 ? null : (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={shownSide === id}
        onClick={() => setSide(id)}
        className={`min-h-[44px] flex-1 border-b-2 text-[15px] ${shownSide === id ? "border-accent font-bold text-foreground" : "border-transparent font-medium text-foreground-muted"}`}
        data-testid={`home-movers-tab-${id}`}
      >
        {text}
      </button>
    );
  return (
    <section className="min-w-0 max-w-full" aria-labelledby="home-movers-title" data-testid="home-movers">
      <div className="flex items-center justify-between gap-3">
        <h2 id="home-movers-title" className="text-[18px] font-bold">Intraday movers</h2>
        <Link href="/intraday" className="inline-flex min-h-[44px] items-center text-[13px] font-medium text-accent hover:underline" data-testid="home-movers-seeall">See all</Link>
      </div>
      {label && <p className="text-[12px] text-foreground-muted" data-testid="home-movers-asof">{label}</p>}
      <div role="tablist" aria-label="Gainers or losers" className="mt-1 flex border-b border-border">
        {tab("up", "Gainers", up.length)}
        {tab("down", "Losers", down.length)}
      </div>
      <ul className="divide-y divide-border" data-testid="home-movers-list">
        {rows.map((r) => {
          const tone = toneOf(r.change);
          return (
            <li key={r.symbol}>
              <Link href={stockPath("/stocks", r.symbol)} className="flex min-h-[56px] items-center justify-between gap-3 py-2" data-testid="home-mover-row">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-[15px] font-medium leading-snug">{displayName(r.name) || r.symbol}</span>
                  <span className="block text-[12px] text-foreground-muted">{r.symbol}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  {typeof r.price === "number" && <span className="block text-[15px] font-bold">₹{r.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                  <span className={`block text-[13px] font-bold ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground-muted"}`}>{signedPct(r.change)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-[12px] text-foreground-muted">Past record. Not a forecast or a recommendation.</p>
    </section>
  );
}
