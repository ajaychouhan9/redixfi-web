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
  const vixNote = vix ? [clock(vix.as_of), vix.as_of_date ? `vs previous close, ${formatShortDate(vix.as_of_date)}` : "vs previous close"].filter(Boolean).join(" · ") : "Morning snapshot";

  return (
    <Card title="Market Pulse" action={<span className="rounded bg-hover px-2 py-0.5 font-mono text-[11px] text-foreground-muted" title="From the India VIX change">{volState}</span>}>
      <div className="space-y-3">
        <p className="text-[11px] text-foreground-faint" data-testid="pulse-badge-note">The badge comes from the India VIX change.</p>
        <Row label="FII net (₹ crore)" note={flowsNote}>
          <DeltaValue value={flows?.fii_net ?? overview.fii_net} />
        </Row>
        <Row label="DII net (₹ crore)" note={flowsNote}>
          <DeltaValue value={flows?.dii_net ?? overview.dii_net} />
        </Row>
        <Row label="India VIX" note={vixNote}>
          <DeltaValue value={vixPct} kind="pct" />
        </Row>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-xs text-foreground-muted">Sectors</span>
          <span className="font-mono text-sm">
            <span className="text-up">{overview.sectors_up}↑</span> <span className="text-down">{overview.sectors_down}↓</span>
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
        {note && <span className="block text-[10px] text-foreground-faint">{note}</span>}
      </span>
      <span className="shrink-0 font-mono text-sm">{children}</span>
    </div>
  );
}
