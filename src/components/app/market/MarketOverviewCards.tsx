"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BarChart3, FileText, Newspaper, TrendingUp, Waves, type LucideIcon } from "lucide-react";

import { getMarketOverview } from "@/lib/api/endpoints";
import { LIVE_TAG, cardTags, type OverviewCardId } from "@/lib/market-overview";

const CARDS: { id: OverviewCardId; href: string; title: string; text: string; icon: LucideIcon }[] = [
  { id: "intraday", href: "/intraday", title: "Intraday", text: "The largest price moves before the open, during the session and after the close.", icon: Activity },
  { id: "pulse", href: "/pulse", title: "Market Pulse", text: "The index levels and how many stocks rose and fell.", icon: BarChart3 },
  { id: "activity", href: "/market-activity", title: "Market Activity", text: "Concalls, insider trades, corporate events and bulk or block deals.", icon: FileText },
  { id: "movers", href: "/gainers-losers", title: "Top Gainers & Losers", text: "The five largest price rises and the five largest falls of the session.", icon: TrendingUp },
  { id: "news", href: "/news", title: "News", text: "Headlines about NSE companies from the news sources RedixFi reads, with the source and time.", icon: Newspaper },
  { id: "volatility", href: "/volatility", title: "Volatility", text: "How much each stock's price has moved day to day lately, past movement only.", icon: Waves },
];

/**
 * Market Overview (18 Nov 2026): six cards, each a one-line description, a tag and a link to its own page. The page itself is static; the one
 * small read that dates the tags (the market status and its date) happens in the browser. "Live" is only ever shown on Intraday, only while the
 * market is open; every other tag is "As of <date> close".
 */
export function MarketOverviewCards() {
  const [tags, setTags] = useState<Record<OverviewCardId, string | null> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMarketOverview()
      .then((env) => {
        if (!cancelled) setTags(cardTags(env.data.market_state, env.data.as_of_date));
      })
      .catch(() => {
        /* the cards still work without a tag */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="market-overview-cards">
      {CARDS.map((c) => {
        const tag = tags?.[c.id] ?? null;
        return (
          <li key={c.id}>
            <Link href={c.href} data-testid={`market-card-${c.id}`} className="flex h-full min-h-[120px] flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent">
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-base font-semibold">
                  <c.icon size={18} className="shrink-0 text-accent" aria-hidden />
                  {c.title}
                </span>
                {tag && (
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tag === LIVE_TAG ? "bg-accent/15 text-accent" : "bg-neutral-bg text-foreground-muted"}`} data-testid={`market-tag-${c.id}`}>
                    {tag}
                  </span>
                )}
              </span>
              <span className="mt-2 text-sm leading-relaxed text-foreground-muted">{c.text}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
