import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSignalDetail, getChart, getResearch } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { SignalUnlockGate } from "@/components/app/signals/SignalUnlockGate";
import { SignalDetailView } from "@/components/app/signals/SignalDetailView";
import { Week52Range } from "@/components/app/signals/Week52Range";
import { retryTransientPublicGet } from "@/lib/api/retry-public-upstream";
import { stockPath, stockSymbolFromParam } from "@/lib/seo/stock-symbol";

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol: raw } = await params;
  const symbol = stockSymbolFromParam(raw) ?? raw.toUpperCase();
  return {
    title: `${symbol} Stock Condition`,
    description: `Measured Stock Condition, trend, delivery, sector standing and options positioning for ${symbol} — factual, not a prediction.`,
    alternates: { canonical: stockPath("/signals", symbol) },
  };
}

export default async function SignalDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await params;
  // Decode once (M%26M -> M&M); the API client encodes it again for its own URL.
  const symbol = stockSymbolFromParam(raw) ?? raw;

  let detail;
  try {
    // @auth-ok: SSR fetch, always anonymous by architecture (Server
    // Components here can't reach the browser's localStorage-held token)
    // — SignalUnlockGate corrects client-side below whenever `locked` is
    // true for a real logged-in entitled user. See that component and
    // the comment just below.
    detail = (await retryTransientPublicGet(
      () => getSignalDetail(symbol),
      () => getSignalDetail(symbol, 6, { timeoutMs: 10_000 }),
    )).data;
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

  // Bug 2/3 fix (2026-08-22): `has_score: false` means this symbol is a
  // real member of the tracked universe but has no measured_signals doc
  // yet — the backend used to 404 for this case (core/routers/signals.py),
  // which sent EVERY tier (a real paying subscriber included, and a free
  // user who should have seen the paywall below instead) to Next's generic
  // not-found page. Same for every tier by construction — there's no
  // upgrade that would unlock data that doesn't exist yet, so this is a
  // plain, honest message, not the paywall Card above.
  //
  // Copy update (2026-08-25): this used to say "recently added to
  // coverage", but that turned out to be wrong for most symbols hitting
  // this branch — a candle-history gap affecting ~911/2,299 NSE symbols
  // (00_MASTER_CONTEXT.md, "candle coverage gap" entry) was the real cause
  // for established, long-listed companies, not newness. SignalDetail
  // carries no listing-date/candle-count field to distinguish "genuinely
  // new listing" from "coverage gap" here, so the copy is now neutral
  // ("coverage pending") instead of asserting a specific, often-wrong
  // reason. Revisit once the backend exposes that distinction.
  if (detail.has_score === false) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          {detail.limited_data ? (
            <p className="text-sm">
              <span className="font-medium">Limited data.</span>{" "}
              {detail.limited_data_note || "This stock's feed is incomplete, so the reading is not shown."}
            </p>
          ) : detail.no_score_reason === "stale_candle" ? (
            <p className="text-sm">
              No reading is shown for the latest session because the latest daily bar is from an earlier
              session. The last price above is from that earlier session; coverage resumes when the next
              daily bar arrives.
            </p>
          ) : (
            <p className="text-sm">
              {detail.company_name ?? symbol.toUpperCase()} doesn&apos;t have measured signal data yet.
              Coverage for this symbol is pending — check back after the next scheduled update.
            </p>
          )}
        </Card>
        {detail.week52 && <Week52Range week52={detail.week52} lastPrice={detail.last_price} className="mt-3 max-w-md" />}
      </div>
    );
  }

  // @auth-ok: SSR, same reason as getSignalDetail above. getResearch's
  // only tier-dependent behavior is free-tier view metering (not
  // masking, see endpoints.ts) — fetching anonymously here means that
  // metering never fires for the fundamentals/delivery data pulled in.
  // Known gap, flagged in this session's audit (docs/00_MASTER_CONTEXT.md),
  // not fixed here — no client-side "correction" for metering exists yet
  // anywhere in the app, unlike the masking-correction pattern above.
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
