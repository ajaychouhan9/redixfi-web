"use client";

import { useState } from "react";
import Link from "next/link";

import { DeltaValue } from "@/components/ui/DeltaValue";
import { formatNumber } from "@/lib/format";
import { stockPath } from "@/lib/seo/stock-symbol";
import { displayName } from "@/lib/company-name";
import {
  EMPTY,
  LIQUID_NOTE,
  MORNING_FALLBACK_NOTE,
  MORNING_NOTE,
  RECAP_NOTE,
  SCAN_NOTE,
  UNIVERSE_LABEL,
  UNIVERSE_ORDER,
} from "@/lib/intraday-copy";
import type { IntradayTabData, IntradayUniverse, MorningGapRow, RecapRow, ScanMoveRow } from "@/lib/api/types";
import { Condition, Pct, Price, StockList, conditionHeader, type Col } from "./StockList";

type Side = "up" | "down";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function SideToggle({ side, onChange, upLabel, downLabel, id }: { side: Side; onChange: (s: Side) => void; upLabel: string; downLabel: string; id: string }) {
  const tab = (on: boolean) =>
    `min-h-11 flex-1 rounded-md px-4 text-sm font-medium ${focus} ${on ? "bg-accent/15 text-foreground ring-1 ring-accent" : "text-foreground-muted hover:text-foreground"}`;
  return (
    <div className="mb-2 flex rounded-lg border border-border p-0.5 sm:max-w-sm" role="group" aria-label="Rises or falls">
      {(["up", "down"] as const).map((s) => (
        <button key={s} type="button" aria-pressed={side === s} onClick={() => onChange(s)} className={tab(side === s)} data-testid={`${id}-${s}`}>
          {s === "up" ? upLabel : downLabel}
        </button>
      ))}
    </div>
  );
}

function UniverseChips({ value, onChange, id }: { value: IntradayUniverse; onChange: (u: IntradayUniverse) => void; id: string }) {
  const chip = (on: boolean) =>
    `flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${focus} ${on ? "border-accent bg-accent/15 text-foreground" : "border-border text-foreground-muted hover:text-foreground"}`;
  return (
    <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Universe">
      {UNIVERSE_ORDER.map((u) => (
        <button key={u} type="button" aria-pressed={value === u} onClick={() => onChange(u)} className={chip(value === u)} data-testid={`${id}-${u}`}>
          {UNIVERSE_LABEL[u]}
        </button>
      ))}
    </div>
  );
}

