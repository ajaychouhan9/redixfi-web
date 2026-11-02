"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ScoreAsOf } from "@/components/app/signals/ScoreAsOf";
import { SlowestInputNote } from "@/components/ui/SlowestInputNote";
import { ProLock } from "@/components/ui/ScValue";
import { useAuth } from "@/lib/auth/AuthContext";
import { getResearch } from "@/lib/api/endpoints";
import { READING_EXPLAINER, READING_NAME, conditionChangeText } from "@/lib/reading-copy";
import { stockPath } from "@/lib/seo/stock-symbol";
import type { ResearchSignalSummary } from "@/lib/api/types";

/** The Stock Condition line at the top of a Research page. The page is built for everyone without a token, so outside the free sample it carries a
 *  lock; a paid or trial visitor's browser asks again with the token and shows the number. A free visitor is not asked for again (that request
 *  would count as one more of the three Research views a day). */
export function ResearchConditionCard({ symbol, initial }: { symbol: string; initial: ResearchSignalSummary }) {
  const { user, loading, getToken } = useAuth();
  const [s, setS] = useState(initial);
  useEffect(() => {
    if (loading || !user || !initial.sc_locked || (user.tier === "free" && !user.is_pro_trial)) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const env = await getResearch(symbol, { token });
        if (!cancelled && env.data.signal_summary) setS(env.data.signal_summary);
      } catch {
        // keep the page's own copy
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, getToken, symbol, initial.sc_locked]);

  if (s.sc_locked) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2" data-testid="research-condition-locked">
        <span className="text-lg font-semibold text-foreground">
          <span className="mr-2 text-sm font-medium text-foreground-muted">{READING_NAME}:</span>
          <ProLock className="justify-start align-middle" />
        </span>
        <p className="w-full text-[11px] text-foreground-faint">{READING_EXPLAINER}</p>
        <Link href={stockPath("/signals", symbol)} className="ml-auto text-xs font-medium text-accent">
          Full signal detail →
        </Link>
      </div>
    );
  }
  if (s.composite_score === null) return null;
  return (
    <>
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2">
      <span className="text-lg font-semibold text-foreground">
        <span className="mr-2 text-sm font-medium text-foreground-muted">{READING_NAME}:</span>
        {s.composite_score} out of 100
      </span>
      {conditionChangeText(s.delta_1d) && <span className="text-sm text-foreground-muted">({conditionChangeText(s.delta_1d)})</span>}
      <p className="w-full text-[11px] text-foreground-faint" data-testid="reading-explainer">{READING_EXPLAINER}</p>
      <ScoreAsOf className="w-full text-[11px] text-foreground-faint" scoreDate={s.data_as_of?.data_as_of} />
      <div className="w-full -mt-2"><SlowestInputNote input={s.slowest_input} /></div>
      <Link href={stockPath("/signals", symbol)} className="ml-auto text-xs font-medium text-accent">
        Full signal detail →
      </Link>
    </div>
    </>
  );
}
