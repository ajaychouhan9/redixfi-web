"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import { getSignals, type SignalsListParams } from "@/lib/api/endpoints";
import type { SignalRow } from "@/lib/api/types";
import { LockedRow, UnlockBanner } from "@/components/ui/Locked";
import { ScreenTable } from "@/components/seo/ScreenTable";

const FREE_ROWS = 10;
const PAGE = 200;
const MAX_ROWS = 2000;

/**
 * The rest of a result after the first ten rows. Free and logged-out visitors see a locked block (placeholder rows, no real
 * values) with the "Free for 5 days" link; the full list opens during the trial and on paid plans.
 */
export function ScreenMoreRows({ params, total }: { params: SignalsListParams; total: number }) {
  const { user, getToken } = useAuth();
  const entitled = !!user && user.tier !== "free";
  const [rows, setRows] = useState<SignalRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const rest = total - FREE_ROWS;

  useEffect(() => {
    if (!entitled || rest <= 0) return;
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        const all: SignalRow[] = [];
        for (let page = 1; all.length < Math.min(total, MAX_ROWS); page += 1) {
          const env = await getSignals({ ...params, page, size: PAGE }, { token });
          all.push(...env.data);
          if (env.data.length < PAGE) break;
        }
        if (alive) setRows(all.slice(FREE_ROWS));
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [entitled, rest, total, params, getToken]);

  if (rest <= 0) return null;
  if (entitled) {
    if (failed) return <p className="mt-3 text-sm text-foreground-muted">The full list could not be loaded. Please reload the page.</p>;
    if (!rows) return <p className="mt-3 text-sm text-foreground-muted">Loading the full list…</p>;
    return (
      <div className="mt-3" data-testid="screen-full-list">
        <ScreenTable rows={rows} />
        {total > MAX_ROWS && <p className="mt-1 text-xs text-foreground-faint">The first {MAX_ROWS.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")} are shown.</p>}
      </div>
    );
  }
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border" data-testid="screen-locked">
      {[0, 1, 2].map((i) => (
        <LockedRow key={i}>
          <div className="grid grid-cols-5 gap-3 border-b border-border px-3 py-2 text-sm tabular-nums">
            <span>SYMBOL</span>
            <span>0000.00</span>
            <span>00.0</span>
            <span>00.0%</span>
            <span>00.00</span>
          </div>
        </LockedRow>
      ))}
      <UnlockBanner label={`${rest.toLocaleString("en-IN")} more stocks meet these conditions`} cta="See the full list" />
    </div>
  );
}
