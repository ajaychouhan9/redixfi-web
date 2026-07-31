import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSignalDetail, getChart, getResearch } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { SignalUnlockGate } from "@/components/app/signals/SignalUnlockGate";
import { SignalDetailView } from "@/components/app/signals/SignalDetailView";

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  return {
    title: `${symbol.toUpperCase()} Signal Score`,
    description: `Measured composite signal score, trend, delivery, sector standing and options positioning for ${symbol.toUpperCase()} — factual, not a prediction.`,
  };
}

export default async function SignalDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;

  let detail;
  try {
    detail = (await getSignalDetail(symbol)).data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  // Bug 2 fix: this SSR fetch has no way to read the browser's auth token
  // (Server Components can't reach localStorage), so `detail.locked` here
  // only ever reflects an ANONYMOUS request — correct for logged-out
  // visitors and search crawlers, but wrong for a real logged-in paid
  // subscriber. SignalUnlockGate (client) corrects this after hydration
  // when it's actually needed — see that file for the full writeup.
  if (detail.locked) {
    return <SignalUnlockGate symbol={symbol} initialDetail={detail} initialCandles={[]} />;
  }

  const [chartR, deliveryR] = await Promise.allSettled([
    getChart(symbol, { interval: "1d" }),
    getResearch(symbol),
  ]);
  const candles = chartR.status === "fulfilled" ? chartR.value.data.candles : [];
  const delivery30d = deliveryR.status === "fulfilled" ? deliveryR.value.data.delivery_30d : undefined;
  const fundamentals = deliveryR.status === "fulfilled" ? deliveryR.value.data.fundamentals : undefined;

  // Already unlocked for an anonymous request (a fixed top-N symbol, or
  // the caller's own watchlist) — renders directly, no client correction
  // needed, matches Task 14's "server-render everything that doesn't
  // genuinely need to be client-side" philosophy.
  return <SignalDetailView detail={detail} candles={candles} delivery30d={delivery30d} fundamentals={fundamentals} />;
}
