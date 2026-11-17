"use client";

import { useCallback, useEffect, useState } from "react";

import { ActivityTab } from "@/components/app/market/ActivityTab";
import { MoversTab } from "@/components/app/market/MoversTab";
import { PulseTab } from "@/components/app/market/PulseTab";
import { MARKET_TABS, marketTabFrom, type MarketTabId } from "@/lib/market-today";

/** Market today: Movers | Pulse | Activity. Each tab loads its data only when first opened (the page itself is static). ?tab=pulse opens a tab. */
export function MarketToday() {
  const [active, setActive] = useState<MarketTabId>("movers");
  const [visited, setVisited] = useState<Set<MarketTabId>>(() => new Set(["movers"]));

  const open = useCallback((id: MarketTabId, updateAddress: boolean) => {
    setActive(id);
    setVisited((v) => (v.has(id) ? v : new Set(v).add(id)));
    if (updateAddress) {
      try {
        window.history.replaceState(null, "", id === "movers" ? "/market" : `/market?tab=${id}`);
      } catch {
        /* the address is only a convenience */
      }
    }
  }, []);

  useEffect(() => {
    const id = marketTabFrom(window.location.search, window.location.hash);
    if (id) open(id, false); // eslint-disable-line react-hooks/set-state-in-effect -- reads the address once on arrival
  }, [open]);

  const body: Record<MarketTabId, React.ReactNode> = { movers: <MoversTab />, pulse: <PulseTab />, activity: <ActivityTab /> };
  return (
    <div data-testid="market-today">
      <div role="tablist" aria-label="Market today" className="flex gap-1 border-b border-border">
        {MARKET_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`mtab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`mpanel-${t.id}`}
            data-testid={`market-tab-${t.id}`}
            onClick={() => open(t.id, true)}
            className={`min-h-[44px] border-b-2 px-4 text-sm font-medium ${active === t.id ? "border-accent text-accent" : "border-transparent text-foreground-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {MARKET_TABS.map((t) => (
        <div key={t.id} role="tabpanel" id={`mpanel-${t.id}`} aria-labelledby={`mtab-${t.id}`} hidden={active !== t.id} className="pt-4">
          {visited.has(t.id) ? body[t.id] : null}
        </div>
      ))}
    </div>
  );
}
