"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSignalDetail, getChart, getResearch } from "@/lib/api/endpoints";
import { postLookup } from "@/lib/api/mutations";
import { setLookupGrant } from "@/lib/lookup-grants";
import { useTrialDays } from "@/lib/trial";
import { Card } from "@/components/ui/Card";
import { SignalDetailView } from "./SignalDetailView";
import type { Candle, DeliveryPoint, FundamentalsBlock, SignalDetail } from "@/lib/api/types";

/**
 * Stock page for a stock outside the Free plan's fixed set.
 *
 * The server page renders anonymously (that is what search crawlers and logged-out visitors get first), so this client
 * component settles what the actual viewer may see once their login, if any, is known:
 *
 *  - Basic, Pro and trial accounts: the full page (re-fetched with their token, as before).
 *  - Free accounts and logged-out visitors: one "free stock view" is counted for this stock (POST /lookups/{symbol}, one
 *    daily counter shared with the Research page; the same stock twice in a day counts once). Within the quota the API
 *    hands back a grant for the stock and the page is shown at the Free plan limits (the same limits the fixed set of
 *    stocks already has: shorter score history, the Free volatility window, no Excel download, and so on). When the
 *    day's views are used up, a plain message with the way forward is shown instead of a dead end.
 *
 * Nothing here changes the Signals list or any plan limit.
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
  const trialDays = useTrialDays();
  const [detail, setDetail] = useState(initialDetail);
  const [candles, setCandles] = useState(initialCandles);
  const [delivery30d, setDelivery30d] = useState(initialDelivery30d);
  const [fundamentals, setFundamentals] = useState(initialFundamentals);
  const [phase, setPhase] = useState<"resolving" | "shown" | "used_up" | "error">("resolving");

  useEffect(() => {
    if (authLoading) return;
    if (!initialDetail.locked) {
      setPhase("shown");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = user ? await getToken() : null;
        const res = await postLookup(symbol, token);
        if (cancelled) return;
        if (!res.allowed) {
          setPhase("used_up");
          return;
        }
        if (res.grant) setLookupGrant(symbol, res.grant);
        const detailEnv = await getSignalDetail(symbol, 6, token ? { token } : undefined);
        if (cancelled) return;
        if (detailEnv.data.locked) {
          setPhase("used_up");
          return;
        }
        setDetail(detailEnv.data);
        const [chartR, researchR] = await Promise.allSettled([
          getChart(symbol, { interval: "1d" }, token ? { token } : undefined),
          getResearch(symbol, token ? { token } : undefined),
        ]);
        if (cancelled) return;
        if (chartR.status === "fulfilled") setCandles(chartR.value.data.candles);
        if (researchR.status === "fulfilled") {
          setDelivery30d(researchR.value.data.delivery_30d);
          setFundamentals(researchR.value.data.fundamentals);
        }
        setPhase("shown");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, getToken, symbol, initialDetail.locked]);

  if (phase === "resolving") {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-3">
        <p className="sr-only">
          {initialDetail.company_name ?? symbol} — measured signals. Logged-out and Free visitors can open a few stocks each day.
        </p>
        <div className="h-6 w-48 rounded bg-hover" />
        <div className="h-24 rounded-xl bg-hover" />
        <div className="h-40 rounded-xl bg-hover" />
      </div>
    );
  }

  if (phase === "used_up") {
    return (
      <div className="mx-auto max-w-3xl" data-testid="free-views-used">
        <Card>
          {user ? (
            <>
              <p className="text-sm">You have used today&apos;s free stock views. Pro opens every stock, every day.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link href="/pricing" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
                  View plans
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm">
                You have used today&apos;s free stock views. Sign up free (one tap with Google) and get a {trialDays}-day Pro trial.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={`/login?mode=signup&next=${encodeURIComponent(`/signals/${symbol}`)}`}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
                >
                  Sign up free
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(`/signals/${symbol}`)}`}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground"
                >
                  Log in
                </Link>
                <Link href="/pricing" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground">
                  View plans
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <p className="text-sm">We could not load {detail.company_name ?? symbol} right now. Please refresh the page in a moment.</p>
        </Card>
      </div>
    );
  }

  return <SignalDetailView detail={detail} candles={candles} delivery30d={delivery30d} fundamentals={fundamentals} />;
}
