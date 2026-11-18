"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, Compass, Activity, Sparkles, type LucideIcon } from "lucide-react";

import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";

const BOX = "flex min-h-[96px] flex-col justify-between rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent";

function Box({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <>
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Icon size={16} className="shrink-0 text-accent" aria-hidden />
        {title}
      </span>
      <span className="mt-1 text-xs leading-relaxed text-foreground-muted">{text}</span>
    </>
  );
}

/**
 * The five boxes on Home (17 Nov 2026): Start here, Screener, Market Overview, 7-Day Review and Ask AI. Not Rewind: it is a tab of every stock page.
 * Neutral wording: each box says what is behind it, never what to do.
 */
export function HomeBoxes() {
  const { openPanel } = useAskPanel();
  return (
    <nav aria-label="Where to go next" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5" data-testid="home-boxes">
      <Link href="/stock-check" className={BOX} data-testid="home-box-start">
        <Box icon={Compass} title="New to stocks? Start the 15-minute check" text="Five steps to read a company, then build a shortlist with your own rules." />
      </Link>
      <Link href="/signals" className={BOX} data-testid="home-box-screener">
        <Box icon={BarChart3} title="Screener" text="Filter 2,000+ NSE stocks by the figures you choose." />
      </Link>
      <Link href="/market" className={BOX} data-testid="home-box-market">
        <Box icon={Activity} title="Market Overview" text="Intraday movers, market pulse, activity and top gainers and losers." />
      </Link>
      <Link href="/signals/7-day-review" className={BOX} data-testid="home-box-review">
        <Box icon={CalendarDays} title="7-Day Review" text="The week's price changes and what was filed." />
      </Link>
      <button type="button" onClick={openPanel} className={BOX} data-testid="home-box-ask">
        <Box icon={Sparkles} title="Ask AI" text="Ask about a company, answered from its own filings." />
      </button>
    </nav>
  );
}
