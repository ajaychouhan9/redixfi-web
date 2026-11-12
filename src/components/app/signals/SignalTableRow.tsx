"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { SignalStateChip } from "@/components/ui/Chip";
import { LockedInline } from "@/components/ui/Locked";
import {
  COMPARISON_QUEUE_MAX,
  addToComparisonQueue,
  getComparisonQueue,
  onComparisonQueueChange,
  removeFromComparisonQueue,
} from "@/lib/comparison-queue";
import type { SignalRow } from "@/lib/api/types";
import { formatDataAsOf, formatPriceAsOf } from "@/lib/format";
import { from52Display } from "@/lib/from52-display";
import { stockPath } from "@/lib/seo/stock-symbol";
import { displayName } from "@/lib/company-name";
import { COLUMN_BY_ID, type ColumnCtx, type ColumnDef, type ColumnId } from "@/lib/screener-columns";

// Column order (2026-08-08, finalized spec): Symbol | Sector | Price |
// Score | Delivery | Volume | Signals | Event. Symbol/Price/Score are
// unconditional (never hidden, no picker entry) — Sector and Signals
// remain the two user-toggleable + responsive-collapsible columns
// (Signals collapses first as viewport narrows, then Sector — see the
// `lg`/`md` breakpoints below). Delivery/Volume/Event stay picker-
// toggleable but are not part of that responsive collapse sequence
// (unspecified by the task, left as their pre-existing behavior).
// VWAP removed entirely — it's an intraday-only concept (core/
// intraday_scan.py, computed from candles_intraday_15m) and this table
// runs on evening/post-close measured_signals data (Task 10) — wrong fit,
// correctly stays on the Intraday Scanner page only. Market cap removed
// as a table column (was optional/off-by-default already) — still a
// valid sort option in SignalsExplorer, sorting doesn't require a
// corresponding visible column.
export interface VisibleColumns {
  sector: boolean;
  delivery: boolean;
  volume: boolean;
  chips: boolean;
  eventRisk: boolean;
  from52: boolean;
  volatility: boolean;
}

/** The stacked primary-value + faint-context-line cell pattern this table
 * uses for Score, Delivery, and now Volume/Price — previously each cell
 * hand-rolled its own near-identical markup (and Price's own addition
 * last session actually used a DIFFERENT layout, flex-col, from Score/
 * Delivery's inline one) rather than sharing one real component. Pulled
 * out here so all four are now genuinely the same component, not just
 * visually similar. `locked` renders the existing LockedInline blur/lock
 * treatment (masked measured-signal fields); a `null` primary with
 * `locked` false renders a plain em-dash (genuinely no data, not masked
 * — the distinction B8 masking depends on). */
function StackedCell({
  locked,
  lockedFallback = "--",
  lockedTitle,
  primary,
  subtitle,
}: {
  locked?: boolean;
  lockedFallback?: string;
  lockedTitle?: string;
  primary: React.ReactNode | null;
  subtitle?: React.ReactNode;
}) {
  if (locked) {
    return (
      <LockedInline title={lockedTitle}>
        <span className="font-mono font-semibold">{lockedFallback}</span>
      </LockedInline>
    );
  }
  if (primary === null) {
    return <span className="text-foreground-faint">—</span>;
  }
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono font-semibold">{primary}</span>
      {subtitle != null && <span className="text-[12px] text-foreground-faint">{subtitle}</span>}
    </div>
  );
}

/** One Screener value: the measured figure with its unit and date, "n/a" when the source gave none, the lock on masked readings. */
export function ColumnValue({ def, row, ctx }: { def: ColumnDef; row: SignalRow; ctx: ColumnCtx }) {
  if (def.measured && row.locked) return <LockedInline><span className="font-mono font-semibold">--</span></LockedInline>;
  if (def.kind === "chips") {
    return <div className="flex flex-wrap gap-1">{(row.signal_states ?? []).slice(0, 2).map((s) => <SignalStateChip key={s} code={s} />)}</div>;
  }
  if (def.kind === "news") {
    return row.news_5d ? (
      <a href={row.news_5d.url ?? undefined} target="_blank" rel="noopener noreferrer" className="text-[12px] text-accent underline-offset-2 hover:underline" title={row.news_5d.headline}>News in the last 5 days</a>
    ) : <span className="text-foreground-faint">—</span>;
  }
  const c = def.cell(row, ctx);
  if (!c) return <span className="text-foreground-faint" data-testid={`na-${def.id}`}>n/a</span>;
  return (
    <div className="whitespace-nowrap">
      <div className="font-mono font-semibold">{c.primary}</div>
      {c.sub && <div className="text-[11px] text-foreground-faint">{c.sub}</div>}
    </div>
  );
}

