import { getMarketOverview, getSignalMovers, getLatestBrief, getIntradaySession, getAnomalies, getNews, getBillingPlans } from "@/lib/api/endpoints";
import { MarketPulseCard } from "@/components/app/MarketPulseCard";
import { TopSignalChangesCard } from "@/components/app/TopSignalChangesCard";
import { AiDailyBriefCard } from "@/components/app/AiDailyBriefCard";
import { EventRiskCard } from "@/components/app/EventRiskCard";
import { IntradayNowCard } from "@/components/app/IntradayNowCard";
import { ContinueResearchCard } from "@/components/app/ContinueResearchCard";
import { AnomalyCard } from "@/components/app/AnomalyCard";
import { WatchlistAlertsCard } from "@/components/app/WatchlistAlertsCard";
import { VisitorIntroStrip } from "@/components/app/VisitorIntroStrip";
import { HomePricingSection } from "@/components/app/HomePricingSection";

// News IS fetched here now, but only ever with NO token — this is exactly
// the anonymous/free-tier feed (24h-delayed per B8) any logged-out visitor
// or crawler is entitled to see, so it's safe as SSR content. It's passed
// to EventRiskCard as `initialItems`; a real logged-in caller still gets
// corrected client-side with their own token (see that component's own
// docstring) — this fetch never sees a paid user's data, so it can't leak
// the mistake this pattern originally guarded against.
export default async function HomePage() {
  const [overviewR, moversR, briefR, sessionR, anomaliesR, newsR, plansR] = await Promise.allSettled([
    getMarketOverview(),
    getSignalMovers(undefined, 3),
    getLatestBrief(),
    getIntradaySession(),
    getAnomalies({ size: 50 }),
    // @auth-ok: SSR, always anonymous — see the module docstring above.
    // Corrected client-side by EventRiskCard once a real token resolves.
    getNews({ severity: "high", size: 3 }),
    // @auth-ok: public — billing/plans has no auth dependency at all
    // (same fetch /pricing's own page.tsx already makes server-side).
    getBillingPlans(),
  ]);

  const overview = overviewR.status === "fulfilled" ? overviewR.value.data : null;
  const movers = moversR.status === "fulfilled" ? moversR.value.data : null;
  const brief = briefR.status === "fulfilled" ? briefR.value : null;
  const session = sessionR.status === "fulfilled" ? sessionR.value.data : null;
  const anomalies = anomaliesR.status === "fulfilled" ? anomaliesR.value : null;
  const newsItems = newsR.status === "fulfilled" ? newsR.value.data : null;
  const plans = plansR.status === "fulfilled" ? plansR.value.data : [];

  return (
    // Widened from `mx-auto max-w-6xl` (2026-08-11): that cap centered a
    // 1152px column inside the flex-1 area next to the sidebar, leaving a
    // large unused gap on wide desktop viewports. The 3-column grid rows
    // below are unchanged — this only lets them use the real available
    // width up to the sidebar's edge on one side and the viewport edge on
    // the other, instead of floating centered with dead space either side.
    <div className="w-full max-w-[1800px] space-y-5">
      {/* Server-rendered for every visitor by default (no session cookie in
          this app to branch on — see VisitorIntroStrip's own docstring for
          why that's the correct, non-cloaking default). Hides itself
          client-side once a REAL logged-in token resolves. */}
      <VisitorIntroStrip />

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

      {/* Row 2 — Top Signal Changes / Unusual Activity / Event Risk, 3-across
          desktop, 2-up tablet, 1 column mobile. Unusual Activity is the
          compact (tiles + counts only, no expanded stock lists) variant —
          the full per-stock breakdown lives on /unusual-activity. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <TopSignalChangesCard movers={movers} />
        <AnomalyCard compact results={anomalies?.data ?? []} scan={anomalies?.page_info.scan ?? null} />
        <EventRiskCard newsToday={overview?.news_today ?? null} initialItems={newsItems} />
      </div>

      {/* Row 3 — Intraday / Continue Research / Watchlist Alerts, same
          3-across/2-up/1-col responsive pattern. The latter two are
          client components that render nothing when there's no real data
          (no recently-viewed stocks, no logged-in user, no alerts) — the
          grid reflows naturally around whichever of the three are present. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <IntradayNowCard session={session} />
        <ContinueResearchCard />
        <WatchlistAlertsCard />
      </div>

      <HomePricingSection plans={plans} />
    </div>
  );
}
