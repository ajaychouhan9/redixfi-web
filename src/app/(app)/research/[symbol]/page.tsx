import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChart, getResearch, getResearchPeers } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { ResearchViewGate } from "@/components/app/research/ResearchViewGate";

// Task 14 — SSR fix. This page was client-fetching everything (generic
// homepage meta + a permanent "Loading…" body in the raw server response,
// confirmed via direct fetch — see docs/14_TASK_RESEARCH_SSR_FIX.md) while
// app/(app)/signals/[symbol]/page.tsx, same codebase, already did this
// correctly: async server component + generateMetadata + server-side data
// fetching. This file copies that exact pattern.
//
// ISR revalidate matches the backend's own /research/{symbol} cache TTL
// (api/app/routers/research.py: cache.get_or_set(..., 900, ...)) — no
// point revalidating the Next-side cache more often than the origin data
// actually refreshes.
export const revalidate = 900;

async function loadResearch(symbol: string) {
  try {
    // @auth-ok: SSR + ISR-cached (revalidate: 900) — a token could not be
    // attached here even if we wanted to (Server Components can't reach
    // localStorage, AND this response is a SHARED cache entry across every
    // visitor for 15 minutes, so a personal token would be a genuine
    // privacy bug, not just an omission). getResearch's only tier-
    // dependent behavior is the free-tier 3/day view metering counter
    // (not masking — every tier gets the identical payload), which is why
    // this being anonymous is architecturally fine on its own — the fix
    // (2026-08-08) is ResearchViewGate below firing the metering side
    // effect client-side, same SignalUnlockGate-style correction-after-
    // SSR pattern, via the new lightweight POST /research/{symbol}/view.
    return (await getResearch(symbol, { revalidate: 900 })).data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const data = await loadResearch(symbol.toUpperCase());
  if (!data) return { title: `${symbol.toUpperCase()} not found` };
  return {
    title: `${data.symbol} Research`,
    description: `Company profile, delivery trend, insider activity, pledge history, fundamentals and peer comparison for ${data.company_name} (${data.symbol}) — not investment advice.`,
  };
}

export default async function ResearchDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();

  const data = await loadResearch(sym);
  if (!data) notFound();

  // Same resilience pattern as the Signals reference implementation
  // (Promise.allSettled + graceful per-source fallback) — a chart or
  // peers hiccup must not take down the whole page.
  const [chartR, peersR] = await Promise.allSettled([
    getChart(sym, { interval: "1d" }, { revalidate: 900 }),
    getResearchPeers(sym, { revalidate: 900 }),
  ]);
  const dailyCandles = chartR.status === "fulfilled" ? chartR.value.data.candles : [];
  const peers = peersR.status === "fulfilled" ? peersR.value.data.peers : null;
  const peersError = peersR.status === "rejected";

  return (
    <div className="mx-auto max-w-3xl">
      <ResearchViewGate data={data} dailyCandles={dailyCandles} peers={peers} peersError={peersError} />
    </div>
  );
}
