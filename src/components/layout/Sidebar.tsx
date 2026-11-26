"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Home, FlaskConical, BarChart3, Activity, CalendarDays, Sparkles, UserCircle, CreditCard, type LucideIcon } from "lucide-react";
import { NAV_ITEMS, BOTTOM_ITEMS, activeNavId, type NavId } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { AccountPanel, initialsFor, useDismiss } from "@/components/layout/AccountMenu";

const ICONS: Record<NavId, LucideIcon> = {
  home: Home,
  lab: FlaskConical,
  screener: BarChart3,
  review: CalendarDays,
  market: Activity,
  ask: Sparkles,
  pricing: CreditCard,
  account: UserCircle,
};

/**
 * Desktop sidebar (corrected 18 Nov 2026): Home, Screener, 7-Day Review, Market Overview, Ask AI, Pricing, in that order, the same for a
 * logged-out and a logged-in visitor. "Start here" is not here; it is the button on Home. The sidebar needs no server data, so the (app)
 * layout makes no fetch of its own and every page keeps the refresh window it sets itself.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { open: askOpen, openPanel } = useAskPanel();
  const active = activeNavId(pathname);

  const row = (on: boolean) =>
    clsx(
      "flex min-h-[44px] items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-left text-sm transition-colors",
      // 26 Nov 2026: labels are full-strength text (at least #374151 on Light); the open page is bold with an accent bar, not only a faint tint
      on ? "border-accent bg-accent/10 font-bold text-foreground" : "border-transparent font-medium text-foreground hover:bg-hover",
    );

  return (
    <aside className="hidden w-56 flex-col overflow-y-auto border-r border-border bg-surface md:fixed md:left-0 md:top-[var(--header-height)] md:flex md:h-[calc(100vh-var(--header-height))]">
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
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
            <Link key={item.id} href={item.href} prefetch={false} data-testid={`nav-${item.id}`} aria-current={active === item.id ? "page" : undefined} className={row(active === item.id)}>
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Phone bottom bar: Home, Screener, Markets, Ask AI and Account (the profile icon; it opens the same account menu as the header). */
export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { open: askOpen, openPanel } = useAskPanel();
  const [accountOpen, setAccountOpen] = useState(false);
  const ref = useDismiss(accountOpen, () => setAccountOpen(false));
  const active = activeNavId(pathname);
  const cls = (on: boolean) =>
    clsx("relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-[12px] font-medium", on ? "text-accent-dim" : "text-foreground-faint");
  return (
    <div ref={ref}>
      {accountOpen && (
        <AccountPanel
          onClose={() => setAccountOpen(false)}
          className="fixed bottom-16 right-2 z-40 w-[min(18rem,calc(100vw-1rem))] overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg md:hidden"
        />
      )}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-border bg-surface-raised md:hidden" aria-label="Main">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = ICONS[item.id];
          if (item.id === "account") {
            const on = accountOpen || active === "account";
            return (
              <button key={item.id} type="button" onClick={() => setAccountOpen((o) => !o)} aria-haspopup="menu" aria-expanded={accountOpen} data-testid="bottom-account" className={cls(on)}>
                {user ? (
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent font-mono text-[12px] font-semibold text-accent-foreground">{initialsFor(user.name, user.email)}</span>
                ) : (
                  <Icon size={19} strokeWidth={on ? 2.4 : 2} />
                )}
                {item.short}
              </button>
            );
          }
          if (item.href === null) {
            return (
              <button key={item.id} type="button" onClick={openPanel} aria-pressed={askOpen} data-testid={`bottom-${item.id}`} className={cls(askOpen)}>
                <Icon size={19} strokeWidth={askOpen ? 2.4 : 2} />
                {item.short}
              </button>
            );
          }
          const on = active === item.id;
          return (
            <Link key={item.id} href={item.href} prefetch={false} data-testid={`bottom-${item.id}`} className={cls(on)} aria-current={on ? "page" : undefined}>
              <Icon size={19} strokeWidth={on ? 2.4 : 2} />
              {item.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
