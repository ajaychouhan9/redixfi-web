"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { recordResearchView } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { ResearchDetail } from "./ResearchDetail";
import type { ResearchDetail as ResearchDetailType, Candle, PeerRow } from "@/lib/api/types";

const DEFAULT_GATE_MESSAGE = "You've used today's free Research views.";

/**
 * Bug fix (2026-08-08) — companion to the backend's new POST
 * /research/{symbol}/view (see that route's own docstring for the full
 * root-cause writeup). The SSR page below always renders the real,
 * unmasked Research content immediately (correct — Research isn't
 * tier-masked at all, every tier gets an identical payload, and the
 * page's SSR/ISR shared cache must stay anonymous for performance/cost
 * reasons this session was explicitly told not to break). This
 * component's job is narrower than SignalUnlockGate's: not "unlock more
 * data for an entitled user" but "fire the free-tier daily-view metering
 * side effect the SSR render structurally can't, then retroactively gate
 * if that reveals today's cap is already spent."
 *
 * Paid/Basic/Pro/founding and anonymous visitors: zero extra network
 * work — the effect below returns immediately without calling anything.
 * Anonymous stays deliberately unmetered (Task 04's own B8 spec: "no
 * user_id to key a per-day counter on") — same intentional stance this
 * app already has, not a new gap invented here.
 *
 * Honest tradeoff, stated plainly rather than glossed over: because the
 * underlying content is never actually masked (it's already sitting in
 * the shared SSR/ISR cache, visible in page source, crawlable), a
 * free-tier caller who is ABOUT to go over the cap still sees a brief
 * flash of the real content before this gate swaps in — there is no way
 * to prevent that without either de-anonymizing the SSR cache (breaks
 * the performance/cost architecture this task explicitly protects) or
 * blocking render on a client round-trip (defeats the point of SSR).
 * This was already true before the fix (unlimited views, zero gating) —
 * this component makes the DAILY COUNT real again; it was never a data-
 * security boundary the way Signals' B8 masking is, only a usage limit.
 */
export function ResearchViewGate({
  data,
  dailyCandles,
  peers,
  peersError,
}: {
  data: ResearchDetailType;
  dailyCandles: Candle[];
  peers: PeerRow[] | null;
  peersError: boolean;
}) {
  const { user, loading: authLoading, getToken } = useAuth();
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading || checked) return;
    if (!user || user.tier !== "free") {
      setChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        await recordResearchView(token, data.symbol);
      } catch (e) {
        if (!cancelled && e instanceof ApiError && e.status === 429) {
          setGateMessage(typeof e.detail === "string" ? e.detail : DEFAULT_GATE_MESSAGE);
        }
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, checked, getToken, data.symbol]);

  if (gateMessage) {
    // No outer max-w-3xl wrapper here — the caller (app/(app)/research/
    // [symbol]/page.tsx) already provides it, same as it does for the
    // unlocked <ResearchDetail> branch below.
    return (
      <Card>
        <p className="text-sm">
          {gateMessage} Analytics Pro includes unlimited Research access.
        </p>
        <Link href="/pricing" className="mt-2 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
          View plans
        </Link>
      </Card>
    );
  }

  return <ResearchDetail data={data} dailyCandles={dailyCandles} peers={peers} peersError={peersError} />;
}
