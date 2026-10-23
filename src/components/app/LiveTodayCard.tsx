"use client";

/**
 * "Live today" — the biggest live moves so far today, by today's % change against the previous close.
 * The number is the one the stock page shows for the live price (same 15-minute bars, same baseline).
 * Shown only while the market is open and the live feed is fresh; in every other state (pre-market, closing
 * data updating, closed, holiday, weekend, stale feed) it renders nothing, so no live wording or live number
 * can appear without a live feed. Every row carries the time of its price. Measured moves only.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { getLiveToday } from "@/lib/api/endpoints";
import { formatTimeIst } from "@/lib/format";
import { stockPath } from "@/lib/seo/stock-symbol";
import type { LiveToday, LiveTodayRow } from "@/lib/api/types";

function List({ rows, label, tone }: { rows: LiveTodayRow[]; label: string; tone: "up" | "down" }) {
  return (
    <div className="min-w-0 flex-1">
      <h3 className={`mb-2 font-mono text-[11px] uppercase tracking-wider ${tone === "up" ? "text-up" : "text-down"}`}>{label}</h3>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.symbol}>
            <Link href={stockPath("/signals", r.symbol)} className="block hover:text-accent" title={r.company_name ?? r.symbol}>
              <span className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.symbol}</span>
                <DeltaValue value={r.day_change_pct} kind="pct" className="shrink-0 text-sm" />
              </span>
              <span className="block text-[10px] text-foreground-faint">
                ₹{r.last_price.toLocaleString("en-IN", { maximumFractionDigits: 2 })} · {formatTimeIst(r.as_of)} IST
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-foreground-faint">None yet.</li>}
      </ul>
    </div>
  );
}

export function LiveTodayCard({ initial }: { initial: LiveToday | null }) {
  const [data, setData] = useState<LiveToday | null>(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await getLiveToday();
        if (alive) setData(r.data);
      } catch {
        /* keep what is shown until the next minute */
      }
    };
    void tick();
    const id = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!data || data.state !== "live" || !data.live_as_of) return null;
  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Zap size={14} className="text-accent" aria-hidden />
          Live today
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
            Live · {formatTimeIst(data.live_as_of)} IST
          </span>
        </span>
      }
      action={<Link href="/intraday" className="text-xs font-medium text-accent">Intraday →</Link>}
    >
      <div className="grid grid-cols-2 gap-x-6">
        <List rows={data.gainers} label="Up most" tone="up" />
        <List rows={data.decliners} label="Down most" tone="down" />
      </div>
      <p className="mt-3 text-[11px] leading-snug text-foreground-faint">
        Today&apos;s change so far against the previous close, from the latest 15-minute bars.
        {data.liquidity_rule ? ` Listed: ${data.liquidity_rule.charAt(0).toLowerCase()}${data.liquidity_rule.slice(1)}` : ""}{" "}
        {data.disclaimer ?? "Measured market data, not investment advice."}
      </p>
    </Card>
  );
}