/** The same value as one line of text, for the phone card: "P/E 18.4 (31 Mar 2026 qtr)" or "n/a". */
export function ColumnText({ def, row, ctx }: { def: ColumnDef; row: SignalRow; ctx: ColumnCtx }) {
  if (def.measured && row.locked) return <span className="text-foreground-faint">locked</span>;
  const c = def.cell(row, ctx);
  if (!c) return <span className="text-foreground-faint">n/a</span>;
  return <span className="font-mono text-foreground">{c.primary}{c.sub ? <span className="font-sans text-foreground-faint"> ({c.sub})</span> : null}</span>;
}

export function SignalTableRow({
  row,
  columns,
  priceGroupAsOf,
  priceGroupDate,
  readingsGroupDate,
  ids,
  ctx,
}: {
  row: SignalRow;
  columns: VisibleColumns;
  /** The Screener passes the chosen columns (14 Nov 2026); the other tables keep `columns`. */
  ids?: ColumnId[];
  ctx?: ColumnCtx;
  priceGroupAsOf?: string | null;
  priceGroupDate?: string | null;
  readingsGroupDate?: string | null;
}) {
  const locked = row.locked;
  const from52 = from52Display(row.week52_high, row.pct_below_52w_high, row.last_price);
  const rowPriceDate = row.price_data_as_of?.data_as_of?.slice(0, 10) ?? null;
  const showPriceAsOf = !!row.price_data_as_of
    && (priceGroupAsOf ? row.price_data_as_of.data_as_of !== priceGroupAsOf : rowPriceDate !== (priceGroupDate ?? null));
  const rowReadingsDate = row.data_as_of?.data_as_of?.slice(0, 10) ?? null;
  const showReadingsAsOf = !!row.data_as_of && rowReadingsDate !== (readingsGroupDate ?? null);
  const [queued, setQueued] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const sync = () => {
      const q = getComparisonQueue();
      setQueued(q.some((e) => e.symbol === row.symbol));
      setFull(q.length >= COMPARISON_QUEUE_MAX);
    };
    sync();
    return onComparisonQueueChange(sync);
  }, [row.symbol]);

  function toggleCompare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (queued) removeFromComparisonQueue(row.symbol);
    else addToComparisonQueue({ symbol: row.symbol, company_name: row.company_name });
  }

  const symbolTd = (
      <td className="whitespace-nowrap px-3 py-2.5">
        <Link href={stockPath("/signals", row.symbol)} className="font-mono font-semibold hover:text-accent">
          {row.symbol}
        </Link>
        {row.limited_data && (
          <span
            className="ml-1.5 rounded bg-surface-raised px-1 py-0.5 text-[9px] font-medium tracking-wide text-foreground-faint"
            title={row.limited_data_note ?? "Part of this stock's price or volume feed is missing"}
          >
            Feed incomplete
          </span>
        )}
        <div className="max-w-[16rem] truncate text-[12px] text-foreground-faint">{displayName(row.company_name)}</div>
        {showReadingsAsOf && <div className="whitespace-nowrap text-[10px] text-foreground-faint">{formatDataAsOf(row.data_as_of)}</div>}
      </td>
  );
  const priceTd = (
      <td className="px-3 py-2.5">
        <StackedCell
          primary={row.last_price !== null ? `₹${row.last_price.toLocaleString("en-IN")}` : null}
          subtitle={row.day_change_pct !== null ? <DeltaValue value={row.day_change_pct} kind="pct" className="text-[12px]" /> : row.corporate_action ? <span className="text-[12px] text-foreground-faint" title={row.corporate_action.note}>— note</span> : undefined}
        />
        {showPriceAsOf && <div className="text-[10px] text-foreground-faint">{formatPriceAsOf(row.price_data_as_of)}</div>}
      </td>
  );
  const compareTd = (
      <td className="px-3 py-2.5 text-right">
        <button
          onClick={toggleCompare}
          disabled={!queued && full}
          className="ml-auto flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={
            queued
              ? { background: "var(--hover)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }
              : { background: "transparent", color: "var(--foreground-faint)", border: "1px solid var(--border)" }
          }
          title={!queued && full ? `Comparison is full (max ${COMPARISON_QUEUE_MAX} stocks)` : undefined}
        >
          {queued ? <Check size={11} /> : <Plus size={11} />}
          {queued ? "Added" : "Compare"}
        </button>
      </td>
  );

  if (ids) {
    const c = ctx ?? {};
    return (
      <tr className="border-b border-border last:border-0 hover:bg-hover">
        {symbolTd}
        {priceTd}
        {ids.map((id) => (
          <td key={id} className="px-3 py-2.5">
            <ColumnValue def={COLUMN_BY_ID[id]} row={row} ctx={c} />
          </td>
        ))}
        {compareTd}
      </tr>
    );
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-hover">
      {symbolTd}
      {columns.sector && <td className="hidden px-3 py-2.5 text-xs text-foreground-muted md:table-cell">{row.sector}</td>}
      {/* Price: always visible (never hidden by the column picker or by
          viewport width) — last_price/day_change_pct are identity-level
          basic market data, never B8-masked, so `locked` is never passed
          here. */}
      {priceTd}
      {/* Score: always visible — unchanged position/behavior.
          Bug 1 fix (2026-08-22): `locked` here must be ONLY the real B8
          tier gate (`row.locked`), never OR'd with a `=== null` data check.
          row_from_joined already forces composite_score/delivery_pct/
          volume_ratio_5d to null whenever `locked` is true (core/
          signals_view.py), so a genuinely tier-locked row was ALREADY
          covered by `locked` alone — the `|| field === null` this used to
          carry could only ever fire an EXTRA case: a Basic/Pro row that is
          NOT tier-locked (backend already proved `locked: false`) but
          happens to have no measured_signals doc yet (a brand-new/thin-
          history stock). That extra case was rendering the exact same
          padlock as a real paywall, telling a paying Basic/Pro user to
          "upgrade" for data that doesn't exist for ANY tier. StackedCell
          already has the correct fallback for this (`primary === null` +
          `locked` false -> plain "—", see its own docstring above) — this
          callsite was just never letting that branch be reached. */}
      {columns.delivery && (
        <td className="hidden px-3 py-2.5 sm:table-cell">
          <StackedCell
            locked={locked}
            lockedFallback="--%"
            primary={row.delivery_pct !== null ? `${row.delivery_pct}%` : null}
            subtitle={row.delivery_avg20 !== null ? `avg ${row.delivery_avg20}%` : undefined}
          />
        </td>
      )}
      {columns.volume && (
        <td className="hidden px-3 py-2.5 sm:table-cell">
          <StackedCell
            locked={locked}
            lockedFallback="--x"
            primary={row.volume_ratio_5d !== null ? `${row.volume_ratio_5d}x` : null}
            subtitle="last 5 vs prior 20"
          />
        </td>
      )}
      {columns.from52 && (
        <td className="hidden whitespace-nowrap px-3 py-2.5 sm:table-cell">
          <StackedCell
            locked={locked}
            lockedFallback="--"
            primary={from52.belowPct === null ? "n/a" : from52.atHigh ? "at 52-week high" : `${from52.belowPct.toFixed(1)}% below`}
            subtitle={from52.high !== null ? `high ₹${from52.high.toLocaleString("en-IN")}` : undefined}
          />
        </td>
      )}
      {columns.volatility && (
        <td className="hidden whitespace-nowrap px-3 py-2.5 md:table-cell">
          <StackedCell
            locked={locked}
            lockedFallback="--"
            primary={row.vol_pct_more !== null ? `More volatile than ${row.vol_pct_more}%` : "n/a"}
            subtitle={row.vol_rank !== null && row.vol_ranked_of !== null ? `Rank ${row.vol_rank} of ${row.vol_ranked_of}` : undefined}
          />
        </td>
      )}
      {columns.chips && (
        <td className="hidden px-3 py-2.5 lg:table-cell">
          {!locked && (
            <div className="flex flex-wrap gap-1">
              {row.signal_states.slice(0, 2).map((s) => (
                <SignalStateChip key={s} code={s} />
              ))}
            </div>
          )}
        </td>
      )}
      {/* Step 4 mobile polish (2026-08-11): hidden below `sm` so the
          smallest viewports show exactly Symbol + Price + Score (+ the
          always-visible Compare action) — matches Delivery/Volume's own
          `sm:table-cell` treatment, was previously the one column with no
          responsive hide at all. Tapping a row's Symbol still opens the
          full stock detail page for everything hidden here. */}
      {columns.eventRisk && (
        <td className="hidden px-3 py-2.5 sm:table-cell">
          {row.news_5d ? (
            <a href={row.news_5d.url ?? undefined} target="_blank" rel="noopener noreferrer" className="text-[12px] text-accent underline-offset-2 hover:underline" title={row.news_5d.headline}>
              News in the last 5 days
            </a>
          ) : ""}
        </td>
      )}
      {compareTd}
    </tr>
  );
}

