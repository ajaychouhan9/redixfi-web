import Link from "next/link";

import { displayName } from "@/lib/company-name";
import { stockPath } from "@/lib/seo/stock-symbol";
import type { ReviewScRow, SevenDayReview } from "@/lib/api/types";

function List({ title, rows, id }: { title: string; rows: ReviewScRow[]; id: string }) {
  return (
    <div data-testid={id}>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-foreground-muted">None over this window.</p>
      ) : (
        <ol className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.symbol}>
              <Link href={stockPath("/signals", r.symbol)} className="flex min-h-[44px] items-center justify-between gap-3 py-1.5 text-sm hover:text-foreground" data-testid="sc-row">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{displayName(r.name) || r.symbol}</span>
                  <span className="block text-xs text-foreground-muted">{r.symbol}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums text-foreground-muted">
                  was {r.sc_start}, now {r.sc_end}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Block D: the biggest changes in Stock Condition between the start and the end of the window. Numbers only, in a neutral colour. */
export function ScChanges({ review }: { review: SevenDayReview }) {
  const sc = review.sc_changes!;
  return (
    <div data-testid="review-block-d">
      {sc.note && (
        <p className="mb-2 text-sm text-foreground-muted" data-testid="sc-note">
          {sc.note}
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <List title="Largest increases" rows={sc.up} id="sc-up" />
        <List title="Largest decreases" rows={sc.down} id="sc-down" />
      </div>
      <p className="mt-2 text-xs text-foreground-muted">
        Stock Condition is a number from 0 to 100 built from measured readings. The lists use liquid stocks only{sc.start_date ? `, comparing the close of ${sc.start_date} with the close of ${sc.end_date}` : ""}.
      </p>
    </div>
  );
}
