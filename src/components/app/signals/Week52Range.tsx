import type { Week52Detail } from "@/lib/api/types";
import { formatObservationDate } from "@/lib/format";

/** The shared 52-week range bar used on Signal detail and Research. */
export function Week52Range({
  week52,
  lastPrice,
  className = "mt-3 max-w-md",
}: {
  week52: Week52Detail | null | undefined;
  lastPrice?: number | null;
  className?: string;
}) {
  if (!week52) return null;
  const high = week52.week52_high;
  const low = week52.week52_low;
  if (high == null || low == null) {
    return (
      <div className={`${className} rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-foreground-muted`}>
        <span className="font-medium text-foreground">52-week range.</span>{" "}
        {week52.reason ?? "Price history incomplete"}
        {week52.as_of ? ` · as of ${formatObservationDate(week52.as_of)}` : ""}
      </div>
    );
  }
  const last = week52.last_close ?? lastPrice;
  const position = last != null && high > low
    ? Math.max(0, Math.min(100, ((last - low) / (high - low)) * 100))
    : 50;
  const below = last != null && high > 0
    ? Math.max(0, (1 - last / high) * 100)
    : week52.pct_below_52w_high;
  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-faint">52-week range</p>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-neutral-bg">
        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${position}%` }} />
      </div>
      <div className="mt-1 flex justify-between gap-2 text-xs text-foreground-faint">
        <span>52wk low ₹{low.toLocaleString("en-IN")}</span>
        <span>52wk high ₹{high.toLocaleString("en-IN")}</span>
      </div>
      <p className="mt-1 text-xs text-foreground-muted">
        {below == null
          ? "52-week comparison unavailable"
          : below < 0.05
            ? "at 52-week high"
            : `${below.toFixed(1)}% below 52-week high`}
      </p>
      <p className="mt-0.5 text-[10px] text-foreground-faint">
        52-week range: as of {formatObservationDate(week52.as_of) ?? "date unavailable"}.
      </p>
    </div>
  );
}
