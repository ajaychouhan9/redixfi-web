import type { Metadata } from "next";
import Link from "next/link";
import { getMarketOverview, getSignalMovers, getLatestBrief, getIntradaySession, getAnomalies, getMarketState, getLiveToday, getNews, getBillingPlans, getMarketActivitySummary } from "@/lib/api/endpoints";
import { MarketPulseCard } from "@/components/app/MarketPulseCard";
import { LiveTodayCard } from "@/components/app/LiveTodayCard";
import { TopSignalChangesCard } from "@/components/app/TopSignalChangesCard";
import { AiDailyBriefCard } from "@/components/app/AiDailyBriefCard";
import { EventRiskCard } from "@/components/app/EventRiskCard";
import { IntradayNowCard } from "@/components/app/IntradayNowCard";
import { ContinueResearchCard } from "@/components/app/ContinueResearchCard";
import { AnomalyCard } from "@/components/app/AnomalyCard";
import { WatchlistAlertsCard } from "@/components/app/WatchlistAlertsCard";
import { MarketActivityCard } from "@/components/app/MarketActivityCard";
import { VisitorIntroStrip } from "@/components/app/VisitorIntroStrip";
import { HomePricingSection } from "@/components/app/HomePricingSection";
import { GovernanceRadarCard } from "@/components/app/marketing/GovernanceRadarCard";
import { AskAiTeaserCard } from "@/components/app/marketing/AskAiTeaserCard";
import { SmallCapPositioningStrip } from "@/components/app/marketing/SmallCapPositioningStrip";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// News IS fetched here now, but only ever with NO token — this is exactly
// the anonymous/free-tier feed (24h-delayed per B8) any logged-out visitor
// or crawler is entitled to see, so it's safe as SSR content. It's passed
// to EventRiskCard as `initialItems`; a real logged-in caller still gets
// corrected client-side with their own token (see that component's own
// docstring) — this fetch never sees a paid user's data, so it can't leak
// the mistake this pattern originally guarded against.
export default async function HomePage() {
  const [overviewR, moversR, briefR, sessionR, anomaliesR, newsR, plansR, marketActivityR, marketStateR, liveTodayR] = await Promise.allSettled([
    getMarketOverview(),
    getSignalMovers(undefined, 3),
    getLatestBrief(),
    getIntradaySession(),
    getAnomalies({ size: 200 }),
    // @auth-ok: SSR, always anonymous — see the module docstring above.
    // Corrected client-side by EventRiskCard once a real token resolves.
    getNews({ severity: "high", size: 3 }),
    // @auth-ok: public — billing/plans has no auth dependency at all
    // (same fetch /pricing's own page.tsx already makes server-side).
    getBillingPlans(),
    // @auth-ok: public — market_activity_summary()'s rollup counts are
    // identical for every tier (no B8 masking on these 4 data types).
    getMarketActivitySummary(),
    // @auth-ok: public — the market state and the live-today list are the same for every caller.
    getMarketState(),
    getLiveToday(),
  ]);

  const overview = overviewR.status === "fulfilled" ? overviewR.value.data : null;
  const movers = moversR.status === "fulfilled" ? moversR.value.data : null;
  const brief = briefR.status === "fulfilled" ? briefR.value : null;
  const session = sessionR.status === "fulfilled" ? sessionR.value.data : null;
  const anomalies = anomaliesR.status === "fulfilled" ? anomaliesR.value : null;
  const newsItems = newsR.status === "fulfilled" ? newsR.value.data : null;
  const plans = plansR.status === "fulfilled" ? plansR.value.data : [];
  const marketActivity = marketActivityR.status === "fulfilled" ? marketActivityR.value.data : null;
  const marketState = marketStateR.status === "fulfilled" ? marketStateR.value.data : null;
  const liveToday = liveTodayR.status === "fulfilled" ? liveTodayR.value.data : null;

  return (
    // Widened from `mx-auto max-w-6xl` (2026-08-11): that cap centered a
    // 1152px column inside the flex-1 area next to the sidebar, leaving a
    // large unused gap on wide desktop viewports. The 3-column grid rows
    // below are unchanged — this only lets them use the real available
    // width up to the sidebar's edge on one side and the viewport edge on
    // the other, instead of floating centered with dead space either side.
    <div className="w-full max-w-[1800px] space-y-5">
      {/* Live today: only while the market is open and the live feed is fresh (renders nothing otherwise). The
          end-of-day cards further down are labelled with their own session date. */}
      <LiveTodayCard initial={liveToday} />
      {/* Server-rendered for every visitor by default (no session cookie in
          this app to branch on — see VisitorIntroStrip's own docstring for
          why that's the correct, non-cloaking default). Hides itself
          client-side once a REAL logged-in token resolves. */}
      <VisitorIntroStrip />

      {/* Governance/Ask AI preview + small-cap positioning — anonymous
          visitors only (each self-gates on `user`, same pattern as
          VisitorIntroStrip). Sits above the real live dashboard rows below
          so a first-time visitor sees the two AI features named in the
          hero (document summaries, governance radar) demonstrated with
          real, already-generated output before scrolling into live data. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <GovernanceRadarCard />
        <AskAiTeaserCard />
      </div>
      <SmallCapPositioningStrip />

      {/* Row 1 — AI Daily Brief (wider) + Market Pulse. Founder decision:
          the Brief is the strongest differentiator, so it leads. 1 column
          mobile, even 2-up tablet, 60/40 desktop. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AiDailyBriefCard brief={brief} />
        </div>
        <div className="lg:col-span-2">
          <MarketPulseCard overview={overview} />
        </div>
      </div>

      {/* Rows 2 and 3 as one masonry flow (2026-10-25): the cards have different heights, and a plain grid left empty
          gaps under the shorter ones (under Top Signal Changes and Intraday now). CSS columns pack them top to bottom,
          3 across on desktop, 2 on tablet, 1 on mobile. A client card that renders nothing leaves an empty wrapper,
          which is hidden (empty:hidden) so it cannot leave a gap either. Unusual Activity is the compact variant (the
          full per-stock breakdown lives on /unusual-activity); Market Activity is the rollup with one "View all" link. */}
      <div className="columns-1 gap-5 md:columns-2 lg:columns-3">
        <div className="mb-5 break-inside-avoid empty:hidden">
          <TopSignalChangesCard movers={movers} marketState={marketState} />
        </div>
        <div className="mb-5 break-inside-avoid empty:hidden">
          <AnomalyCard compact results={anomalies?.data ?? []} scan={anomalies?.page_info.scan ?? null} marketState={marketState} />
        </div>
        <div className="mb-5 break-inside-avoid empty:hidden">
          <EventRiskCard newsToday={overview?.news_today ?? null} initialItems={newsItems} />
        </div>
        <div className="mb-5 break-inside-avoid empty:hidden">
          <IntradayNowCard session={session} />
        </div>
        <div className="mb-5 break-inside-avoid empty:hidden">
          <ContinueResearchCard />
        </div>
        <div className="mb-5 break-inside-avoid empty:hidden">
          <WatchlistAlertsCard />
        </div>
        <div className="mb-5 break-inside-avoid empty:hidden">
          <MarketActivityCard summary={marketActivity} />
        </div>
      </div>

      <p className="text-center text-sm text-foreground-muted" data-testid="home-sample-report">
        New: company report PDFs with price, growth, peers, ownership, filings and sources.{" "}
        <Link href="/sample-report" className="font-medium text-accent hover:underline">
          See the free sample report
        </Link>
      </p>

      <HomePricingSection plans={plans} />
    </div>
  );
}
