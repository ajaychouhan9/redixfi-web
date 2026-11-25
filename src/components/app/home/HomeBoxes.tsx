"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, Compass, Activity, Sparkles, type LucideIcon } from "lucide-react";

import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";

const BOX = "flex min-h-[64px] flex-col justify-center rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-accent";

function Box({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <>
      <span className="flex items-center gap-2 text-[15px] font-bold">
        <Icon size={16} className="shrink-0 text-accent" aria-hidden />
        {title}
      </span>
      <span className="mt-0.5 text-[13px] leading-snug text-foreground-muted">{text}</span>
    </>
  );
}

/**
 * The five boxes on Home (17 Nov 2026): Shortlist Lab, Screener, Market Overview, 7-Day Review and Ask AI. Not Rewind: it is a tab of every stock page.
 * Neutral wording: each box says what is behind it, never what to do.
 */
export function HomeBoxes() {
  const { openPanel } = useAskPanel();
  return (
    <nav aria-label="Where to go next" className="grid grid-cols-2 gap-2 @min-[52rem]:grid-cols-5" data-testid="home-boxes">
      <Link href="/shortlist-lab" className={BOX} data-testid="home-box-start">
        <Box icon={Compass} title="Shortlist Lab" text="Set your own rules." />
      </Link>
      <Link href="/signals" className={BOX} data-testid="home-box-screener">
        <Box icon={BarChart3} title="Screener" text="Filter 2,000+ NSE stocks." />
      </Link>
      <Link href="/market" className={BOX} data-testid="home-box-market">
        <Box icon={Activity} title="Market Overview" text="Movers, pulse and activity." />
      </Link>
      <Link href="/signals/7-day-review" className={BOX} data-testid="home-box-review">
        <Box icon={CalendarDays} title="7-Day Review" text="The week in price and filings." />
      </Link>
      <button type="button" onClick={openPanel} className={BOX} data-testid="home-box-ask">
        <Box icon={Sparkles} title="Ask AI" text="Answers from filings." />
      </button>
    </nav>
  );
}
