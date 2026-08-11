import type { Metadata } from "next";
import { IntradayScreen } from "@/components/app/intraday/IntradayScreen";
import { getIntradaySession, getIntradaySectors, getIntradayRecap } from "@/lib/api/endpoints";
import type { IntradaySession, IntradaySectors, IntradayRecap } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Intraday Monitor",
  description: "Pre-market movers, a live user-filtered scanner, AI-classified event feed and post-market recap — factual, not trade calls.",
};

// Task 14 (secondary item) — the pre/post-market session states are
// knowable server-side at request time; only the "currently live" state
// needs client-side polling (task doc's own scoping). No revalidate/ISR
// here — intraday session state is genuinely time-of-day-dependent and
// must stay always-fresh per request, same reasoning already applied to
// app/(app)/signals/[symbol]/page.tsx's plain (no-revalidate) fetches.
export default async function IntradayPage() {
  let session: IntradaySession | null = null;
  try {
    session = (await getIntradaySession()).data;
  } catch {
    session = null;
  }

  let sectors: IntradaySectors | null = null;
  let recap: IntradayRecap | null = null;
  if (session?.state === "premarket") {
    try {
      sectors = (await getIntradaySectors()).data;
    } catch {
      sectors = null;
    }
  } else if (session?.state === "postmarket") {
    recap = await getIntradayRecap().catch(() => null);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Intraday Monitor</h1>
      <IntradayScreen initialSession={session} initialSectors={sectors} initialRecap={recap} />
    </div>
  );
}