/** Phone layout (below md): one compact row per stock, nothing cut off and no sideways scroll. Left: symbol and company
 *  name. Right: the price with its full day change, and a compact score badge with its change. Same data as the table row;
 *  a locked (free-tier) score keeps the lock treatment. The badge is neutral on purpose (no colour for a high or low score). */
export function SignalMobileRow({
  row,
  priceGroupAsOf,
  priceGroupDate,
  extraIds,
  ctx,
}: {
  row: SignalRow;
  priceGroupAsOf?: string | null;
  priceGroupDate?: string | null;
  /** Screener columns beyond the fixed lines of the card: up to 4 shown, then "+N more". */
  extraIds?: ColumnId[];
  ctx?: ColumnCtx;
}) {
  const [showAll, setShowAll] = useState(false);
  const [queued, setQueued] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const sync = () => {
      const q = getComparisonQueue();
      setQueued(q.some((e) => e.symbol === row.symbol));
      setFull(q.length >= COMPARISON_QUEUE_MAX);
    };
    sync();
    return onComparisonQueueChange(sync);
  }, [row.symbol]);

  function toggleCompare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (queued) removeFromComparisonQueue(row.symbol);
    else addToComparisonQueue({ symbol: row.symbol, company_name: row.company_name });
  }

  const rowPriceDate = row.price_data_as_of?.data_as_of?.slice(0, 10) ?? null;
  const showPriceAsOf = !!row.price_data_as_of
    && (priceGroupAsOf ? row.price_data_as_of.data_as_of !== priceGroupAsOf : rowPriceDate !== (priceGroupDate ?? null));
  const from52 = from52Display(row.week52_high, row.pct_below_52w_high, row.last_price);
  const highLine = from52.high != null
    ? `52-week high ₹${from52.high.toLocaleString("en-IN")} · ${from52.belowPct != null ? (from52.atHigh ? "at 52-week high" : `${from52.belowPct.toFixed(1)}% below`) : "n/a below"}`
    : "52-week high n/a · n/a below";
  const volLine = row.volatility_text
    ?? (row.vol_pct_more != null ? `More volatile than ${row.vol_pct_more}%` : "n/a");

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5" data-testid="signal-mobile-row">
      <Link href={stockPath("/signals", row.symbol)} className="min-w-0 flex-1">
        <span className="font-mono text-sm font-semibold">{row.symbol}</span>
        {row.limited_data && <span className="ml-1.5 rounded bg-surface-raised px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-foreground-faint">Limited</span>}
        <div className="truncate text-[12px] text-foreground-faint">{displayName(row.company_name)}</div>
      </Link>
      <div className="shrink-0 text-right">
        {row.last_price !== null ? (
          <div className="whitespace-nowrap font-mono text-sm font-semibold">₹{row.last_price.toLocaleString("en-IN")}</div>
        ) : (
          <div className="text-foreground-faint">—</div>
        )}
        {row.day_change_pct !== null && (
          <div className="whitespace-nowrap">
            <DeltaValue value={row.day_change_pct} kind="pct" className="text-[12px]" />
          </div>
        )}
        {showPriceAsOf && <div className="text-[10px] text-foreground-faint">{formatPriceAsOf(row.price_data_as_of)}</div>}
      </div>
      <div className="flex w-14 shrink-0 flex-col items-end gap-0.5">
        {row.delivery_pct !== null && row.delivery_pct !== undefined ? (
          <span className="font-mono text-[12px]" aria-label={`Delivery ${row.delivery_pct} percent`}>{row.delivery_pct}%</span>
        ) : <span className="text-foreground-faint">—</span>}
        <span className="text-[10px] text-foreground-faint">Delivery</span>
      </div>
      <div className="mt-1 flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-foreground-faint">
          <span>{highLine}</span>
          {row.volume_ratio_5d !== null && <span>Volume vs usual {row.volume_ratio_5d}x</span>}
          <span>Volatility: {volLine}</span>
        </div>
        <button
          type="button"
          onClick={toggleCompare}
          disabled={!queued && full}
          aria-pressed={queued}
          className="shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={queued
            ? { background: "var(--hover)", color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)" }
            : { background: "transparent", color: "var(--foreground-faint)", borderColor: "var(--border)" }}
          title={!queued && full ? `Comparison is full (max ${COMPARISON_QUEUE_MAX} stocks)` : "Add to comparison"}
        >
          {queued ? <Check size={11} className="mr-0.5 inline" /> : <Plus size={11} className="mr-0.5 inline" />}
          {queued ? "Added" : "Compare"}
        </button>
      </div>
      {extraIds && extraIds.length > 0 && (
        <div className="flex w-full flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-foreground-muted" data-testid="mobile-extra-values">
          {(showAll ? extraIds : extraIds.slice(0, 4)).map((id) => (
            <span key={id} className="whitespace-nowrap">{COLUMN_BY_ID[id].label}: <ColumnText def={COLUMN_BY_ID[id]} row={row} ctx={ctx ?? {}} /></span>
          ))}
          {extraIds.length > 4 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="text-accent underline-offset-2 hover:underline">
              {showAll ? "Show fewer" : `+${extraIds.length - 4} more`}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
