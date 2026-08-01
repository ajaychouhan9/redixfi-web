import { getMarketOverview, getSignalMovers, getLatestBrief, getNews, getIntradaySession, getAnomalies } from "@/lib/api/endpoints";
import { MarketPulseCard } from "@/components/app/MarketPulseCard";
import { TopSignalChangesCard } from "@/components/app/TopSignalChangesCard";
import { AiDailyBriefCard } from "@/components/app/AiDailyBriefCard";
import { EventRiskCard } from "@/components/app/EventRiskCard";
import { IntradayNowCard } from "@/components/app/IntradayNowCard";
import { ContinueResearchCard } from "@/components/app/ContinueResearchCard";
import { AnomalyCard } from "@/components/app/AnomalyCard";

export default async function HomePage() {
  const [overviewR, moversR, briefR, newsR, sessionR, anomaliesR] = await Promise.allSettled([
    getMarketOverview(),
    getSignalMovers(undefined, 3),
    getLatestBrief(),
    getNews({ severity: "high", size: 3 }),
    getIntradaySession(),
    getAnomalies({ size: 50 }),
  ]);

  const overview = overviewR.status === "fulfilled" ? overviewR.value.data : null;
  const movers = moversR.status === "fulfilled" ? moversR.value.data : null;
  const brief = briefR.status === "fulfilled" ? briefR.value : null;
  const news = newsR.status === "fulfilled" ? newsR.value.data : [];
  const session = sessionR.status === "fulfilled" ? sessionR.value.data : null;
  const anomalies = anomaliesR.status === "fulfilled" ? anomaliesR.value : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Founder decision: AI Daily Brief is the strongest differentiator —
          moved to the top, above Market Pulse, so it's the first thing
          users see. */}
      <AiDailyBriefCard brief={brief} />
      <MarketPulseCard overview={overview} />
      <TopSignalChangesCard movers={movers} />
      <AnomalyCard results={anomalies?.data ?? []} scan={anomalies?.page_info.scan ?? null} />
      <EventRiskCard newsToday={overview?.news_today ?? null} items={news} />
      <IntradayNowCard session={session} />
      <ContinueResearchCard />
    </div>
  );
}
