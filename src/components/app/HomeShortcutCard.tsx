import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { MOVED_TO_MORE } from "@/lib/nav-config";

/** Phone only: the item the bottom bar leaves out (NAV_MOBILE_LAYOUT A: Research, B: Intraday) stays one tap away from Home. */
export function HomeShortcutCard() {
  return (
    <Link
      href={MOVED_TO_MORE.href}
      className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 md:hidden"
      data-testid="home-shortcut-card"
    >
      <span>
        <span className="block text-sm font-semibold">{MOVED_TO_MORE.label}</span>
        <span className="block text-xs text-foreground-muted">{MOVED_TO_MORE.blurb}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-foreground-faint" aria-hidden />
    </Link>
  );
}
