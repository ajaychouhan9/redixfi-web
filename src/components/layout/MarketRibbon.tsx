"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getMarketOverview } from "@/lib/api/endpoints";
import { getInboxPage } from "@/lib/api/mutations";
import type { MarketOverview } from "@/lib/api/types";
import { FreshnessDot } from "@/components/ui/FreshnessDot";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AskRedixFi } from "@/components/app/ask/AskRedixFi";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { UserMenu } from "@/components/layout/UserMenu";
import { LogoMark } from "@/components/brand/LogoMark";
import { useAuth } from "@/lib/auth/AuthContext";

const POLL_MS = 60_000;

/**
 * CLS fix (2026-08-08) — this ribbon sits directly above `<main>` in
 * app/(app)/layout.tsx's shared flex column, and used to start every
 * render with `overview: null` (a small pulse skeleton), fetching
 * `/market/overview` purely client-side. Once that fetch resolved a few
 * hundred ms later, the ribbon grew from a slim placeholder to its full
 * multi-badge width/height, pushing `<main>` down — Lighthouse's
 * layout-shifts audit attributed essentially the entire measured CLS
 * (0.249, "needs improvement") to `<main>` itself, even though `<main>`'s
 * OWN content never changed — it just moved because its sibling above it
 * grew. Root-caused via Lighthouse's `layout-shifts` audit + reading
 * layout.tsx to confirm the DOM structure matched the flagged element's
 * selector exactly (`body > div.flex > div.flex > main.mb-14`).
 *
 * Fix: `layout.tsx` now fetches the SAME public, unauthenticated
 * `/market/overview` (already confirmed `@auth public` — identical for
 * every tier, no cloaking-relevant branch) server-side, once per request,
 * and seeds this component with real initial data — same `initial*`-prop
 * convention already established for EventRiskCard/SignalUnlockGate/
 * ResearchViewGate. The client-side poll below is UNCHANGED (still
 * refreshes every 60s for a long-lived tab) — this only removes the
 * skeleton flash on FIRST paint, which is what was causing the shift.
 *
 * Full-width fixed header (2026-08-11): this used to sit in-flow inside
 * layout.tsx's `md:ml-56` main-content column, so it started AFTER the
 * sidebar (left-misaligned with it). Now `fixed inset-x-0 top-0`, spanning
 * the ENTIRE viewport width including the sidebar's x-range, with its own
 * internal left section (exactly `w-56` = the sidebar's width) showing the
 * logo/wordmark/tagline block MOVED HERE from Sidebar.tsx — Sidebar no
 * longer renders its own copy (would otherwise be a duplicate sitting in
 * the exact same screen rectangle, one z-layer under this one). Sidebar.tsx
 * shifts its own `top`/`height` down by this header's height (`h-16`) so
 * its nav items start right where this header's left section ends,
 * reading as one continuous left column. layout.tsx's main content gets a
 * matching top offset. Left section hidden below `md` (no sidebar to align
 * with there) — mobile keeps its pre-existing single-row look.
 */
