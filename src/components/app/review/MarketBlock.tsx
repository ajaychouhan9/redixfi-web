import { DeltaValue } from "@/components/ui/DeltaValue";
import { formatNumber } from "@/lib/format";
import type { ReviewIndexBlock, SevenDayReview } from "@/lib/api/types";

function Stat({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3" data-testid="market-stat">
      <dt className="text-xs text-foreground-muted">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold">
        {children}
        {note && <span className="mt-0.5 block text-xs font-normal text-foreground-muted">{note}</span>}
      </dd>
    </div>
  );
}

function Index({ b }: { b: ReviewIndexBlock | null }) {
  if (!b) return <span className="text-sm font-normal text-foreground-muted">Not available</span>;
  return (
    <>
      <DeltaValue value={b.pct} kind="pct" />
      <span className="mt-0.5 block text-xs font-normal text-foreground-muted tabular-nums">
        {formatNumber(b.start, 2)} → {formatNumber(b.end, 2)}
      </span>
    </>
  );
}

/** Block C: the market over the same window. A line we do not hold for the window is left out, never filled in. */
export function MarketBlock({ review }: { review: SevenDayReview }) {
  const m = review.market!;
  const f = m.flows;
  const crore = (v: number | null) => (v === null ? "-" : `${v > 0 ? "+" : ""}${formatNumber(v, 0)} crore`);
  return (
    <dl className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3" data-testid="review-block-c">
      <Stat label="Nifty 50">
        <Index b={m.nifty} />
      </Stat>
      <Stat label="Bank Nifty">
        <Index b={m.banknifty} />
      </Stat>
      <Stat label="India VIX">
        {m.vix ? (
          <>
            <DeltaValue value={m.vix.pct} kind="pct" />
            <span className="mt-0.5 block text-xs font-normal text-foreground-muted tabular-nums">
              {m.vix.start.toFixed(2)} → {m.vix.end.toFixed(2)}
            </span>
          </>
        ) : (
          <span className="text-sm font-normal text-foreground-muted">Not available</span>
        )}
      </Stat>
      <Stat label="Stocks advancing and declining" note={`Among ${m.breadth.n.toLocaleString("en-IN")} liquid stocks${m.breadth.unchanged ? `; ${m.breadth.unchanged} unchanged` : ""}`}>
        <span className="text-up">{m.breadth.advancing.toLocaleString("en-IN")} up</span>
        <span className="mx-1.5 text-foreground-muted">/</span>
        <span className="text-down">{m.breadth.declining.toLocaleString("en-IN")} down</span>
      </Stat>
      <Stat label="Industries higher" note="Industries whose middle stock rose over the window">
        {m.industries.higher} of {m.industries.total}
      </Stat>
      {f && (f.fii_net !== null || f.dii_net !== null) && (
        <Stat
          label="FII and DII net flow (cash)"
          note={f.complete ? `Sum over the ${f.sessions} sessions` : `Sum over the ${Math.max(f.fii_net_days, f.dii_net_days)} of ${f.sessions} sessions we hold`}
        >
          <span className="block text-sm">FII {crore(f.fii_net)}</span>
          <span className="block text-sm">DII {crore(f.dii_net)}</span>
        </Stat>
      )}
    </dl>
  );
}
