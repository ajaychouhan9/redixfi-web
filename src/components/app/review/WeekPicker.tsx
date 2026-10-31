import Link from "next/link";

import { REVIEW_PATH } from "@/lib/review-copy";
import type { SevenDayReview } from "@/lib/api/types";

function iso(d: string) {
  return new Date(`${d}T00:00:00Z`);
}

/** The Monday of the date's week, so one link per week is shown. */
function weekKey(d: string): string {
  const t = iso(d);
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}

const label = (d: string) => iso(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** Earlier weeks: the last stored review of each week, newest first. The latest review is the plain page address (which is the one indexed). */
export function WeekPicker({ review }: { review: SevenDayReview }) {
  const weeks = review.weeks ?? [];
  const seen = new Set<string>();
  const weekLinks = weeks.filter((w) => {
    const k = weekKey(w.as_of);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (weekLinks.length < 2) return null;
  const latest = weekLinks[0].as_of;
  return (
    <nav aria-label="Other weeks" data-testid="week-picker" className="mb-4">
      <p className="mb-1 text-xs text-foreground-muted">Week ending</p>
      <ul className="flex flex-wrap gap-2">
        {weekLinks.slice(0, 6).map((w) => {
          const current = w.as_of === review.as_of;
          const href = w.as_of === latest ? REVIEW_PATH : `${REVIEW_PATH}?asof=${w.as_of}`;
          return (
            <li key={w.as_of}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                data-testid="week-link"
                className={`flex min-h-11 items-center rounded-full border px-3.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  current ? "border-accent bg-accent/15 text-foreground" : "border-border text-foreground-muted hover:text-foreground"
                }`}
              >
                {label(w.as_of)}
                {w.sessions < 5 && <span className="ml-1.5 text-xs text-foreground-muted">({w.sessions} sessions)</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
