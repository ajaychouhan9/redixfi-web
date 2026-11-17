"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Home, BarChart3, Activity, CalendarDays, Sparkles, UserCircle, Compass, type LucideIcon } from "lucide-react";
import { NAV_ITEMS, activeNavId, type NavId } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";

const ICONS: Record<NavId, LucideIcon> = {
  home: Home,
  screener: BarChart3,
  market: Activity,
  review: CalendarDays,
  ask: Sparkles,
  me: UserCircle,
};

/**
 * Desktop sidebar (17 Nov 2026): Home, Screener, Market today, 7-Day Review, Ask AI, Me. A logged-out visitor also gets "Start here" on top.
 * The sidebar needs no server data (the market status that used to sit at its foot is on the Market today page), so the (app) layout makes
 * no fetch of its own and every page keeps the refresh window it sets itself.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { open: askOpen, openPanel } = useAskPanel();
  const active = activeNavId(pathname);

  const row = (on: boolean) =>
    clsx(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
      on ? "bg-accent/10 text-accent" : "text-foreground-muted hover:bg-hover hover:text-foreground",
    );

  return (
    <aside className="hidden w-56 flex-col overflow-y-auto border-r border-border bg-surface md:fixed md:left-0 md:top-[var(--header-height)] md:flex md:h-[calc(100vh-var(--header-height))]">
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
        {!user && (
          <Link href="/start" data-testid="sidebar-start-here" className={row(pathname === "/start")}>
            <Compass size={17} strokeWidth={2} />
            Start here
          </Link>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.id];
          if (item.href === null) {
            return (
              <button key={item.id} type="button" onClick={openPanel} aria-pressed={askOpen} data-testid={`nav-${item.id}`} className={row(askOpen)}>
                <Icon size={17} strokeWidth={2} />
                {item.label}
              </button>
            );
          }
          return (
            <Link key={item.id} href={item.href} data-testid={`nav-${item.id}`} aria-current={active === item.id ? "page" : undefined} className={row(active === item.id)}>
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Phone bottom bar: the same six items with short labels. */
export function BottomNav() {
  const pathname = usePathname();
  const { open: askOpen, openPanel } = useAskPanel();
  const active = activeNavId(pathname);
  const cls = (on: boolean) =>
    clsx("relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", on ? "text-accent-dim" : "text-foreground-faint");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-border bg-surface-raised md:hidden" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.id];
        const on = item.href === null ? askOpen : active === item.id;
        if (item.href === null) {
          return (
            <button key={item.id} type="button" onClick={openPanel} aria-pressed={askOpen} data-testid={`bottom-${item.id}`} className={cls(on)}>
              <Icon size={19} strokeWidth={on ? 2.4 : 2} />
              {item.short}
            </button>
          );
        }
        return (
          <Link key={item.id} href={item.href} data-testid={`bottom-${item.id}`} className={cls(on)} aria-current={on ? "page" : undefined}>
            <Icon size={19} strokeWidth={on ? 2.4 : 2} />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}
