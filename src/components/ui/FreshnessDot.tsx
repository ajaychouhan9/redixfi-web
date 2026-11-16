import clsx from "clsx";

import { DELAYED_FEED_LABEL, LIVE_LABEL } from "@/lib/market-labels";

/** Green/amber from meta.data_fresh — amber means "data delayed", never wrong numbers shown as fresh.
 *  Label (16 Nov 2026): "Live (15 min delayed)" says what "live" means here; a stale feed says "Feed delayed". */
export function FreshnessDot({ fresh, className }: { fresh: boolean; className?: string }) {
  return (
    <span
      title={fresh ? "Market feed is updating; quotes are about 15 minutes behind the exchange" : "Market feed is delayed beyond its usual window"}
      className={clsx("inline-flex items-center gap-1.5 text-xs text-foreground-muted", className)}
    >
      <span
        className={clsx("h-2 w-2 rounded-full", fresh ? "bg-up" : "bg-amber")}
        aria-hidden
      />
      {fresh ? LIVE_LABEL : DELAYED_FEED_LABEL}
    </span>
  );
}
