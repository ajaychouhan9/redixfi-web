/** Phone bottom bar layout, switched by the NAV_MOBILE_LAYOUT setting (inlined at build time; default C).
 *  A: Home | Signals | Intraday | Rewind | More     (Research is the first item in More, plus a shortcut card on Home)
 *  B: Home | Signals | Research | Rewind | More     (Intraday is the first item in More, plus a shortcut card on Home)
 *  C: Home | Signals | Intraday | Research | Rewind (no More tab: every item that lived in More is in the header avatar menu, the bell stays in the header;
 *     Home carries shortcut cards for Research and Watchlist) */
export type NavLayout = "A" | "B" | "C";
export const NAV_MOBILE_LAYOUT: NavLayout = process.env.NAV_MOBILE_LAYOUT === "A" ? "A" : process.env.NAV_MOBILE_LAYOUT === "B" ? "B" : "C";

/** Layouts A and B: the item moved out of the bottom bar into More (and onto a Home shortcut card). Layout C moves nothing into More. */
export const MOVED_TO_MORE =
  NAV_MOBILE_LAYOUT === "A"
    ? { href: "/research", label: "Research", blurb: "Look up a stock: price, Stock Condition, fundamentals and filings." }
    : NAV_MOBILE_LAYOUT === "B"
      ? { href: "/intraday", label: "Intraday", blurb: "The market so far today: movers and sessions as they develop." }
      : null;

/** Layout C: the Home shortcut cards (phone only). */
export const HOME_SHORTCUTS_C = [
  { href: "/research", label: "Research", blurb: "Look up any stock" },
  { href: "/watchlist", label: "Watchlist", blurb: "The stocks you follow" },
] as const;
