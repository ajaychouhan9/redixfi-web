"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Home, BarChart3, Zap, Search, MoreHorizontal, User, CreditCard, Bookmark, Bell, Sparkles, Rewind } from "lucide-react";
import { useHistoryEnabled } from "@/lib/history-flag";
import { NAV_MOBILE_LAYOUT } from "@/lib/nav-config";
import { useRewindNewBadge } from "@/lib/rewind-new";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import type { MarketOverview } from "@/lib/api/types";

// Real tier buckets returned by the backend (src/lib/api/types.ts's
// AuthUser.tier union) — NOT the specific Razorpay plan IDs PlanCard's
// PLAN_LABEL maps (basic_249/pro_399/...). "pro"/"founding" are treated as
// the top tiers (same two values ResearchExportButton/SignalsExplorer's
// existing paid-feature gates already use) — no further upgrade CTA there.
const TIER_LABEL: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  paid: "Paid",
  founding: "Founding",
};

// Mobile BottomNav's own 4-5 item list — unchanged (this session is scoped
// to Home/desktop polish; a mobile bottom bar can't fit the 8-item desktop
// sidebar order below without its own redesign, out of scope here).
// Three layouts behind NAV_MOBILE_LAYOUT (see lib/nav-config.ts; C is the default). Without the Market Rewind flag the old 5 items are shown.
const REWIND_ITEM = { href: "/rewind", label: "Rewind", icon: Rewind } as const;
const NAV_ITEMS_BY_LAYOUT = {
  A: [
    { href: "/", label: "Home", icon: Home },
    { href: "/signals", label: "Signals", icon: BarChart3 },
    { href: "/intraday", label: "Intraday", icon: Zap },
    REWIND_ITEM,
    { href: "/more", label: "More", icon: MoreHorizontal },
  ],
  B: [
    { href: "/", label: "Home", icon: Home },
    { href: "/signals", label: "Signals", icon: BarChart3 },
    { href: "/research", label: "Research", icon: Search },
    REWIND_ITEM,
    { href: "/more", label: "More", icon: MoreHorizontal },
  ],
  // C: no More tab. Everything that lived in More is in the header avatar menu (see UserMenu.tsx); the bell stays in the header.
  C: [
    { href: "/", label: "Home", icon: Home },
    { href: "/signals", label: "Signals", icon: BarChart3 },
    { href: "/intraday", label: "Intraday", icon: Zap },
    { href: "/research", label: "Research", icon: Search },
    REWIND_ITEM,
  ],
} as const;
const NAV_ITEMS_NO_REWIND =
  NAV_MOBILE_LAYOUT === "C"
    ? ([
        { href: "/", label: "Home", icon: Home },
        { href: "/signals", label: "Signals", icon: BarChart3 },
        { href: "/intraday", label: "Intraday", icon: Zap },
        { href: "/research", label: "Research", icon: Search },
      ] as const)
    : ([
        { href: "/", label: "Home", icon: Home },
        { href: "/signals", label: "Signals", icon: BarChart3 },
        { href: "/intraday", label: "Intraday", icon: Zap },
        { href: "/research", label: "Research", icon: Search },
        { href: "/more", label: "More", icon: MoreHorizontal },
      ] as const);

function NewBadge() {
  return (
    <span className="ml-1.5 rounded-full bg-accent px-1.5 py-px text-[10px] font-semibold leading-tight text-accent-foreground" data-testid="rewind-new-badge">
      New
    </span>
  );
}

