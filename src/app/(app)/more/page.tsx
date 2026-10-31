import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search, Zap, Bookmark, Bell } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { InstallRow } from "@/components/app/pwa/InstallRow";
import { HistoryMoreRow } from "@/components/app/history/HistoryLinks";
import { MOVED_TO_MORE, NAV_MOBILE_LAYOUT } from "@/lib/nav-config";
import { MORE_LINKS } from "@/lib/more-links";

export const metadata: Metadata = { title: "More", alternates: { canonical: "/more" } };

const LINKS = [
  // Layouts A and B: first item is the one the phone bottom bar leaves out (A: Research, B: Intraday).
  ...(MOVED_TO_MORE ? [{ href: MOVED_TO_MORE.href, label: MOVED_TO_MORE.label, icon: MOVED_TO_MORE.href === "/research" ? Search : Zap }] : []),
  // Layout C keeps this page working (links, bookmarks and the footer still point here); the menu in the header has the same items.
  ...(NAV_MOBILE_LAYOUT === "C"
    ? [
        { href: "/watchlist", label: "Watchlist", icon: Bookmark },
        { href: "/account/alerts", label: "Alerts", icon: Bell },
      ]
    : []),
  ...MORE_LINKS,
];

export default function MorePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-lg font-semibold">More</h1>
      <Card>
        <ul className="divide-y divide-border">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex min-h-[44px] items-center justify-between gap-3 py-3 text-sm font-medium hover:text-accent">
                <span className="flex items-center gap-3">
                  <l.icon size={16} className="text-accent" />
                  {l.label}
                </span>
                <ChevronRight size={15} className="text-foreground-faint" />
              </Link>
            </li>
          ))}
          <HistoryMoreRow />
          <InstallRow />
        </ul>
      </Card>
    </div>
  );
}
