import Link from "next/link";

import { REVIEW_PATH, REVIEW_TITLE } from "@/lib/review-copy";

/** "Signals | 7-Day Review": two pages with their own addresses, so each one can be indexed. */
export function ReviewTabs({ active }: { active: "signals" | "review" }) {
  const tabs = [
    { id: "signals", label: "Signals", href: "/signals" },
    { id: "review", label: REVIEW_TITLE, href: REVIEW_PATH },
  ] as const;
  return (
    <nav aria-label="Signals views" className="mb-4 inline-flex rounded-lg border border-border p-0.5" data-testid="signals-tabs">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={active === t.id ? "page" : undefined}
          data-testid={`signals-tab-${t.id}`}
          className={`flex min-h-11 items-center rounded-md px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            active === t.id ? "bg-accent/15 text-foreground ring-1 ring-accent" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
