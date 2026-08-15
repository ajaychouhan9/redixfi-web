"use client";

import clsx from "clsx";
import type { MarketActivityType } from "@/lib/api/types";

export interface MarketActivityTabDef {
  key: MarketActivityType | "all";
  label: string;
}

export const MARKET_ACTIVITY_TABS: MarketActivityTabDef[] = [
  { key: "all", label: "All" },
  { key: "concall", label: "Concalls" },
  { key: "insider", label: "Insider Trading" },
  { key: "corporate_event", label: "Corporate Events" },
  { key: "bulk_block", label: "Bulk/Block Deals" },
];

/** Same visual pattern as the Account page's tabs
 * (components/app/account/AccountTabs.tsx) — border-b wrapper, active tab
 * gets border-accent/text-accent, inactive gets border-transparent/
 * text-foreground-muted. AccountTabs is route-based (each tab a separate
 * page); this hub's tabs are state-based (one page, shared fetch/filter
 * state across tabs) since the underlying data/filters/export logic is
 * identical across tabs and would otherwise have to be duplicated 5x —
 * same className treatment, buttons instead of Links. */
export function MarketActivityTabs({
  active,
  onChange,
}: {
  active: MarketActivityTabDef["key"];
  onChange: (key: MarketActivityTabDef["key"]) => void;
}) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
      {MARKET_ACTIVITY_TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={clsx(
            "shrink-0 border-b-2 px-3 py-2 text-sm font-medium",
            active === t.key ? "border-accent text-accent" : "border-transparent text-foreground-muted"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