export function MarketRibbon({
  initialOverview = null,
  initialFresh = true,
  initialSignalsAsOf = null,
}: {
  initialOverview?: MarketOverview | null;
  initialFresh?: boolean;
  initialSignalsAsOf?: string | null;
}) {
  const { user, getToken } = useAuth();
  const [overview, setOverview] = useState<MarketOverview | null>(initialOverview);
  const [fresh, setFresh] = useState(initialFresh);
  const [signalsAsOf, setSignalsAsOf] = useState<string | null>(initialSignalsAsOf);
  const [error, setError] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const env = await getMarketOverview();
        if (!cancelled) {
          setOverview(env.data);
          setFresh(env.meta.data_fresh);
          setSignalsAsOf(env.meta.signals_as_of ?? null);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }
    // Initial data already came from the server (initialOverview) — the
    // first client-side call is the 60s-later refresh, not a duplicate
    // of work layout.tsx already did.
    const id = setInterval(load, POLL_MS);
    if (!initialOverview) load();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notification bell badge — reuses the SAME real inbox
  // getInboxPage()/InboxAlert data WatchlistAlertsCard already reads (B4's
  // 5 alert triggers), not a new endpoint. No dedicated unread-count route
  // exists, so this counts unread within the first page (size 20) rather
  // than the true all-time total — matches this ribbon's existing
  // "good-enough at a glance" posture (same as the freshness dot), not a
  // precise inbox count (the full /account/inbox page remains the source
  // of truth for that).
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const page = await getInboxPage(token, 1, 20);
      if (!cancelled) setUnreadCount(page.data.filter((i) => !i.read).length);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  const volatile = !!overview && overview.india_vix_change_pct > 5;
  const eventRisk = !!overview && overview.news_today.items_flagged_high > 0;

  return (
    // Mobile-overlap fix (2026-08-16): this was UNCONDITIONALLY `fixed`
    // with a hard `h-16`, while its own content row uses `flex-wrap` —
    // internally inconsistent below md, where the search box is hidden but
    // the remaining content (state chip, NIFTY, conditional volatility/
    // event-risk badges, ask/bell/avatar/theme icons) can still exceed one
    // row's width on a real phone (especially the event-risk badge's full
    // sentence, e.g. "1 high-severity event(s) today") — a wrapped second
    // row then rendered OUTSIDE the fixed 64px box, overlapping <main>
    // (whose `pt-16` in layout.tsx assumes the header is always exactly
    // 64px). Fixed the same way this file's own docstring says Sidebar.tsx
    // already handles the identical fixed-vs-mobile tension: `fixed` +
    // fixed height only from `md:` up; below md the ribbon is `relative`
    // (normal document flow) with `min-h-16` (not `h-16`) so a wrapped
    // second row simply grows the header in-flow and pushes <main> down —
    // overlap becomes structurally impossible below md, not merely rarer.
    // `layout.tsx`'s `pt-16` companion spacer is now `md:pt-16`
    // only, matching (no longer double-reserving space the in-flow ribbon
    // already occupies on mobile).
    <div className="relative z-40 flex min-h-16 w-full flex-wrap border-b border-border bg-surface md:fixed md:inset-x-0 md:top-0 md:h-16 md:flex-nowrap">
      {/* Left section — exactly the sidebar's width (w-56), hidden below
          md where Sidebar itself is hidden (BottomNav is the mobile nav
          instead). Content moved verbatim from Sidebar.tsx's old header
          block — Sidebar no longer renders it. */}
      <div className="hidden w-56 shrink-0 items-center gap-2 border-r border-border px-4 md:flex">
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

      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs sm:px-6">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {error && !overview && <span className="text-foreground-muted">Market data unavailable right now.</span>}
          {!overview && !error && <span className="h-4 w-40 animate-pulse rounded bg-hover" />}
          {overview && (
            <>
              <StateChip state={overview.market_state} />
              <span className="flex items-center gap-2 font-mono">
                <span className="font-sans font-medium text-foreground-muted">NIFTY</span>
                {/* Font-size fix (2026-08-11): value bumped to 15px per the
                    task's explicit target — label/delta unchanged. */}
                <span className="text-[15px] tabular-nums">{overview.nifty.close.toLocaleString("en-IN")}</span>
                <DeltaValue value={overview.nifty.change_pct} kind="pct" />
              </span>
              <span className="hidden items-center gap-2 font-mono sm:flex">
                <span className="font-sans font-medium text-foreground-muted">BANKNIFTY</span>
                <span className="text-[15px] tabular-nums">{overview.banknifty.close.toLocaleString("en-IN")}</span>
                <DeltaValue value={overview.banknifty.change_pct} kind="pct" />
              </span>
              {/* 2026-08-17 mobile-header fix: at 375-390px, StateChip +
                  NIFTY alone already run ~280px against ~343px of usable
                  width (px-4 padding both sides) — these 2 optional badges'
                  FULL sentence text (~140-200px each) were the single
                  biggest remaining width contributors once the search box/
                  AI-button-label/BANKNIFTY were already hidden or shrunk
                  (2026-08-16 fix). The row was still guaranteed to wrap
                  (structurally safe, not overlapping <main>, since that
                  fix), but a badge alone often forced its own extra wrapped
                  line, reading as cramped/"attached" rather than a clean
                  2-line layout. Shortened below `sm` (640px) to a compact
                  "Volatile"/"N event(s)" form — full sentence restored from
                  `sm:` up, where there's room for it on its own line even
                  if the row as a whole still wraps. */}
              {volatile && (
                <span className="rounded-full bg-amber-bg px-2 py-0.5 font-medium text-amber">
                  <span className="sm:hidden">Volatile</span>
                  <span className="hidden sm:inline">Volatility elevated</span>
                </span>
              )}
              {/* 2026-08-16: was static text — now a link to the same "See
                  all news" destination EventRiskCard.tsx already uses
                  (/news), reusing that existing full-list page rather than
                  building a new one. Only clickable/link-styled when count
                  > 0 — a 0-count badge never rendered here anyway (eventRisk
                  is only true when items_flagged_high > 0), so there's no
                  0-count case to special-case; kept as a plain span if that
                  ever changes rather than a Link with nothing to navigate to. */}
              {eventRisk && (
                <Link
                  href="/news"
                  className="rounded-full bg-amber-bg px-2 py-0.5 font-medium text-amber underline decoration-dotted underline-offset-2 hover:decoration-solid"
                >
                  <span className="sm:hidden">{overview.news_today.items_flagged_high} event(s)</span>
                  <span className="hidden sm:inline">{overview.news_today.items_flagged_high} high-severity event(s) today</span>
                </Link>
              )}
            </>
          )}
        </div>

        <HeaderSearch />

        <div className="flex items-center gap-2 text-foreground-faint sm:gap-3">
          {/* Task 10 A3: signals_as_of tells the user which session's
              composite scores they're looking at (e.g. "Scores as of 21 Jul
              close") — measured_signals now runs post-close (16:30), so
              "today" vs "yesterday" is no longer obvious from the clock alone.
              Font-size audit (2026-08-11): already text-xs = 12px, exactly
              the task's stated floor ("12px minimum") — no change needed. */}
          {signalsAsOf && <span className="hidden font-mono md:inline">{signalsAsOf}</span>}
          {overview && <FreshnessDot fresh={fresh} />}

          <AskRedixFi />

          <Link href="/account/inbox" aria-label="Inbox" className="relative flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-hover">
            <Bell size={13} />
            {unreadCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-[3px] font-mono text-[9px] font-semibold leading-none text-white"
                style={{ background: "var(--amber)" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          <UserMenu />

          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function StateChip({ state }: { state: string }) {
  const label = state === "OPEN" ? "Market open" : state === "PRE-OPEN" ? "Pre-open" : "Market closed";
  const tone = state === "OPEN" ? "bg-up-bg text-up" : "bg-neutral-bg text-neutral";
  // Font-size fix (2026-08-11): was inheriting the ribbon's text-xs (12px)
  // — bumped to the task's 13px minimum for the market status badge.
  return <span className={`rounded-full px-2 py-0.5 text-[13px] font-semibold ${tone}`}>{label}</span>;
}
