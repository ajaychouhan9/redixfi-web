"use client";

import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { ConditionLabel } from "@/components/ui/ConditionLabel";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { Spark } from "@/components/app/review/Spark";
import { useMine } from "@/components/app/review/MineProvider";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { stockPath } from "@/lib/seo/stock-symbol";
import { MINE_STATUS_TEXT, REVIEW_EMPTY_WATCHLIST, REVIEW_LOGIN_PROMPT } from "@/lib/review-copy";
import type { ReviewMineRow } from "@/lib/api/types";

function Condition({ r }: { r: ReviewMineRow }) {
  if (r.sc_start === null && r.sc_end === null) return <span className="text-foreground-muted">-</span>;
  return (
    <span className="tabular-nums text-foreground-muted">
      {r.sc_start ?? "-"} <span aria-hidden>→</span>
      <span className="sr-only"> to </span> {r.sc_end ?? "-"}
    </span>
  );
}

function Row({ r }: { r: ReviewMineRow }) {
  const ok = r.status === "ok" && r.pct !== null;
  return (
    <li className="py-3" data-testid="mine-row">
      <div className="flex items-start justify-between gap-3">
        <Link href={stockPath("/signals", r.symbol)} className="flex min-h-[44px] min-w-0 flex-col justify-center">
          <span className="truncate text-sm font-semibold">{displayName(r.name) || r.symbol}</span>
          <span className="text-xs text-foreground-muted">{r.symbol}</span>
        </Link>
        <span className="shrink-0 pt-1 text-base">{ok ? <DeltaValue value={r.pct} kind="pct" /> : <span className="text-foreground-muted">-</span>}</span>
      </div>
      {ok ? (
        <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 text-xs">
          <span className="text-foreground-muted">
            Last close <span className="tabular-nums text-foreground">{r.close === null ? "-" : formatNumber(r.close, 2)}</span>
          </span>
          <span className="justify-self-end">
            <Spark values={r.spark} label={`${r.symbol} closes, last 5 sessions`} tone={(r.pct ?? 0) > 0 ? "up" : "down"} />
          </span>
          <span className="text-foreground-muted">
            Stock Condition <Condition r={r} />
          </span>
          <span className="justify-self-end">
            <Spark values={r.sc_spark} label={`${r.symbol} Stock Condition, last 5 sessions`} />
          </span>
        </div>
      ) : (
        <p className="mt-1 text-xs text-foreground-muted">{MINE_STATUS_TEXT[r.status] ?? MINE_STATUS_TEXT.no_data}</p>
      )}
    </li>
  );
}

/** Block B: the signed-in user's watchlist over the window. Logged out, the block is hidden: the rows are never requested and a one-line prompt is
 *  shown instead. */
export function YourStocks() {
  const mine = useMine();
  if (mine.status === "anonymous") {
    return (
      <p className="px-1 text-sm text-foreground-muted" data-testid="mine-login">
        <Link href="/login" className="inline-flex min-h-[44px] items-center font-medium text-foreground underline decoration-accent underline-offset-2 hover:decoration-2">
          {REVIEW_LOGIN_PROMPT}
        </Link>
      </p>
    );
  }
  return (
    <Card title="Your stocks">
      <div data-testid="review-block-b">
        {mine.status === "loading" && <p className="text-sm text-foreground-muted">Loading your watchlist…</p>}
        {mine.status === "error" && <p className="text-sm text-foreground-muted">Your watchlist could not be loaded right now.</p>}
        {mine.status === "ready" &&
          (mine.data.rows.length === 0 ? (
            <p className="text-sm text-foreground-muted" data-testid="mine-empty">
              {REVIEW_EMPTY_WATCHLIST}{" "}
              <Link href="/watchlist" className="font-medium text-foreground underline decoration-accent underline-offset-2 hover:decoration-2">
                Open Watchlist
              </Link>
            </p>
          ) : (
            <>
              <p className="mb-1 text-xs text-foreground-muted">
                <ConditionLabel /> is shown at the start of the window and at its end, with the last 5 sessions of each line.
              </p>
              <ul className="divide-y divide-border">
                {mine.data.rows.map((r) => (
                  <Row key={r.symbol} r={r} />
                ))}
              </ul>
            </>
          ))}
      </div>
    </Card>
  );
}
