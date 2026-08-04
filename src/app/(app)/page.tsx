import { getMarketOverview, getSignalMovers, getLatestBrief, getIntradaySession, getAnomalies } from "@/lib/api/endpoints";
import { MarketPulseCard } from "@/components/app/MarketPulseCard";
import { TopSignalChangesCard } from "@/components/app/TopSignalChangesCard";
import { AiDailyBriefCard } from "@/components/app/AiDailyBriefCard";
import { EventRiskCard } from "@/components/app/EventRiskCard";
import { IntradayNowCard } from "@/components/app/IntradayNowCard";
import { ContinueResearchCard } from "@/components/app/ContinueResearchCard";
import { AnomalyCard } from "@/components/app/AnomalyCard";

// News is deliberately NOT fetched here — see EventRiskCard's module
// docstring. This page is a Server Component with no access to the
// browser's auth token, and /news applies a 24h delay to anonymous
// callers; fetching it here would show that stale feed to every visitor,
// paid or not (the same "frontend forgot to attach the token" bug class
// already found twice on News/Events — fixed by moving this one fetch
// client-side instead of SSR-ing it anonymously).
export default async function HomePage() {
  const [overviewR, moversR, briefR, sessionR, anomaliesR] = await Promise.allSettled([
    getMarketOverview(),
    getSignalMovers(undefined, 3),
    getLatestBrief(),
    getIntradaySession(),
    getAnomalies({ size: 50 }),
  ]);

  const overview = overviewR.status === "fulfilled" ? overviewR.value.data : null;
  const movers = moversR.status === "fulfilled" ? moversR.value.data : null;
  const brief = briefR.status === "fulfilled" ? briefR.value : null;
  const session = sessionR.status === "fulfilled" ? sessionR.value.data : null;
  const anomalies = anomaliesR.status === "fulfilled" ? anomaliesR.value : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Founder decision: AI Daily Brief is the strongest differentiator —
          moved to the top, above Market Pulse, so it's the first thing
          users see. */}
      <AiDailyBriefCard brief={brief} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
        <div className="md:col-span-2">
          <MarketPulseCard overview={overview} />
        </div>
        <div className="md:col-span-3">
          <TopSignalChangesCard movers={movers} />
        </div>
      </div>

      <AnomalyCard results={anomalies?.data ?? []} scan={anomalies?.page_info.scan ?? null} />
      <EventRiskCard newsToday={overview?.news_today ?? null} />
      <IntradayNowCard session={session} />
      <ContinueResearchCard />
    </div>
  );
}
