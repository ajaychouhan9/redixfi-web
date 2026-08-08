import { getMarketOverview, getSignalMovers, getLatestBrief, getIntradaySession, getAnomalies, getNews } from "@/lib/api/endpoints";
import { MarketPulseCard } from "@/components/app/MarketPulseCard";
import { TopSignalChangesCard } from "@/components/app/TopSignalChangesCard";
import { AiDailyBriefCard } from "@/components/app/AiDailyBriefCard";
import { EventRiskCard } from "@/components/app/EventRiskCard";
import { IntradayNowCard } from "@/components/app/IntradayNowCard";
import { ContinueResearchCard } from "@/components/app/ContinueResearchCard";
import { AnomalyCard } from "@/components/app/AnomalyCard";
import { VisitorIntroStrip } from "@/components/app/VisitorIntroStrip";

// News IS fetched here now, but only ever with NO token — this is exactly
// the anonymous/free-tier feed (24h-delayed per B8) any logged-out visitor
// or crawler is entitled to see, so it's safe as SSR content. It's passed
// to EventRiskCard as `initialItems`; a real logged-in caller still gets
// corrected client-side with their own token (see that component's own
// docstring) — this fetch never sees a paid user's data, so it can't leak
// the mistake this pattern originally guarded against.
export default async function HomePage() {
  const [overviewR, moversR, briefR, sessionR, anomaliesR, newsR] = await Promise.allSettled([
    getMarketOverview(),
    getSignalMovers(undefined, 3),
    getLatestBrief(),
    getIntradaySession(),
    getAnomalies({ size: 50 }),
    // @auth-ok: SSR, always anonymous — see the module docstring above.
    // Corrected client-side by EventRiskCard once a real token resolves.
    getNews({ severity: "high", size: 3 }),
  ]);

  const overview = overviewR.status === "fulfilled" ? overviewR.value.data : null;
  const movers = moversR.status === "fulfilled" ? moversR.value.data : null;
  const brief = briefR.status === "fulfilled" ? briefR.value : null;
  const session = sessionR.status === "fulfilled" ? sessionR.value.data : null;
  const anomalies = anomaliesR.status === "fulfilled" ? anomaliesR.value : null;
  const newsItems = newsR.status === "fulfilled" ? newsR.value.data : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Server-rendered for every visitor by default (no session cookie in
          this app to branch on — see VisitorIntroStrip's own docstring for
          why that's the correct, non-cloaking default). Hides itself
          client-side once a REAL logged-in token resolves. */}
      <VisitorIntroStrip />

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
      <EventRiskCard newsToday={overview?.news_today ?? null} initialItems={newsItems} />
      <IntradayNowCard session={session} />
      <ContinueResearchCard />
    </div>
  );
}
