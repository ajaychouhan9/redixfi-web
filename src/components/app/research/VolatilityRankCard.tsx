"use client";

/**
 * Research "How volatile is it?": the same volatility rank the Signals page shows, instead of the stored risk
 * label and its standard deviation. Past price movement only, not a forecast. Display only: the stored risk field
 * stays in the data and is not used here.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import { VolatilityRankLines } from "@/components/app/signals/VolatilityRankLines";
import { getVolatility } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatShortDate } from "@/lib/format";
import { stockPath } from "@/lib/seo/stock-symbol";
import type { VolatilityResponse } from "@/lib/api/types";

export function VolatilityRankCard({ symbol }: { symbol: string }) {
  const { getToken } = useAuth();
  const [data, setData] = useState<VolatilityResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        const res = await getVolatility(symbol, { token });
        if (alive) setData(res.data);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const ranked = !!data && data.available && data.eligible && !data.locked;
  return (
    <div className="space-y-2 text-sm">
      {!data && !failed && <p className="text-xs text-foreground-muted">Loading…</p>}
      {failed && <p className="text-xs text-foreground-muted">Could not load the volatility rank right now.</p>}
      {data?.locked && <p className="text-xs text-foreground-muted">The volatility rank is available on the full stock page for this symbol.</p>}
      {data && !data.locked && !data.eligible && <p className="text-xs text-foreground-muted">{data.note ?? "Volatility has not been measured for this stock yet."}</p>}
      {ranked && data && (
        <>
          <p className="text-[11px] text-foreground-faint">Data as of {formatShortDate(data.as_of ?? "")}</p>
          <VolatilityRankLines data={data} />
        </>
      )}
      <p className="text-[11px] text-foreground-faint">
        Past price movement, not a forecast. Measured market data, not investment advice.{" "}
        <Link href={stockPath("/signals", symbol)} className="text-accent underline decoration-dotted underline-offset-2">
          Open the Volatility card on the Signals page
        </Link>
      </p>
    </div>
  );
}
