"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { DEFAULT_STOCK_TAB, STOCK_TABS, neighbourTab, tabFromHash, tabFromSearch, type StockTabId } from "@/lib/stock-tabs";

/**
 * The tab bar and panels of the stock page (17 Nov 2026). The page around it is static and cached; this is the only client switch.
 * LAZY: a tab's panel is mounted only after it is first opened, so a visitor who never taps Rewind never loads Rewind (its numbers are
 * fetched when its panel mounts), and the heavy tables are not built in the browser until wanted. Overview is open on first paint and is in
 * the server HTML. Opened tabs stay mounted (hidden) so switching back is instant and keeps their state.
 * The address fragment follows the tab (/stocks/INFY#rewind) without scrolling, and a fragment (or ?tab=) opens that tab on arrival.
 */
export function StockTabs({ panels }: { panels: Partial<Record<StockTabId, ReactNode>> }) {
  const [active, setActive] = useState<StockTabId>(DEFAULT_STOCK_TAB);
  const [visited, setVisited] = useState<Set<StockTabId>>(() => new Set([DEFAULT_STOCK_TAB]));
  const buttons = useRef<Partial<Record<StockTabId, HTMLButtonElement | null>>>({});

  const open = useCallback((id: StockTabId, updateAddress: boolean) => {
    setActive(id);
    setVisited((v) => (v.has(id) ? v : new Set(v).add(id)));
    if (updateAddress) {
      try {
        window.history.replaceState(null, "", id === DEFAULT_STOCK_TAB ? window.location.pathname + window.location.search : `#${id}`);
      } catch {
        /* the address is only a convenience */
      }
    }
  }, []);

  useEffect(() => {
    const fromAddress = () => {
      const id = tabFromHash(window.location.hash) ?? tabFromSearch(window.location.search);
      if (id) open(id, false);
    };
    fromAddress();
    window.addEventListener("hashchange", fromAddress);
    return () => window.removeEventListener("hashchange", fromAddress);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = neighbourTab(active, step as 1 | -1);
    open(next, true);
    buttons.current[next]?.focus();
  }

  return (
    <div className="mt-4" data-testid="stock-tabs">
      <div className="sticky-tabs -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" data-testid="stock-tab-scroll">
        <div role="tablist" aria-label="Sections of this stock page" onKeyDown={onKeyDown} className="flex min-w-max gap-1 border-b border-border">
          {STOCK_TABS.map((t) => {
            const on = active === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  buttons.current[t.id] = el;
                }}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={on}
                aria-controls={`panel-${t.id}`}
                tabIndex={on ? 0 : -1}
                data-testid={`tab-${t.id}`}
                onClick={() => open(t.id, true)}
                className={`min-h-[44px] whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors ${on ? "border-accent text-accent" : "border-transparent text-foreground-muted hover:text-foreground"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      {STOCK_TABS.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id} data-testid={`panel-${t.id}`} className="pt-2">
          {visited.has(t.id) ? panels[t.id] ?? null : null}
        </div>
      ))}
    </div>
  );
}