// Desktop sidebar's full order (task-specified): Home / Signals / Intraday
// / Research / Alerts / Watchlist / RedixFi AI / More. Watchlist used to
// sit in a separate section below the main nav (its own Link block); Alerts
// links to the real threshold-alert page (account/alerts/page.tsx, not a
// new route). "RedixFi AI" isn't a route — no fabricated page — it's a
// second trigger into the SAME persistent RedixFi AI panel already in the
// header (see AskPanelContext), rendered as its own list item below. It uses
// the same Sparkles mark as the top-ribbon entry point so both clearly
// represent one feature.
const SIDEBAR_LINK_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/signals", label: "Signals", icon: BarChart3 },
  { href: "/intraday", label: "Intraday", icon: Zap },
  { href: "/research", label: "Research", icon: Search },
  { href: "/account/alerts", label: "Alerts", icon: Bell },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
] as const;

const REVIEW_HREF = "/signals/7-day-review";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

/** Desktop sidebar: Signals is active on its pages except the 7-Day Review, which has its own sub-item under it. */
function isActiveSidebar(pathname: string, href: string) {
  if (href === "/signals") return pathname.startsWith("/signals") && !pathname.startsWith(REVIEW_HREF);
  return isActive(pathname, href);
}

export function Sidebar({
  initialOverview = null,
  initialFresh = true,
  initialSignalsAsOf = null,
}: {
  initialOverview?: MarketOverview | null;
  initialFresh?: boolean;
  initialSignalsAsOf?: string | null;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { open: askOpen, openPanel } = useAskPanel();
  const rewindOn = useHistoryEnabled();
  const rewindNew = useRewindNewBadge(pathname);

  return (
    // Fixed/sticky sidebar (2026-08-11): previously a normal in-flow flex
    // child of layout.tsx's `flex min-h-screen` row, stretched tall by
    // flex's default align-items:stretch — meaning it scrolled away with
    // the page instead of staying put. `md:fixed` + `md:h-[calc(100vh-4rem)]`
    // pins it to the viewport at the md breakpoint (matching where it's
    // shown at all — `hidden`/`md:flex` unchanged below); `overflow-y-auto`
    // lets its OWN content scroll independently if it's ever taller than
    // the viewport (short screens). `shrink-0` dropped — meaningless once
    // the element is taken out of flow by `fixed`. layout.tsx's main-content
    // wrapper gets a matching `md:ml-56` to reserve the space this no
    // longer occupies in-flow.
    //
    // Header-alignment fix (2026-08-11): `top-0`/`h-screen` -> `top-16`/
    // `h-[calc(100vh-4rem)]` — MarketRibbon.tsx is now a full-width fixed
    // header (h-16) spanning across this sidebar's x-range too, with its
    // OWN left section showing the logo/wordmark/tagline block that used
    // to live here (moved there verbatim, not duplicated — see that
    // component's docstring). Shifting the sidebar down by the header's
    // height means its nav items start exactly where the header's left
    // section ends, reading as one continuous left column instead of the
    // header covering this sidebar's own top content.
    //
    // Zoom/overlap fix (2026-08-18): `top-16`/`h-[calc(100vh-4rem)]` had
    // the same "header is always exactly 64px" assumption as layout.tsx's
    // old `pt-16` (see that file's matching comment) — now driven by the
    // same `--header-height` var MarketRibbon.tsx keeps in sync with its
    // real rendered height, so this sidebar's top edge/height can never
    // drift out of alignment with however tall the header actually is.
    <aside className="hidden w-56 flex-col overflow-y-auto border-r border-border bg-surface md:fixed md:left-0 md:top-[var(--header-height)] md:flex md:h-[calc(100vh-var(--header-height))]">
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {(rewindOn ? [...SIDEBAR_LINK_ITEMS.slice(0, 4), REWIND_ITEM, ...SIDEBAR_LINK_ITEMS.slice(4)] : SIDEBAR_LINK_ITEMS).map((item) => {
          const active = isActiveSidebar(pathname, item.href);
          return (
            <Fragment key={item.href}>
              <Link
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-accent/10 text-accent" : "text-foreground-muted hover:bg-hover hover:text-foreground"
                )}
              >
                <item.icon size={17} strokeWidth={2} />
                {item.href === "/rewind" ? "Market Rewind" : item.label}
                {item.href === "/rewind" && rewindNew && <NewBadge />}
              </Link>
              {item.href === "/signals" && (
                <Link
                  href={REVIEW_HREF}
                  data-testid="sidebar-7day-review"
                  aria-current={isActive(pathname, REVIEW_HREF) ? "page" : undefined}
                  className={clsx(
                    "-mt-0.5 ml-5 flex items-center gap-2 rounded-lg border-l border-border py-2 pl-5 pr-3 text-sm font-medium transition-colors",
                    isActive(pathname, REVIEW_HREF) ? "bg-accent/10 text-accent" : "text-foreground-muted hover:bg-hover hover:text-foreground"
                  )}
                >
                  7-Day Review
                </Link>
              )}
            </Fragment>
          );
        })}
        <button
          onClick={openPanel}
          className={clsx(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
            askOpen ? "bg-accent/10 text-accent" : "text-foreground-muted hover:bg-hover hover:text-foreground"
          )}
        >
          <Sparkles size={17} strokeWidth={2} />
          RedixFi AI
        </button>
        <Link
          href="/more"
          aria-label="More options"
          className={clsx(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive(pathname, "/more") ? "bg-accent/10 text-accent" : "text-foreground-muted hover:bg-hover hover:text-foreground"
          )}
        >
          <MoreHorizontal size={17} strokeWidth={2} />
          More pages
        </Link>
      </nav>
      <div className="border-t border-border p-3">
        {user ? (
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-hover hover:text-foreground"
          >
            <User size={16} strokeWidth={2} />
            {user.tier === "free" ? "Account · Free" : `Account · ${user.tier}`}
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground"
          >
            Log in
          </Link>
        )}
        <Link
          href="/pricing"
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-hover hover:text-foreground"
        >
          <CreditCard size={16} strokeWidth={2} />
          Checkout
        </Link>
      </div>
      <div className="space-y-2 border-t border-border p-3">
        {user && (
          <div className="rounded-lg border border-border bg-surface p-2.5 text-xs">
            <p className="text-foreground-faint">You are on</p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <span className="font-semibold uppercase tracking-wide">{TIER_LABEL[user.tier] ?? user.tier} Plan</span>
              {user.tier !== "pro" && user.tier !== "founding" && (
                <Link href="/pricing" className="shrink-0 font-medium text-accent">
                  Upgrade Plan
                </Link>
              )}
            </div>
          </div>
        )}
        <div className="rounded-lg border border-border bg-surface p-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className={initialFresh ? "font-medium text-up" : "font-medium text-amber"}>
              {initialFresh ? "Market feed live" : "Market feed delayed"}
            </span>
            {initialOverview && (
              <span className="text-foreground-faint">
                {initialOverview.market_state === "OPEN" ? "Market open" : initialOverview.market_state === "PRE-OPEN" ? "Pre-open" : "Market closed"}
              </span>
            )}
          </div>
          {initialSignalsAsOf && <p className="mt-0.5 text-foreground-faint">{initialSignalsAsOf}</p>}
        </div>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const rewindOn = useHistoryEnabled();
  const rewindNew = useRewindNewBadge(pathname);
  const items = rewindOn ? NAV_ITEMS_BY_LAYOUT[NAV_MOBILE_LAYOUT] : NAV_ITEMS_NO_REWIND;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-border bg-surface-raised md:hidden" aria-label="Main">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-[12px] font-medium", active ? "text-accent-dim" : "text-foreground-faint")}
            aria-current={active ? "page" : undefined}
            aria-label={item.href === "/more" ? "More options" : undefined}
          >
            <item.icon size={19} strokeWidth={active ? 2.4 : 2} />
            {item.label}
            {item.href === "/rewind" && rewindNew && (
              <span className="absolute right-[18%] top-0.5 rounded-full bg-accent px-1 text-[9px] font-semibold leading-tight text-accent-foreground" data-testid="rewind-new-badge">
                New
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
