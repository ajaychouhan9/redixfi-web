import type { Metadata } from "next";
import Link from "next/link";
import { getMarketOverview, getSignalMovers, getLatestBrief, getIntradaySession, getAnomalies, getMarketState, getPriceMovers, getNews, getBillingPlans, getMarketActivitySummary } from "@/lib/api/endpoints";
import { MarketPulseCard } from "@/components/app/MarketPulseCard";
import { MarketStatusStrip } from "@/components/app/MarketStatusStrip";
import { PriceMoversCard } from "@/components/app/PriceMoversCard";
import { TopSignalChangesCard } from "@/components/app/TopSignalChangesCard";
import { AiDailyBriefCard } from "@/components/app/AiDailyBriefCard";
import { EventRiskCard } from "@/components/app/EventRiskCard";
import { IntradayNowCard } from "@/components/app/IntradayNowCard";
import { ContinueResearchCard } from "@/components/app/ContinueResearchCard";
import { AnomalyCard } from "@/components/app/AnomalyCard";
import { WatchlistAlertsCard } from "@/components/app/WatchlistAlertsCard";
import { MarketActivityCard } from "@/components/app/MarketActivityCard";
import { VisitorIntroStrip } from "@/components/app/VisitorIntroStrip";
import { HomeShortcutCard } from "@/components/app/HomeShortcutCard";
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
  const [overviewR, moversR, briefR, sessionR, anomaliesR, newsR, plansR, marketActivityR, marketStateR, priceMoversR] = await Promise.allSettled([
    getMarketOverview(),
    // @auth-ok: SSR, anonymous (Stock Condition locked outside the free sample); TopSignalChangesCard asks again with the token of a signed-in visitor.
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
    // @auth-ok: public — the market state is the same for every caller.
    getMarketState(),
    // @auth-ok: SSR, anonymous (Stock Condition locked outside the free sample); PriceMoversCard asks again with the token of a signed-in visitor.
    getPriceMovers(),
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
  const priceMovers = priceMoversR.status === "fulfilled" ? priceMoversR.value.data : null;

  return (
    // Widened from `mx-auto max-w-6xl` (2026-08-11): that cap centered a
    // 1152px column inside the flex-1 area next to the sidebar, leaving a
    // large unused gap on wide desktop viewports. The 3-column grid rows
    // below are unchanged — this only lets them use the real available
    // width up to the sidebar's edge on one side and the viewport edge on
    // the other, instead of floating centered with dead space either side.
    <div className="w-full max-w-[1800px] space-y-5">
      {/* Order (2 Nov 2026): market status and breadth, today's price movers, your stocks, the latest brief, Market Pulse, the Stock Condition
          changes, unusual activity, the news scan, Market Activity, the report promo. The visitor intro (anonymous only) stays on top; the
          marketing cards that only anonymous visitors see are below the report promo. */}
      <VisitorIntroStrip />
      <MarketStatusStrip overview={overview} session={session} marketState={marketState} />
      <PriceMoversCard initial={priceMovers} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <WatchlistAlertsCard />
        <ContinueResearchCard />
      </div>

      <AiDailyBriefCard brief={brief} />

      <MarketPulseCard overview={overview} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TopSignalChangesCard movers={movers} marketState={marketState} />
        <AnomalyCard compact results={anomalies?.data ?? []} scan={anomalies?.page_info.scan ?? null} marketState={marketState} />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <EventRiskCard newsToday={overview?.news_today ?? null} initialItems={newsItems} />
        <IntradayNowCard session={session} />
      </div>

      <MarketActivityCard summary={marketActivity} />

      <p className="text-center text-sm text-foreground-muted" data-testid="home-sample-report">
        New: company report PDFs with price, growth, peers, ownership, filings and sources.{" "}
        <Link href="/sample-report" className="font-medium text-accent hover:underline">
          See the free sample report
        </Link>
      </p>

      <HomeShortcutCard />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <GovernanceRadarCard />
        <AskAiTeaserCard />
      </div>
      <SmallCapPositioningStrip />

      <HomePricingSection plans={plans} />
    </div>
  );
}
