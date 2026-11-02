"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { SignalsMovers, MoverRow } from "@/lib/api/types";
import { ShareCardPopover } from "@/components/app/marketing/ShareCardPopover";
import { SessionLabel } from "@/components/app/SessionLabel";
import type { MarketState } from "@/lib/api/types";
import { stockPath } from "@/lib/seo/stock-symbol";
import { displayName } from "@/lib/company-name";
import { formatShortDate } from "@/lib/format";
import { ProLock } from "@/components/ui/ScValue";
import { useMovers } from "@/components/app/useMovers";

function MoverList({ rows, label, tone }: { rows: MoverRow[]; label: string; tone: "up" | "down" }) {
  const Icon = tone === "up" ? TrendingUp : TrendingDown;
  return (
    <div className="flex-1">
      <h3 className={`mb-2 font-mono text-[11px] uppercase tracking-wider ${tone === "up" ? "text-up" : "text-down"}`}>{label}</h3>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.symbol}>
            <Link href={stockPath("/signals", r.symbol)} className="flex items-center justify-between text-sm hover:text-accent">
              <span className="min-w-0 truncate">
                <span className="font-medium">{displayName(r.company_name) || r.symbol}</span>
                <span className="block text-[11px] text-foreground-muted">
                  {r.symbol}
                  {typeof r.day_change_pct === "number" && <> · price {r.day_change_pct > 0 ? "+" : ""}{r.day_change_pct.toFixed(1)}%</>}
                </span>
              </span>
              {r.sc_locked || r.delta_1d === null ? (
                <ProLock />
              ) : (
                <span className={`flex items-center gap-0.5 font-mono text-sm ${tone === "up" ? "text-up" : "text-down"}`}>
                  <Icon size={11} /> {r.delta_1d > 0 ? "+" : ""}
                  {r.delta_1d}
                </span>
              )}
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-foreground-faint">No Stock Condition changes for this session.</li>}
      </ul>
    </div>
  );
}

export function TopSignalChangesCard({ movers: initial, marketState }: { movers: SignalsMovers | null; marketState?: MarketState | null }) {
  const movers = useMovers(initial, 3);
  // a share card never carries a Stock Condition change the viewer may not see
  const topGainer = movers?.up[0] && !movers.up[0].sc_locked ? movers.up[0] : undefined;
  const topDecliner = movers?.down[0] && !movers.down[0].sc_locked ? movers.down[0] : undefined;
  const shareStat = topGainer ? `${topGainer.symbol} +${topGainer.delta_1d}` : undefined;
  // Sep 2026 fix: was a static "Top Signal Changes" with no date, which is
  // wrong on weekends/holidays/before the day's measured_signals run —
  // signal_movers() now returns the real observation date.
  // Live-vs-end-of-day fix (Oct 2026): the session date is a "Last session · <date>" label inside the card.
  const title = "Biggest Stock Condition changes";
  return (
    <Card
      title={title}
      action={
        <div className="flex items-center gap-2">
          <ShareCardPopover
            card={{
              type: "movers",
              title: "Biggest Stock Condition changes",
              subtitle: "Biggest measured Stock Condition changes at the last close",
              stat: shareStat,
              statLabel: topDecliner ? `Largest reading decrease: ${topDecliner.symbol} ${topDecliner.delta_1d}` : undefined,
              direction: "up",
            }}
          />
          <Link href="/signals/movers" className="flex items-center gap-0.5 text-xs font-medium text-accent">
            See all <ChevronRight size={12} />
          </Link>
        </div>
      }
    >
      <SessionLabel dataDate={movers?.date} initial={marketState} />
      <p className="mb-2 text-[11px] text-foreground-faint" data-testid="sc-changes-note">
        Points are the change in the 0-100 Stock Condition value{movers?.date ? ` · As of ${formatShortDate(movers.date)} close` : ""}. Liquid stocks with a full reading only.
      </p>
      <div className="grid grid-cols-2 gap-x-6">
        <MoverList rows={movers?.up.slice(0, 3) ?? []} label="Largest increase" tone="up" />
        <MoverList rows={movers?.down.slice(0, 3) ?? []} label="Largest decrease" tone="down" />
      </div>
    </Card>
  );
}
