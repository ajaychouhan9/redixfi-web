"use client";

/**
 * The Today card on Home: the biggest moves of the current session, by today's % change against the previous close.
 *   - market open and the live feed fresh:  "Live today" with "Live · hh:mm IST"
 *   - after 15:30 until the day's score run completes: "Today's session · Market closed" with "Close · 3:30 pm IST"
 * The number is the one the stock page shows (same 15-minute bars or today's daily candle, same baseline). In every
 * other state (pre-market, closed and scored, holiday, weekend, stale feed) it renders nothing, so no live or close
 * number can appear without a feed behind it. Every row carries the time of its price. Measured moves only.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Moon } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { getLiveToday } from "@/lib/api/endpoints";
import { formatCloseOrBar, formatTimeIst } from "@/lib/format";
import { stockPath } from "@/lib/seo/stock-symbol";
import type { LiveToday, LiveTodayRow } from "@/lib/api/types";

function List({ rows, label, tone, closed }: { rows: LiveTodayRow[]; label: string; tone: "up" | "down"; closed: boolean }) {
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
                ₹{r.last_price.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ·{" "}
                {closed ? formatCloseOrBar(r.as_of) : `${formatTimeIst(r.as_of)} IST`}
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-foreground-faint">None.</li>}
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

  if (!data || !data.show_today_card || !data.card_as_of) return null;
  const closed = data.card_mode === "closed";
  const spikes = data.volume_spikes;
  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {closed ? <Moon size={14} className="text-accent" aria-hidden /> : <Zap size={14} className="text-accent" aria-hidden />}
          {closed ? "Today’s session · Market closed" : "Live today"}
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
            {closed ? formatCloseOrBar(data.card_as_of) : `Live · ${formatTimeIst(data.card_as_of)} IST`}
          </span>
        </span>
      }
      action={<Link href="/intraday" className="text-xs font-medium text-accent">Intraday →</Link>}
    >
      <div className="grid grid-cols-2 gap-x-6">
        <List rows={data.gainers} label="Up most" tone="up" closed={closed} />
        <List rows={data.decliners} label="Down most" tone="down" closed={closed} />
      </div>
      {typeof spikes === "number" && (
        <p className="mt-3 text-xs text-foreground-muted">
          <span className="font-medium text-foreground">{spikes}</span> {spikes === 1 ? "stock" : "stocks"} traded at{" "}
          {data.volume_multiple ?? 5}x or more of {spikes === 1 ? "its" : "their"} 20-day average volume {closed ? "today" : "so far today"}.
        </p>
      )}
      <p className="mt-2 text-[11px] leading-snug text-foreground-faint">
        {closed ? "Today’s final change" : "Today’s change so far"} against the previous close, from{" "}
        {closed ? "today’s last 15-minute bars" : "the latest 15-minute bars"}.
        {data.liquidity_rule ? ` Listed: ${data.liquidity_rule.charAt(0).toLowerCase()}${data.liquidity_rule.slice(1)}` : ""}{" "}
        {data.disclaimer ?? "Measured market data, not investment advice."}
      </p>
    </Card>
  );
}
