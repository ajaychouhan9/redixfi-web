import type { Week52Detail } from "@/lib/api/types";
import { formatObservationDate } from "@/lib/format";
import { formatPrice52, resolve52Week } from "@/lib/week52";

/** The shared 52-week range bar used on Signal detail and Research. */
export function Week52Range({
  week52,
  lastPrice,
  livePrice,
  liveLabel,
  className = "mt-3 max-w-md",
}: {
  week52: Week52Detail | null | undefined;
  lastPrice?: number | null;
  /** While the market is open: the header's delayed live price and its "As of HH:MM IST (delayed)" label. The marker and the percentages
   *  then use that price (a price outside the stored range shows as the new extreme); otherwise the last close and its date are used. */
  livePrice?: number | null;
  liveLabel?: string | null;
  className?: string;
}) {
  if (!week52) return null;
  const storedHigh = week52.week52_high;
  const storedLow = week52.week52_low;
  const useLive = typeof livePrice === "number" && Number.isFinite(livePrice) && !!liveLabel;
  const last = useLive ? (livePrice as number) : (week52.last_close ?? lastPrice);
  const resolved = resolve52Week(storedHigh, storedLow, last);
  if (!resolved) {
    return (
      <div className={`${className} rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-foreground-muted`}>
        <span className="font-medium text-foreground">52-week range.</span>{" "}
        {week52.reason ?? "Price history incomplete"}
        {week52.as_of ? ` · as of ${formatObservationDate(week52.as_of)}` : ""}
      </div>
    );
  }
  const { high, low, positionPct: position } = resolved;
  const below = last != null ? resolved.belowHighPct : week52.pct_below_52w_high;
  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-faint">52-week range</p>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-neutral-bg">
        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${position}%` }} />
      </div>
      <div className="mt-1 flex justify-between gap-2 text-xs text-foreground-faint">
        <span>52wk low ₹{formatPrice52(low)}</span>
        <span>52wk high ₹{formatPrice52(high)}</span>
      </div>
      <p className="mt-1 text-xs text-foreground-muted">
        {below == null
          ? "52-week comparison unavailable"
          : below < 0.05
            ? "at 52-week high"
            : `${below.toFixed(1)}% below 52-week high`}
      </p>
      <p className="mt-0.5 text-[10px] text-foreground-faint">
        52-week range: {useLive ? liveLabel : `as of ${formatObservationDate(week52.as_of) ?? "date unavailable"} close`}.
      </p>
    </div>
  );
}
