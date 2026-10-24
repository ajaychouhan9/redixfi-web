import { moreVolatileThanPct } from "@/lib/stock-clarity";
import type { VolatilityResponse } from "@/lib/api/types";

/** The rank lines shared by the Signals Volatility card and the Research "How volatile is it?" card.
 *  A restatement of the stored rank and band; no new metric. Past price movement only. */
export function VolatilityRankLines({ data }: { data: VolatilityResponse }) {
  if (data.vol_rank == null || data.ranked_of == null) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-sm font-semibold text-foreground">{data.band_text}</p>
      <p className="mt-0.5 text-[12px] text-foreground-muted">
        Volatility rank <span className="font-medium tabular-nums text-foreground">{data.vol_rank.toLocaleString("en-IN")}</span> of{" "}
        <span className="tabular-nums">{data.ranked_of.toLocaleString("en-IN")}</span> (1 = most volatile)
      </p>
      <p className="mt-0.5 text-[12px] text-foreground-muted">
        More volatile than <span className="font-medium tabular-nums text-foreground">{moreVolatileThanPct(data.vol_rank, data.ranked_of)}%</span> of ranked stocks
      </p>
      {data.std_21 != null && (
        <p className="mt-0.5 text-[11px] text-foreground-faint">
          Daily moves over the last 21 sessions varied by {data.std_21.toFixed(2)}% (standard deviation).
        </p>
      )}
    </div>
  );
}
