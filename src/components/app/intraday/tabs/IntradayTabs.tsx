"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthContext";
import { getIntradayTab } from "@/lib/api/endpoints";
import type { IntradayTabData, IntradayTabId } from "@/lib/api/types";
import { DELAY_NOTE, DISCLAIMER, INTRADAY_PATH, TAB_LABEL, TAB_ORDER, TAB_SUBTITLE, closedMessage } from "@/lib/intraday-copy";
import { LegacyTools } from "./LegacyTools";
import { MorningBody, RecapBody, ScanBody } from "./TabBodies";

const POLL_MS = 60_000;

const PHASE_LABEL: Record<string, string> = {
  pre_market: "Before the open",
  live: "Market open",
  post_market: "After the close",
  weekend: "Market closed",
  holiday: "Market closed",
};

/** The tab's data: the server's copy first, then (for a signed-in person) the same request with their token so Stock Condition is shown, and a
 *  refresh every minute while the market is open. */
function useTabData(tab: IntradayTabId, initial: IntradayTabData | null) {
  const { user, loading, getToken } = useAuth();
  const [data, setData] = useState<IntradayTabData | null>(initial);
  const live = useRef(initial?.session.phase === "live");

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    async function load() {
      try {
        const token = user ? await getToken() : null;
        const env = await getIntradayTab(tab, token ? { token } : undefined);
        if (cancelled) return;
        live.current = env.data.session.phase === "live";
        setData(env.data);
      } catch {
        // keep the last copy: the page stays readable with its own as-of time
      }
    }
    if (user || !initial) void load();
    const id = setInterval(() => {
      if (live.current) void load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user, loading]);

  return data;
}

function StatusStrip({ d }: { d: IntradayTabData | null }) {
  if (!d) return null;
  const s = d.session;
  return (
    <div className="space-y-1.5 text-sm" data-testid="intraday-status">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-neutral-bg px-2.5 py-1 font-semibold text-foreground" data-testid="intraday-phase">
          {PHASE_LABEL[s.phase] ?? "Market closed"}
        </span>
        {d.available && d.as_of_label && (
          <span className="text-foreground-muted" data-testid="intraday-asof">
            As of {d.as_of_label}
          </span>
        )}
      </div>
      {s.market_closed && (
        <p className="text-foreground-muted" data-testid="intraday-closed">
          {closedMessage(s.closed_reason, d.data_date_label ?? null)}
        </p>
      )}
      {!s.market_closed && d.available && d.is_today === false && (
        <p className="text-foreground-muted" data-testid="intraday-last-session">
          Today's data is not stored yet. Showing the last session: {d.data_date_label}.
        </p>
      )}
    </div>
  );
}

export function IntradayTabs({ tab, defaultTab, initial }: { tab: IntradayTabId; defaultTab: IntradayTabId; initial: IntradayTabData | null }) {
  const data = useTabData(tab, initial);
  return (
    <div className="space-y-4">
      <nav aria-label="Intraday views" className="inline-flex max-w-full rounded-lg border border-border p-0.5" data-testid="intraday-tabs">
        {TAB_ORDER.map((t) => (
          <Link
            key={t}
            href={t === defaultTab ? INTRADAY_PATH : `${INTRADAY_PATH}?tab=${t}`}
            scroll={false}
            aria-current={tab === t ? "page" : undefined}
            data-testid={`intraday-tab-${t}`}
            className={`flex min-h-11 items-center rounded-md px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-6 ${
              tab === t ? "bg-accent/15 text-foreground ring-1 ring-accent" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {TAB_LABEL[t]}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-foreground-muted" data-testid="intraday-subtitle">
        {TAB_SUBTITLE[tab]}
      </p>
      <StatusStrip d={data} />
      <div className="space-y-0.5 text-xs text-foreground-muted" data-testid="intraday-notes">
        <p>{DELAY_NOTE}</p>
        <p>{DISCLAIMER}</p>
      </div>
      {!data ? (
        <p className="py-6 text-sm text-foreground-muted" data-testid="intraday-unavailable">
          Intraday data is unavailable right now. Please try again in a minute.
        </p>
      ) : tab === "morning" ? (
        <MorningBody d={data} />
      ) : tab === "scan" ? (
        <ScanBody d={data} />
      ) : (
        <RecapBody d={data} />
      )}
      <LegacyTools />
    </div>
  );
}
