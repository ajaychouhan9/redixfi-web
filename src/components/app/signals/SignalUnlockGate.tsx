"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSignalDetail, getChart, getResearch } from "@/lib/api/endpoints";
import { Card } from "@/components/ui/Card";
import { SignalDetailView } from "./SignalDetailView";
import type { Candle, DeliveryPoint, FundamentalsBlock, SignalDetail } from "@/lib/api/types";

/**
 * Bug 2 fix. Root cause: app/(app)/signals/[symbol]/page.tsx is a Server
 * Component — it has no access to the browser's localStorage-held auth
 * token (AuthContext stores it client-side only, and this codebase has no
 * cookie-based session anywhere), so its SSR fetch of GET /signals/{symbol}
 * was always anonymous. The backend's own B8 masking is correct (verified
 * live: api/scripts/smoke_test_bugfixes.py hits the same route with a
 * free-tier token vs a paid-tier token and gets the right `locked` value
 * both times) — a REAL paid subscriber's browser was just never sending
 * their token in the first place, so every visitor, including paying
 * ones, got the anonymous/free-tier "locked" response for any symbol
 * outside the fixed unlocked-N.
 *
 * Fix: the server page still renders anonymously by default (correct and
 * necessary for SEO/crawlers/logged-out visitors — the majority case, and
 * exactly the pattern Task 14 established). This client component wraps
 * that result and, ONLY when someone is actually logged in AND the
 * anonymous SSR render came back locked, re-fetches with their real token
 * and swaps in the unlocked view if they're actually entitled. Anonymous
 * visitors and already-unlocked symbols do zero extra work — the
 * correction only fires for the specific case the bug was about.
 */
export function SignalUnlockGate({
  symbol,
  initialDetail,
  initialCandles,
  initialDelivery30d,
  initialFundamentals,
}: {
  symbol: string;
  initialDetail: SignalDetail;
  initialCandles: Candle[];
  initialDelivery30d?: DeliveryPoint[];
  initialFundamentals?: FundamentalsBlock | null;
}) {
  const { user, loading: authLoading, getToken } = useAuth();
  const [detail, setDetail] = useState(initialDetail);
  const [candles, setCandles] = useState(initialCandles);
  const [delivery30d, setDelivery30d] = useState(initialDelivery30d);
  const [fundamentals, setFundamentals] = useState(initialFundamentals);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (authLoading || attempted) return;
    if (!user || !initialDetail.locked) {
      setAttempted(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        const detailEnv = await getSignalDetail(symbol, 6, { token });
        if (cancelled || detailEnv.data.locked) return;
        setDetail(detailEnv.data);
        const [chartR, researchR] = await Promise.allSettled([
          getChart(symbol, { interval: "1d" }, { token }),
          getResearch(symbol, { token }),
        ]);
        if (cancelled) return;
        if (chartR.status === "fulfilled") setCandles(chartR.value.data.candles);
        if (researchR.status === "fulfilled") {
          setDelivery30d(researchR.value.data.delivery_30d);
          setFundamentals(researchR.value.data.fundamentals);
        }
      } finally {
        if (!cancelled) setAttempted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, attempted, getToken, symbol, initialDetail.locked]);

  if (detail.locked) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <p className="text-sm">
            {detail.symbol}&apos;s full measured signals are available on Analytics Pro. Free tier shows a fixed set of stocks by name.
          </p>
          <Link href="/pricing" className="mt-2 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
            View plans
          </Link>
        </Card>
      </div>
    );
  }

  return <SignalDetailView detail={detail} candles={candles} delivery30d={delivery30d} fundamentals={fundamentals} />;
}
