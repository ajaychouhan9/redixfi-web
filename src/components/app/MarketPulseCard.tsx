import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { formatShortDate } from "@/lib/format";
import type { MarketOverview } from "@/lib/api/types";

/** "As of 15:38 IST" from an IST ISO time; null when unknown. */
function clock(iso: string | null | undefined): string | null {
  const m = iso ? /T(\d{2}:\d{2})/.exec(iso) : null;
  return m ? `As of ${m[1]} IST` : null;
}

/**
 * Market Pulse. Every number carries what it is: the India VIX change is the day's value against the previous close from the same stored index
 * snapshot as the Nifty (with its time); the FII/DII net flows are in ₹ crore for the trading date of the latest published file and are marked
 * "previous session" until the file for the current session is out. The badge comes only from the India VIX change.
 */
export function MarketPulseCard({ overview }: { overview: MarketOverview | null }) {
  if (!overview) {
    return (
      <Card title="Market Pulse">
        <p className="text-sm text-foreground-muted">Market data unavailable right now.</p>
      </Card>
    );
  }

  const vix = overview.india_vix;
  const vixPct = vix?.change_pct ?? overview.india_vix_change_pct;
  const volState = vixPct > 5 ? "VOLATILE" : vixPct < -5 ? "CALM" : "NORMAL";
  const flows = overview.fii_dii;
  const today = overview.market_session?.calendar_date ?? null;
  const flowsDate = flows?.date ?? null;
  const flowsNote = flowsDate ? `${formatShortDate(flowsDate)}${today && flowsDate < today ? " (previous session)" : ""}` : null;
  // The India VIX row carries its own time window (16 Nov 2026): the day of the reading, its clock time, and which close it is measured
  // against. The AI Daily Brief quotes a different India VIX figure from its own earlier window (about 06:30 IST, stated in its text).
  const prevClose = overview.market_session?.latest_completed_session ?? null;
  const vixDay = vix?.as_of_date ? formatShortDate(vix.as_of_date) : null;
  const vixClock = clock(vix?.as_of)?.replace(/^As of /, "") ?? null;
  const vixNote = vix
    ? [
        vixDay ? `${vixDay}${vixClock ? `, as of ${vixClock}` : ""}` : vixClock ? `As of ${vixClock}` : null,
        prevClose && vixDay && prevClose < (vix.as_of_date ?? "") ? `change against the ${formatShortDate(prevClose)} close` : "change against the previous close",
      ]
        .filter(Boolean)
        .join(" · ")
    : "Morning snapshot";
  const sectorsTotal = overview.sectors_up + overview.sectors_down;

  return (
    <Card title="Market Pulse" action={<span className="rounded bg-hover px-2 py-0.5 font-mono text-[12px] text-foreground-muted" title="From the India VIX change">{volState}</span>}>
      <div className="space-y-3">
        <p className="text-[12px] text-foreground-faint" data-testid="pulse-badge-note">The badge comes from the India VIX change.</p>
        <Row label="FII net (₹ crore)" note={flowsNote}>
          <DeltaValue value={flows?.fii_net ?? overview.fii_net} />
        </Row>
        <Row label="DII net (₹ crore)" note={flowsNote}>
          <DeltaValue value={flows?.dii_net ?? overview.dii_net} />
        </Row>
        <Row label="India VIX" note={vixNote}>
          <DeltaValue value={vixPct} kind="pct" />
        </Row>
        <div className="flex items-start justify-between gap-2 border-t border-border pt-2">
          <span className="min-w-0 text-xs text-foreground-muted" data-testid="pulse-sectors-label">
            NSE sector indices
            <span className="block text-[12px] text-foreground-faint">
              {sectorsTotal > 0 ? `${sectorsTotal.toLocaleString("en-IN")} tracked today: ` : ""}higher ↑ and lower ↓ than their previous close
            </span>
          </span>
          <span className="shrink-0 font-mono text-sm">
            <span className="text-up">{overview.sectors_up.toLocaleString("en-IN")}↑</span>{" "}
            <span className="text-down">{overview.sectors_down.toLocaleString("en-IN")}↓</span>
          </span>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, note, children }: { label: string; note?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="min-w-0 text-xs text-foreground-muted">
        {label}
        {note && <span className="block text-[12px] text-foreground-faint">{note}</span>}
      </span>
      <span className="shrink-0 font-mono text-sm">{children}</span>
    </div>
  );
}