function Section({ title, subtitle, children, id }: { title: string; subtitle?: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="space-y-2" data-testid={id}>
      <div>
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-foreground-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Unavailable({ tab }: { tab: IntradayTabData["tab"] }) {
  return (
    <p className="py-6 text-sm text-foreground-muted" data-testid="intraday-unavailable">
      {EMPTY[tab]}
    </p>
  );
}

// ------------------------------------------------------------------------------------------------------------------ Morning
const gapCols: Col<MorningGapRow>[] = [
  { id: "gap", header: "Gap vs previous close", mobileLabel: "Gap", mobile: "main", cell: (r) => <Pct v={r.gap_pct} /> },
  { id: "pre", header: "Pre-open price", mobileLabel: "Pre-open", mobile: "pair", cell: (r) => <Price v={r.pre_open_price} /> },
  { id: "prev", header: "Previous close", mobileLabel: "Previous close", mobile: "pair", cell: (r) => <Price v={r.prev_close} /> },
  { id: "sc", header: conditionHeader, mobileLabel: "Condition", mobile: "pair", cell: (r) => <Condition sc={r.sc} locked={r.sc_locked} /> },
];

export function MorningBody({ d }: { d: IntradayTabData }) {
  const [side, setSide] = useState<Side>("up");
  if (!d.available) return <Unavailable tab="morning" />;
  const rows = (side === "up" ? d.up : d.down) ?? [];
  const cues = d.cues?.rows ?? [];
  const ev = d.events;
  return (
    <div className="space-y-8" data-testid="intraday-morning">
      {cues.length > 0 && (
        <Section id="morning-cues" title="Global cues" subtitle={`Change against the previous close${d.cues?.as_of ? `, as of ${new Date(d.cues.as_of).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })} IST` : ""}`}>
          <dl className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 lg:grid-cols-5">
            {cues.map((c) => (
              <div key={c.label} className="rounded-lg border border-border bg-surface p-3" data-testid="cue">
                <dt className="text-xs text-foreground-muted">{c.label}</dt>
                <dd className="mt-0.5 text-base font-semibold">
                  <DeltaValue value={c.pct} kind="pct" />
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      <Section id="morning-gaps" title="Largest gaps before the open" subtitle={`Top ${Math.max(d.up?.length ?? 0, d.down?.length ?? 0)} each way among liquid stocks in the pre-open scan`}>
        {d.coverage && d.coverage.in_pre_open_scan === 0 ? (
          <p className="py-6 text-sm text-foreground-muted" data-testid="morning-no-scan">
            {EMPTY.morning}
          </p>
        ) : (
          <>
            <SideToggle side={side} onChange={setSide} upLabel="Gap up" downLabel="Gap down" id="morning-side" />
            <StockList rows={rows} cols={gapCols} rewind testid="morning-list" empty={side === "up" ? "No liquid stock in the pre-open scan has an upward gap." : "No liquid stock in the pre-open scan has a downward gap."} />
          </>
        )}
        {d.coverage && (
          <p className="text-xs font-medium text-foreground" data-testid="morning-coverage">
            Pre-open prices for {(d.coverage.priced ?? d.coverage.in_pre_open_scan).toLocaleString("en-IN")} of {d.coverage.liquid.toLocaleString("en-IN")} liquid stocks
            {d.as_of ? ` as of ${new Date(d.as_of).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })}` : ""}.
          </p>
        )}
        <p className="text-xs text-foreground-muted">{MORNING_NOTE}</p>
        {d.source === "premarket_scan" && (
          <p className="text-xs text-foreground-muted" data-testid="morning-reduced">
            {MORNING_FALLBACK_NOTE}
          </p>
        )}
        {d.left_out && d.left_out.corporate_action + d.left_out.no_price > 0 && (
          <p className="text-xs text-foreground-muted" data-testid="morning-left-out">
            Left out: {d.left_out.corporate_action.toLocaleString("en-IN")} {d.left_out.corporate_action === 1 ? "stock" : "stocks"} with a corporate action effective today (the previous close changes) and{" "}
            {d.left_out.no_price.toLocaleString("en-IN")} without a valid pre-open price or previous close.
          </p>
        )}
        <p className="text-xs text-foreground-muted">{LIQUID_NOTE}</p>
      </Section>
      <Section id="morning-events" title="Results and board meetings today" subtitle="Among liquid stocks">
        {!ev || ev.n === 0 ? (
          <p className="text-sm text-foreground-muted">None listed for this session among liquid stocks.</p>
        ) : (
          <details data-testid="morning-events-details" open={ev.n <= 12}>
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">{ev.n.toLocaleString("en-IN")} {ev.n === 1 ? "company" : "companies"}</summary>
            <ul className="mt-1 grid grid-cols-1 gap-x-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
              {ev.rows.map((e) => (
                <li key={e.symbol}>
                  <Link href={stockPath("/research", e.symbol)} className="flex min-h-11 items-center justify-between gap-2 text-sm hover:text-foreground">
                    <span className="min-w-0 truncate">{displayName(e.name) || e.symbol}</span>
                    <span className="shrink-0 text-xs text-foreground-muted">{e.what}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------------------------- Scan
const scanCols: Col<ScanMoveRow>[] = [
  { id: "pct", header: "Change vs previous close", mobileLabel: "Change", mobile: "main", cell: (r) => <Pct v={r.pct} /> },
  { id: "price", header: "Price", mobileLabel: "Price", mobile: "pair", cell: (r) => <Price v={r.price} /> },
  { id: "vr", header: "Volume vs usual so far", mobileLabel: "Volume vs usual", mobile: "pair", cell: (r) => <span className="tabular-nums">{r.vr === null ? "-" : `${r.vr.toFixed(1)}x`}</span> },
  { id: "sc", header: conditionHeader, mobileLabel: "Condition", mobile: "pair", cell: (r) => <Condition sc={r.sc} locked={r.sc_locked} /> },
];

export function ScanBody({ d }: { d: IntradayTabData }) {
  const [universe, setUniverse] = useState<IntradayUniverse>("nifty500");
  const [side, setSide] = useState<Side>("up");
  if (!d.available || !d.lists) return <Unavailable tab="scan" />;
  const rows = d.lists[universe][side];
  const size = d.universe?.sizes?.[universe];
  return (
    <div className="space-y-3" data-testid="intraday-scan">
      <Section id="scan-moves" title="Largest moves so far" subtitle="Change since the previous close, top 25 each way">
        <UniverseChips value={universe} onChange={setUniverse} id="scan-universe" />
        <SideToggle side={side} onChange={setSide} upLabel="Up" downLabel="Down" id="scan-side" />
        <p className="text-xs text-foreground-muted" data-testid="scan-count">
          {UNIVERSE_LABEL[universe]}: {size !== undefined ? `${size.toLocaleString("en-IN")} stocks with a price today. ` : ""}Showing {rows.length}.
        </p>
        <StockList
          rows={rows}
          cols={scanCols}
          rewind
          testid="scan-list"
          empty={side === "up" ? "No stock in this group is above its previous close." : "No stock in this group is below its previous close."}
          spark={(r) => ({ values: r.spark, tone: r.pct > 0 ? "up" : "down" })}
        />
        <p className="text-xs text-foreground-muted">{SCAN_NOTE}</p>
        <p className="text-xs text-foreground-muted">{LIQUID_NOTE}</p>
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------------------------- Recap
function recapCols(listedHeader: string, listedFmt: (r: RecapRow) => React.ReactNode): Col<RecapRow>[] {
  return [
    { id: "final", header: "Change by the end of the day", mobileLabel: "Day change", mobile: "main", cell: (r) => <Pct v={r.pct} /> },
    { id: "listed", header: listedHeader, mobileLabel: listedHeader, mobile: "pair", cell: listedFmt },
    { id: "close", header: "Last price", mobileLabel: "Last price", mobile: "pair", cell: (r) => <Price v={r.close} /> },
    { id: "range", header: "Day low - high", mobileLabel: "Day low - high", mobile: "pair", cell: (r) => <span className="tabular-nums">{formatNumber(r.low, 2)} - {formatNumber(r.high, 2)}</span> },
    { id: "sc", header: conditionHeader, mobileLabel: "Condition", mobile: "pair", cell: (r) => <Condition sc={r.sc} locked={r.sc_locked} /> },
  ];
}

const gapListed = (r: RecapRow) => (r.listed === null ? "-" : <Pct v={r.listed} />);

function MarketDay({ d }: { d: IntradayTabData }) {
  const m = d.market;
  if (!m) return null;
  const idx = (label: string, v?: { close: number; pct: number | null }) =>
    v ? (
      <div className="rounded-lg border border-border bg-surface p-3" data-testid="market-day-stat">
        <dt className="text-xs text-foreground-muted">{label}</dt>
        <dd className="mt-0.5 text-base font-semibold">
          <DeltaValue value={v.pct} kind="pct" />
          <span className="mt-0.5 block text-xs font-normal text-foreground-muted tabular-nums">{formatNumber(v.close, 2)}</span>
        </dd>
      </div>
    ) : null;
  return (
    <Section id="recap-market" title="The market's day" subtitle="Change against the previous close">
      <dl className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {idx("Nifty 50", m.nifty)}
        {idx("Bank Nifty", m.banknifty)}
        {idx("India VIX", m.vix)}
        <div className="rounded-lg border border-border bg-surface p-3" data-testid="market-day-stat">
          <dt className="text-xs text-foreground-muted">Stocks advancing and declining</dt>
          <dd className="mt-0.5 text-base font-semibold">
            <span className="text-up">{m.breadth.advancing.toLocaleString("en-IN")} up</span>
            <span className="mx-1.5 text-foreground-muted">/</span>
            <span className="text-down">{m.breadth.declining.toLocaleString("en-IN")} down</span>
            <span className="mt-0.5 block text-xs font-normal text-foreground-muted">Among {m.breadth.n.toLocaleString("en-IN")} liquid stocks, the whole market</span>
          </dd>
        </div>
      </dl>
    </Section>
  );
}

export function RecapBody({ d }: { d: IntradayTabData }) {
  const [mSide, setMSide] = useState<Side>("up");
  const [universe, setUniverse] = useState<IntradayUniverse>("nifty500");
  const [sSide, setSSide] = useState<Side>("up");
  if (!d.available || !d.morning || !d.scan) return <Unavailable tab="recap" />;
  const mRows = d.morning[mSide];
  const sRows = d.scan.lists[universe][sSide];
  const at = d.scan.as_listed_at ? new Date(d.scan.as_listed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : null;
  return (
    <div className="space-y-8" data-testid="intraday-recap">
      {d.final === false && (
        <p className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground-muted" data-testid="recap-not-final">
          The day's last prices are still being collected. These numbers are as of the last update.
        </p>
      )}
      <MarketDay d={d} />
      <Section id="recap-morning" title="How the Morning lists ended the day" subtitle="The largest pre-open gaps, each stock with its own day">
        <SideToggle side={mSide} onChange={setMSide} upLabel="Gap up" downLabel="Gap down" id="recap-morning-side" />
        <StockList rows={mRows} cols={recapCols("Pre-open gap", gapListed)} rewind testid="recap-morning-list" empty="No stocks were listed on this side in Morning." />
      </Section>
      <Section id="recap-scan" title="How the Scan lists ended the day" subtitle={`The largest moves, as listed${at ? ` at the ${at} IST update` : ""}, each stock with its own day`}>
        <UniverseChips value={universe} onChange={setUniverse} id="recap-universe" />
        <SideToggle side={sSide} onChange={setSSide} upLabel="Up" downLabel="Down" id="recap-scan-side" />
        <StockList rows={sRows} cols={recapCols("Change when listed", gapListed)} rewind testid="recap-scan-list" empty="No stocks were listed on this side in Scan." />
      </Section>
      <p className="text-xs text-foreground-muted">{RECAP_NOTE}</p>
      <p className="text-xs text-foreground-muted">{LIQUID_NOTE}</p>
    </div>
  );
}
