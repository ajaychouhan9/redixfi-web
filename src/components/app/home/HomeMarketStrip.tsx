"use client";

import { useEffect, useState } from "react";

import { getMarketOverview } from "@/lib/api/endpoints";
import type { MarketOverview } from "@/lib/api/types";
import { stripAsOf } from "@/lib/home-market";
import { toneOf, signedPct } from "@/lib/stock-visual";

function Idx({ name, close, pct }: { name: string; close: number; pct: number | null }) {
  const tone = toneOf(pct);
  const p = signedPct(pct);
  return (
    <div className="min-w-0 flex-1" data-testid={`strip-${name.replace(/\s+/g, "-").toLowerCase()}`}>
      <p className="text-[13px] text-foreground-muted">{name}</p>
      <p className="text-[16px] font-bold tabular-nums">{close.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      {p && <p className={`text-[13px] font-bold tabular-nums ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground-muted"}`}>{p}</p>}
    </div>
  );
}

/** Nifty 50 and Nifty Bank under the Home search: value, signed coloured change and the time. An index that is not stored is left out; no data hides the strip. */
export function HomeMarketStrip() {
  const [o, setO] = useState<MarketOverview | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    // @auth-ok: the index snapshot is the same for every visitor.
    getMarketOverview({ revalidate: 300 }).then((env) => !cancelled && setO(env.data)).catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);
  const ok = (q: MarketOverview["nifty"] | null | undefined) => !!q && typeof q.close === "number" && Number.isFinite(q.close);
  // while the figures load the strip keeps its height, so the cards below do not jump (layout shift); with no data it is gone
  if (!o && !failed) return <div className="h-[112px] border-y border-border" aria-hidden data-testid="home-market-strip-loading" />;
  if (!o || (!ok(o.nifty) && !ok(o.banknifty))) return null;
  const asOf = stripAsOf(o);
  return (
    <section aria-label="Market today" className="border-y border-border py-3" data-testid="home-market-strip">
      <div className="flex gap-6">
        {ok(o.nifty) && <Idx name="Nifty 50" close={o.nifty.close} pct={Number.isFinite(o.nifty.change_pct) ? o.nifty.change_pct : null} />}
        {ok(o.banknifty) && <Idx name="Nifty Bank" close={o.banknifty.close} pct={Number.isFinite(o.banknifty.change_pct) ? o.banknifty.change_pct : null} />}
      </div>
      {asOf && <p className="mt-1.5 text-[12px] text-foreground-muted" data-testid="home-strip-asof">{asOf}</p>}
    </section>
  );
}
