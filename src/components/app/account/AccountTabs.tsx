"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { href: "/account", label: "Profile" },
  { href: "/account/watchlist", label: "Watchlist" },
  { href: "/account/portfolio", label: "Portfolio" },
  { href: "/account/alerts", label: "Alerts" },
  { href: "/account/inbox", label: "Inbox" },
];

export function AccountTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={clsx(
            "shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
            pathname === t.href ? "border-accent text-accent" : "border-transparent text-foreground-muted"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
