import type { ReactNode } from "react";

import { DeltaValue } from "@/components/ui/DeltaValue";
import { displayName } from "@/lib/company-name";
import { formatPriceAsOf } from "@/lib/format";
import type { DataAsOf } from "@/lib/api/types";

/**
 * The price-first header shared by the Signals stock page, the Research page and the cards that open a stock: company name and symbol, the price,
 * the % move, and "As of HH:MM IST (delayed)" (or "As of <date> close"). Company name, price and % move are public for every caller; the
 * Stock Condition is not part of this header (it has its own card lower on the page).
 */
export function StockPriceHeader({
  symbol,
  name,
  group,
  price,
  pct,
  asOf,
  extra,
  h1 = false,
}: {
  symbol: string;
  name?: string | null;
  /** Industry or sector, shown after the name. */
  group?: string | null;
  price: number | null | undefined;
  pct: number | null | undefined;
  asOf?: DataAsOf | null;
  /** Small extra line items next to the price (for example the day's average traded price). */
  extra?: ReactNode;
  /** Render the company name as the page H1 (the stock page uses it; other pages already have their own H1). */
  h1?: boolean;
}) {
  return (
    <div data-testid="stock-price-header">
      {h1 ? (
        <>
          <h1 className="text-xl font-semibold text-foreground">{displayName(name) || symbol} ({symbol})</h1>
          {group && <p className="text-sm text-foreground-muted">{group}</p>}
        </>
      ) : (
        <p className="text-sm text-foreground-muted">{[symbol, displayName(name), group].filter(Boolean).join(" · ")}</p>
      )}
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {typeof price === "number" ? (
          <span className="font-mono text-3xl font-semibold text-foreground" data-testid="header-price">
            ₹{price.toLocaleString("en-IN")}
          </span>
        ) : (
          <span className="text-sm text-foreground-muted">Price not available</span>
        )}
        {typeof pct === "number" && <DeltaValue value={pct} kind="pct" className="text-base" />}
        {extra}
      </div>
      <p className="mt-1 text-[11px] text-foreground-faint" data-testid="header-as-of">
        {formatPriceAsOf(asOf)}
      </p>
    </div>
  );
}
