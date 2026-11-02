"use client";

import { useEffect, useState } from "react";

import { StockPriceHeader } from "@/components/app/signals/StockPriceHeader";
import { Week52Range } from "@/components/app/signals/Week52Range";
import { VolatilityRankLines } from "@/components/app/signals/VolatilityRankLines";
import { getVolatility } from "@/lib/api/endpoints";
import { formatPriceAsOf } from "@/lib/format";
import type { SignalDetail, VolatilityResponse } from "@/lib/api/types";

/**
 * What every visitor sees for any stock, before or without the Stock Condition: company name and symbol, price, % move and its as-of label, the
 * 52-week position, volume against its usual level and the volatility rank. These are public measured facts; only the Stock Condition number, its
 * history and its change log follow the visibility rule. It is part of the server-rendered page, so a logged-out search crawler gets real content.
 */
export function PublicStockSummary({ detail }: { detail: SignalDetail }) {
  const [vol, setVol] = useState<VolatilityResponse | null>(null);
  useEffect(() => {
    let alive = true;
    // @auth-ok: the volatility rank is public for every stock; the page is server-rendered for everyone, so this request is anonymous on purpose
    getVolatility(detail.symbol)
      .then((res) => alive && setVol(res.data))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [detail.symbol]);

  const label = formatPriceAsOf(detail.price_data_as_of);
  const live = /^As of \d{2}:\d{2} IST \(delayed\)$/.test(label);
  const ratio = detail.signals?.volume_ratio_5d;
  const ranked = !!vol && vol.available && vol.eligible;
  return (
    <section className="space-y-2" data-testid="public-stock-summary">
      <StockPriceHeader symbol={detail.symbol} name={detail.company_name} group={detail.industry || detail.sector} price={detail.last_price} pct={detail.day_change_pct} asOf={detail.price_data_as_of} />
      <Week52Range week52={detail.week52} lastPrice={detail.last_price} livePrice={live ? detail.last_price : null} liveLabel={live ? label : null} />
      {typeof ratio === "number" && (
        <p className="text-sm text-foreground-muted" data-testid="public-volume">
          Volume {ratio}x its usual level (5-day average against the 20-day average), as of the last close.
        </p>
      )}
      {ranked && vol && (
        <div className="text-sm text-foreground-muted" data-testid="public-volatility">
          <VolatilityRankLines data={vol} />
        </div>
      )}
    </section>
  );
}
