"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import { getConditionLine } from "@/lib/api/endpoints";
import { conditionLineCaption, conditionLinePath, usableConditionPoints } from "@/lib/condition-line";
import type { ConditionLinePoint } from "@/lib/api/types";

const W = 320;
const H = 72;

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * A small line of the stored Stock Condition value for the last 30 sessions (fewer when fewer are stored, 5 at least, otherwise nothing is drawn).
 * Neutral colour only, no labels about direction. The server decides who may have the data: for a caller outside the sample it sends no points at
 * all, and this component then renders nothing (the page's own lock stays as it is). The page is built for everyone without a token, so the browser
 * asks for the line itself, with the visitor's token when signed in. Not used on Market Rewind.
 */
export function ConditionLine({ symbol }: { symbol: string }) {
  const { user, loading, getToken } = useAuth();
  const [points, setPoints] = useState<ConditionLinePoint[]>([]);
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      try {
        const token = user ? await getToken() : null;
        const env = token ? await getConditionLine(symbol, { token }) : await getConditionLine(symbol); // @auth-ok: logged out = the sample only, decided by the server
        if (!cancelled) setPoints(env.data.locked ? [] : usableConditionPoints(env.data.points));
      } catch {
        if (!cancelled) setPoints([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, getToken, symbol]);

  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const { d, min, max } = conditionLinePath(values, W, H);
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <section className="mt-3 rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-sm" data-testid="condition-line">
      <h3 className="text-sm font-semibold text-foreground">{conditionLineCaption(points.length)}</h3>
      <div className="mt-2 flex items-stretch gap-2">
        <div className="flex w-7 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-foreground-muted" aria-hidden="true">
          <span>{Math.round(max)}</span>
          <span>{Math.round(min)}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[72px] w-full min-w-0 text-foreground-muted" role="img" aria-label={`Line of the stored Stock Condition value for the last ${points.length} sessions, ${shortDate(first.date)} to ${shortDate(last.date)}`} preserveAspectRatio="none">
          <path d={d} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-1 flex justify-between pl-9 text-[11px] text-foreground-muted">
        <span>{shortDate(first.date)}</span>
        <span>{shortDate(last.date)}</span>
      </div>
    </section>
  );
}
