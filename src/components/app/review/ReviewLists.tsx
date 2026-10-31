"use client";

import { useState } from "react";
import Link from "next/link";

import { ConditionLabel } from "@/components/ui/ConditionLabel";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { Spark } from "@/components/app/review/Spark";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { stockPath } from "@/lib/seo/stock-symbol";
import { UNIVERSE_LABEL, UNIVERSE_ORDER, REVIEW_LIST_NOTE, REVIEW_INDEPENDENCE_NOTE } from "@/lib/review-copy";
import type { ReviewRow, ReviewUniverse, SevenDayReview } from "@/lib/api/types";

type Side = "gains" | "falls";

function Links({ symbol }: { symbol: string }) {
  const cls = "inline-flex min-h-[44px] items-center text-xs font-medium text-foreground underline decoration-accent underline-offset-2 hover:decoration-2";
  return (
    <span className="flex flex-wrap gap-x-4">
      <Link href={`/rewind?symbol=${encodeURIComponent(symbol)}`} className={cls}>
        Open in Market Rewind
      </Link>
      <Link href={stockPath("/research", symbol)} className={cls}>
        Research page
      </Link>
    </span>
  );
}

function Condition({ r }: { r: ReviewRow }) {
  if (r.sc_start === null && r.sc_end === null) return <span className="text-foreground-muted">-</span>;
  return (
    <span className="tabular-nums text-foreground-muted">
      {r.sc_start ?? "-"} <span aria-hidden>→</span>
      <span className="sr-only"> to </span> {r.sc_end ?? "-"}
    </span>
  );
}

const vr = (r: ReviewRow) => (r.vr === null ? "-" : `${r.vr.toFixed(1)}x`);
const dl = (r: ReviewRow) => (r.dl === null ? "-" : `${r.dl.toFixed(1)}%`);

function RowCards({ rows }: { rows: ReviewRow[] }) {
  return (
    <ul className="divide-y divide-border md:hidden" data-testid="review-cards">
      {rows.map((r, i) => (
        <li key={r.symbol} className="py-3" data-testid="review-row">
          <div className="flex items-start justify-between gap-3">
            <Link href={stockPath("/signals", r.symbol)} className="flex min-h-[44px] min-w-0 flex-col justify-center">
              <span className="truncate text-sm font-semibold">
                <span className="mr-1.5 text-xs font-normal text-foreground-muted">{i + 1}</span>
                {displayName(r.name) || r.symbol}
              </span>
              <span className="text-xs text-foreground-muted">{r.symbol}</span>
            </Link>
            <span className="shrink-0 pt-1 text-base">
              <DeltaValue value={r.pct} kind="pct" />
            </span>
          </div>
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-foreground-muted">Last close</dt>
              <dd className="tabular-nums">{r.close === null ? "-" : formatNumber(r.close, 2)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-foreground-muted">Condition</dt>
              <dd>
                <Condition r={r} />
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-foreground-muted">Volume vs 20-day</dt>
              <dd className="tabular-nums">{vr(r)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-foreground-muted">Delivery</dt>
              <dd className="tabular-nums">{dl(r)}</dd>
            </div>
          </dl>
          <div className="flex items-center justify-between gap-3">
            <Links symbol={r.symbol} />
            <Spark values={r.spark} label={`${r.symbol} closes, last 5 sessions`} tone={r.pct > 0 ? "up" : "down"} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RowTable({ rows }: { rows: ReviewRow[] }) {
  const th = "px-2 py-2 text-left text-xs font-medium text-foreground-muted";
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm" data-testid="review-table">
        <thead>
          <tr className="border-b border-border">
            <th className={th}>Company</th>
            <th className={`${th} text-right`}>Change</th>
            <th className={`${th} text-right`}>Last close</th>
            <th className={`${th} text-right`}>
              <ConditionLabel /> (start → now)
            </th>
            <th className={`${th} text-right`}>Volume vs 20-day avg</th>
            <th className={`${th} text-right`}>Delivery</th>
            <th className={th}>5 sessions</th>
            <th className={th}>Links</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.symbol} className="border-b border-border last:border-0" data-testid="review-row">
              <td className="px-2 py-1.5">
                <Link href={stockPath("/signals", r.symbol)} className="flex min-h-[44px] flex-col justify-center hover:text-foreground">
                  <span className="font-medium">
                    <span className="mr-1.5 text-xs font-normal text-foreground-muted">{i + 1}</span>
                    {displayName(r.name) || r.symbol}
                  </span>
                  <span className="text-xs text-foreground-muted">{r.symbol}</span>
                </Link>
              </td>
              <td className="px-2 py-1.5 text-right">
                <DeltaValue value={r.pct} kind="pct" />
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">{r.close === null ? "-" : formatNumber(r.close, 2)}</td>
              <td className="px-2 py-1.5 text-right">
                <Condition r={r} />
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">{vr(r)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{dl(r)}</td>
              <td className="px-2 py-1.5">
                <Spark values={r.spark} label={`${r.symbol} closes, last 5 sessions`} tone={r.pct > 0 ? "up" : "down"} />
              </td>
              <td className="px-2 py-1.5">
                <Links symbol={r.symbol} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Block A: the biggest gains and the biggest falls over the window, for one universe at a time (all four are already in the page data). */
export function ReviewLists({ review }: { review: SevenDayReview }) {
  const [universe, setUniverse] = useState<ReviewUniverse>("liquid");
  const [side, setSide] = useState<Side>("gains");
  const lists = review.lists![universe];
  const rows = lists[side];
  const u = review.universe![universe];
  const chip = (on: boolean) =>
    `flex min-h-11 items-center rounded-full border px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
      on ? "border-accent bg-accent/15 text-foreground" : "border-border text-foreground-muted hover:text-foreground"
    }`;
  const tab = (on: boolean) =>
    `min-h-11 flex-1 rounded-md px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
      on ? "bg-accent/15 text-foreground ring-1 ring-accent" : "text-foreground-muted hover:text-foreground"
    }`;
  return (
    <div data-testid="review-block-a">
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Universe">
        {UNIVERSE_ORDER.map((id) => (
          <button key={id} type="button" aria-pressed={universe === id} onClick={() => setUniverse(id)} className={chip(universe === id)} data-testid={`review-universe-${id}`}>
            {UNIVERSE_LABEL[id]}
          </button>
        ))}
      </div>
      <div className="mb-2 flex rounded-lg border border-border p-0.5 sm:max-w-sm" role="tablist" aria-label="Gains or falls">
        {(["gains", "falls"] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={side === s} onClick={() => setSide(s)} className={tab(side === s)} data-testid={`review-side-${s}`}>
            {s === "gains" ? "Biggest gains" : "Biggest falls"}
          </button>
        ))}
      </div>
      <p className="mb-1 text-xs text-foreground-muted" data-testid="review-universe-count">
        {UNIVERSE_LABEL[universe]}: {u.n.toLocaleString("en-IN")} stocks with a clean price change over the window{u.members ? ` (of ${u.members} in the index)` : ""}. Showing {rows.length}.
      </p>
      {rows.length === 0 ? (
        <p className="py-6 text-sm text-foreground-muted" data-testid="review-empty">
          {side === "gains" ? "No stock in this group rose over the window." : "No stock in this group fell over the window."}
        </p>
      ) : (
        <>
          <RowCards rows={rows} />
          <RowTable rows={rows} />
        </>
      )}
      <p className="mt-3 text-xs text-foreground-muted">{REVIEW_LIST_NOTE}</p>
      <p className="mt-1 text-xs text-foreground-muted">{REVIEW_INDEPENDENCE_NOTE}</p>
    </div>
  );
}
