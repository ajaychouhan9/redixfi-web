/** Phone bottom bar layout, switched by the NAV_MOBILE_LAYOUT setting (inlined at build time; default A).
 *  A: Home | Signals | Intraday | Rewind | More   (Research is the first item in More, plus a shortcut card on Home)
 *  B: Home | Signals | Research | Rewind | More   (Intraday is the first item in More, plus a shortcut card on Home) */
export type NavLayout = "A" | "B";
export const NAV_MOBILE_LAYOUT: NavLayout = process.env.NAV_MOBILE_LAYOUT === "B" ? "B" : "A";

/** The item moved out of the bottom bar into More (and onto a Home shortcut card). */
export const MOVED_TO_MORE =
  NAV_MOBILE_LAYOUT === "A"
    ? { href: "/research", label: "Research", blurb: "Look up a stock: price, Stock Condition, fundamentals and filings." }
    : { href: "/intraday", label: "Intraday", blurb: "The market so far today: movers and sessions as they develop." };
