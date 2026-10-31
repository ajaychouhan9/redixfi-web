import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { HOME_SHORTCUTS_C, MOVED_TO_MORE, NAV_MOBILE_LAYOUT } from "@/lib/nav-config";

function Card({ href, label, blurb, testId }: { href: string; label: string; blurb: string; testId: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
      data-testid={testId}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-foreground-muted">{blurb}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-foreground-faint" aria-hidden />
    </Link>
  );
}

/** Phone only. Layouts A and B: the item the bottom bar leaves out (A: Research, B: Intraday) stays one tap away from Home.
 *  Layout C: a Research card and a Watchlist card side by side (Watchlist no longer has a tab or a More row). */
export function HomeShortcutCard() {
  if (NAV_MOBILE_LAYOUT === "C") {
    return (
      <div className="grid grid-cols-2 gap-3 md:hidden" data-testid="home-shortcuts">
        {HOME_SHORTCUTS_C.map((c) => (
          <Card key={c.href} href={c.href} label={c.label} blurb={c.blurb} testId={`home-shortcut-${c.label.toLowerCase()}`} />
        ))}
      </div>
    );
  }
  if (!MOVED_TO_MORE) return null;
  return (
    <div className="md:hidden">
      <Card href={MOVED_TO_MORE.href} label={MOVED_TO_MORE.label} blurb={MOVED_TO_MORE.blurb} testId="home-shortcut-card" />
    </div>
  );
}
