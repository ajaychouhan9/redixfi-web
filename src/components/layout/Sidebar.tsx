"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Home, BarChart3, Zap, Search, MoreHorizontal, User, CreditCard, Bookmark, Bell, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { LogoMark } from "@/components/brand/LogoMark";
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
const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/signals", label: "Signals", icon: BarChart3 },
  { href: "/intraday", label: "Intraday", icon: Zap },
  { href: "/research", label: "Research", icon: Search },
  { href: "/more", label: "More", icon: MoreHorizontal },
] as const;

// Desktop sidebar's full order (task-specified): Home / Signals / Intraday
// / Research / Alerts / Watchlist / AI Assistant / More. Watchlist used to
// sit in a separate section below the main nav (its own Link block); Alerts
// links to the real threshold-alert page (account/alerts/page.tsx, not a
// new route). "AI Assistant" isn't a route — no fabricated page — it's a
// second trigger into the SAME persistent AskRedixFi panel already in the
// header (see AskPanelContext), rendered as its own list item below.
const SIDEBAR_LINK_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/signals", label: "Signals", icon: BarChart3 },
  { href: "/intraday", label: "Intraday", icon: Zap },
  { href: "/research", label: "Research", icon: Search },
  { href: "/account/alerts", label: "Alerts", icon: Bell },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
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
  const { open: askOpen, setOpen: setAskOpen } = useAskPanel();

  return (
    // Fixed/sticky sidebar (2026-08-11): previously a normal in-flow flex
    // child of layout.tsx's `flex min-h-screen` row, stretched tall by
    // flex's default align-items:stretch — meaning it scrolled away with
    // the page instead of staying put. `md:fixed` + `md:h-screen` pins it
    // to the viewport at the md breakpoint (matching where it's shown at
    // all — `hidden`/`md:flex` unchanged below); `overflow-y-auto` lets its
    // OWN content scroll independently if it's ever taller than the
    // viewport (short screens). `shrink-0` dropped — meaningless once the
    // element is taken out of flow by `fixed`. layout.tsx's main-content
    // wrapper gets a matching `md:ml-56` to reserve the space this no
    // longer occupies in-flow.
    <aside className="hidden w-56 flex-col overflow-y-auto border-r border-border bg-surface md:fixed md:left-0 md:top-0 md:flex md:h-screen">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dim))" }}
        >
          <LogoMark size={15} variant="solid" className="text-[var(--accent-foreground)]" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-lg font-semibold tracking-tight">RedixFi</span>
          <span className="text-[10px] text-foreground-faint">Read the market. Understand it.</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {SIDEBAR_LINK_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-accent/10 text-accent" : "text-foreground-muted hover:bg-hover hover:text-foreground"
              )}
            >
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setAskOpen(true)}
          className={clsx(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
            askOpen ? "bg-accent/10 text-accent" : "text-foreground-muted hover:bg-hover hover:text-foreground"
          )}
        >
          <Sparkles size={17} strokeWidth={2} />
          AI Assistant
        </button>
        <Link
          href="/more"
          className={clsx(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive(pathname, "/more") ? "bg-accent/10 text-accent" : "text-foreground-muted hover:bg-hover hover:text-foreground"
          )}
        >
          <MoreHorizontal size={17} strokeWidth={2} />
          More
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
              {initialFresh ? "Live" : "Data delayed"}
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
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-border bg-surface-raised md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("flex flex-1 flex-col items-center gap-0.5 text-[11px] font-medium", active ? "text-accent" : "text-foreground-faint")}
          >
            <item.icon size={19} strokeWidth={active ? 2.4 : 2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
