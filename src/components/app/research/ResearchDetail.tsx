import Link from "next/link";
import type { ResearchDetail as ResearchDetailType, Candle, PeerRow } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { AiLabel } from "@/components/ui/AiLabel";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { Sparkline } from "@/components/ui/Sparkline";
import { GenericRecordTable } from "@/components/ui/GenericRecordTable";
import { Collapsible } from "@/components/ui/Collapsible";
import { Chip } from "@/components/ui/Chip";
import { NewsList } from "@/components/app/NewsList";
import { RecordView } from "@/components/app/RecordView";
import { FundamentalsPanels } from "@/components/app/research/FundamentalsPanels";
import { ResearchChart } from "@/components/app/research/ResearchChart";
import { ResearchExportButton } from "@/components/app/research/ResearchExportButton";
import { AlertCreateButton } from "@/components/app/alerts/AlertCreateButton";
import { CompareIndicator } from "@/components/app/CompareIndicator";
import { WatchlistButton } from "@/components/app/WatchlistButton";
import { CurrentSymbolSync } from "@/components/app/CurrentSymbolSync";
import { ConcallSummary } from "@/components/app/research/ConcallSummary";
import { AnnualReportSummaryCard } from "@/components/app/research/AnnualReportSummaryCard";
import { formatDateIst } from "@/lib/format";

// Concall tone -> the app's existing semantic color tones (Chip component),
// same palette Event Risk Today's severity badges use. Real values per
// ConcallTranscript.tone_label (types.ts) are exactly Positive/Neutral/
// Negative/Mixed — no "Cautious"/"Unknown" value exists on the type, but a
// defensive fallback (no badge) is kept per the task's own spec anyway.
const TONE_CHIP_TONE: Record<string, "up" | "down" | "amber"> = {
  Positive: "up",
  Negative: "down",
  Mixed: "amber",
  Neutral: "amber",
};

/**
 * Task 14 — pure presentational component: every prop here is already
 * resolved server-side by app/(app)/research/[symbol]/page.tsx (SSR +
 * ISR, same pattern as the working app/(app)/signals/[symbol]/page.tsx
 * reference implementation), so this renders directly into the initial
 * HTML response instead of a client-fetched "Loading…" placeholder.
 * The only remaining client-side pieces are genuinely interactive leaves
 * (ResearchChart's range toggle + on-demand intraday fetch,
 * CompareIndicator, ResearchExportButton, FundamentalsPanels' Collapsible
 * sections) — none of them gate the INITIAL content the way the old
 * data-fetching version of this component did.
 */
export function ResearchDetail({
  data,
  dailyCandles,
  peers,
  peersError,
}: {
  data: ResearchDetailType;
  dailyCandles: Candle[];
  peers: PeerRow[] | null;
  peersError: boolean;
}) {
  const positionPct = Math.max(0, Math.min(100, data.price.week52_position_pct));

  return (
    <div className="space-y-4">
      <CurrentSymbolSync symbol={data.symbol} />
      <RecordView symbol={data.symbol} companyName={data.company_name} />

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-foreground-muted">
            {data.symbol} · {data.sector}
          </p>
          {/* B2: task's 3 buttons are Compare / Add to Watchlist / Set Alert
              — audit found "Add to Watchlist" genuinely missing here (the
              nearby RecordView is unrelated, recently-viewed tracking, not
              a watchlist toggle). Added the same real WatchlistButton the
              Signal detail page already uses — not a new component. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ResearchExportButton data={data} peers={peers} />
            <CompareIndicator symbol={data.symbol} companyName={data.company_name} />
            <WatchlistButton symbol={data.symbol} />
            <AlertCreateButton symbol={data.symbol} />
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-semibold">₹{data.price.last_price.toLocaleString("en-IN")}</span>
          <DeltaValue value={data.price.day_change_pct} kind="pct" />
        </div>
        <div className="mt-2 max-w-xs">
          <div className="h-1.5 w-full rounded-full bg-neutral-bg">
            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${positionPct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-foreground-faint">
            <span>52wk low ₹{data.price.week52_low}</span>
            <span>52wk high ₹{data.price.week52_high}</span>
          </div>
        </div>

        {/* B1 Signal Snapshot (2026-08-11) — compact, near the top, per the
            task. Uses ONLY data already fetched for this page
            (signal_summary: composite_score/delta_1d — ResearchSignalSummary,
            confirmed via types.ts), no new API call. The task's fuller
            mockup also asked for a Price Momentum/Volume/Trend/News/
            Ownership Positive/Negative/Neutral breakdown — audited and
            REPORTED rather than guessed: that breakdown doesn't exist in
            this page's fetched data at all (it lives behind /signals/
            {symbol}'s SignalDetail.signals, a different endpoint
            AnalystChecklist.tsx uses on the Signals page) — building it
            here would mean either a new backend request (not allowed this session) or inventing
            thresholds not backed by real measured_signals categorization,
            so it was deliberately left out rather than fabricated. The
            fuller "Signal summary" card lower on this page (narrative +
            link to the full Signal Dashboard) is unchanged. */}
        {data.signal_summary.composite_score !== null && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-faint">Signal snapshot</span>
            <span className="text-lg font-semibold">{data.signal_summary.composite_score}/100</span>
            {data.signal_summary.delta_1d !== null && <DeltaValue value={data.signal_summary.delta_1d} />}
            <Link href={`/signals/${data.symbol}`} className="ml-auto text-xs font-medium text-accent">
              Full signal detail →
            </Link>
          </div>
        )}
      </div>

      <ErrorBoundary>
        <ResearchChart symbol={data.symbol} dailyCandles={dailyCandles} />
      </ErrorBoundary>

      <ErrorBoundary>
        <FundamentalsPanels symbol={data.symbol} fundamentals={data.fundamentals} peers={peers} peersError={peersError} />
      </ErrorBoundary>

      {/* B3 (2026-08-11): was a plain always-open Card — task expects this
          collapsed by default alongside Corporate events below. Converted
          to the same Collapsible component FundamentalsPanels already uses
          (reuse, not a new component), title updated to the task's literal
          "Smart Money & Activity" wording. */}
      <Collapsible question="Smart Money & Activity">
        <div className="space-y-4">
          <ErrorBoundary>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Delivery (30d)</h3>
              {data.delivery_30d.length > 1 ? (
                <div className="text-accent">
                  <Sparkline
                    values={[...data.delivery_30d].sort((a, b) => a.date.localeCompare(b.date)).map((d) => d.delivery_pct)}
                  />
                </div>
              ) : (
                <p className="text-sm text-foreground-muted">Not enough data.</p>
              )}
            </div>
          </ErrorBoundary>

          <ErrorBoundary>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Insider trades</h3>
              {data.insider_trades.length === 0 ? (
                <p className="text-sm text-foreground-muted">No insider filings recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                      <tr>
                        <th className="py-1.5 pr-3">Date</th>
                        <th className="py-1.5 pr-3">Insider</th>
                        <th className="py-1.5 pr-3">Type</th>
                        <th className="py-1.5 pr-3">Qty</th>
                        <th className="py-1.5 pr-3">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.insider_trades.slice(0, 10).map((t) => (
                        <tr key={t.filing_id} className="border-t border-border">
                          <td className="py-1.5 pr-3">{formatDateIst(t.trade_date)}</td>
                          <td className="py-1.5 pr-3">{t.insider_name || "—"}</td>
                          <td className="py-1.5 pr-3">{t.transaction_type}</td>
                          <td className="py-1.5 pr-3 tabular-nums">{t.quantity.toLocaleString("en-IN")}</td>
                          <td className="py-1.5 pr-3 tabular-nums">₹{t.value_amount.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </ErrorBoundary>

          <ErrorBoundary>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Bulk/block deals</h3>
              <GenericRecordTable rows={data.bulk_block_deals} emptyText="No bulk/block deals recorded recently." />
            </div>
          </ErrorBoundary>

          <ErrorBoundary>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Promoter pledge</h3>
              {data.pledge_history.length === 0 ? (
                <p className="text-sm text-foreground-muted">No pledge data recorded.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.pledge_history.slice(0, 4).map((p, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span className="text-foreground-muted">{p.quarter}</span>
                      <span>
                        {p.pledged_pct}% · {p.risk_level}
                        {p.pledge_trend && <> · {p.pledge_trend.toLowerCase()}</>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ErrorBoundary>

          <ErrorBoundary>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Options PCR</h3>
              {data.options_pcr_history.length === 0 ? (
                <p className="text-sm text-foreground-muted">Options data not available.</p>
              ) : (
                <>
                  <p className="text-sm">
                    Latest: <span className="font-medium tabular-nums">{data.options_pcr_history[0].pcr}</span>{" "}
                    <span className="text-foreground-faint">({data.options_pcr_history[0].pcr > 1 ? "put-heavy" : "call-heavy"})</span>
                  </p>
                  <div className="mt-1 text-accent">
                    <Sparkline values={[...data.options_pcr_history].reverse().map((p) => p.pcr)} />
                  </div>
                </>
              )}
            </div>
          </ErrorBoundary>
        </div>
      </Collapsible>

      <ErrorBoundary>
        <Collapsible question="Corporate events">
          <GenericRecordTable rows={data.corporate_events} emptyText="No upcoming corporate events recorded." />
        </Collapsible>
      </ErrorBoundary>

      <ErrorBoundary>
        <Card title="News timeline">
          <NewsList items={data.news} />
        </Card>
      </ErrorBoundary>

      <ErrorBoundary>
        {/* Font-size audit (2026-08-11): Card's shared default title is
            text-sm (14px) — below the task's 15-16px minimum for section
            headings. Bumped ONLY these 2 named headings via the new
            titleClassName prop rather than changing Card's sitewide
            default (would ripple across every Card on every page). */}
        <Card title="Concalls & investor presentations" titleClassName="text-base" action={<AiLabel />}>
          {data.concall_transcripts.length === 0 ? (
            <p className="text-sm text-foreground-muted">No concall transcripts or investor presentations recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {data.concall_transcripts.map((c, i) => (
                // Extra `mt-3` on every card after the first (2026-08-11
                // contrast fix) — widens the gap between the previous
                // card's attribution line and this card's own top border,
                // per the task's explicit ask.
                <div key={i} className={i > 0 ? "mt-3 border-t border-border pt-4" : ""}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* A2: tone badge moved right after the filing-type
                        chip, before the date; "Tone (this document):"
                        prefix dropped — the badge label IS the tone now.
                        Font-size audit (2026-08-11): this row was text-xs
                        (12px) — below the task's 13px "secondary text
                        (dates, labels)" minimum. Bumped to text-[13px]
                        (Tailwind has no named 13px step). The tone `Chip`
                        keeps its own internal text-xs (it sets its own
                        size regardless of the parent, and is a shared
                        sitewide component used for every badge across the
                        app — out of this session's minimal-footprint
                        scope to resize globally; flagged in the
                        completion note). */}
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="rounded-full bg-neutral-bg px-2 py-0.5 font-semibold uppercase tracking-wide text-foreground-muted">
                        {c.subject === "EARNINGS_CALL_TRANSCRIPT" ? "Concall transcript" : "Investor presentation"}
                      </span>
                      {TONE_CHIP_TONE[c.tone_label] && <Chip tone={TONE_CHIP_TONE[c.tone_label]}>{c.tone_label}</Chip>}
                      {/* A5: formatDateIst (year-inclusive) — was formatShortDate
                          (year-less), same fix already applied to insider
                          trades / "What's coming up?" in a prior session. */}
                      <span className="text-foreground-faint">{formatDateIst(c.filing_date)}</span>
                    </div>
                    {/* A3: secondary-button treatment, reusing the EXACT
                        className ResearchExportButton already uses in this
                        same page's action row — same href/target/rel.
                        Font size bumped 12px -> 13px, same audit as above. */}
                    <a
                      href={c.source_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-[13px] font-medium text-foreground-muted hover:text-foreground"
                    >
                      View source filing →
                    </a>
                  </div>
                  {/* A1: collapsed-by-default summary with a Show more/less
                      toggle — client leaf, see ConcallSummary.tsx. */}
                  <ConcallSummary summary={c.summary} />
                  {/* Callout-box fix (2026-08-11, corrected placement): the
                      highlighted box belongs HERE, on tone_note — the
                      short one-sentence tone explanation (confirmed
                      against data-pipeline/concall_summarizer.py's own
                      prompt spec) that sits below the Key takeaway/Show
                      more-less toggle and above the source/attribution
                      line, not on the longer summary above. Same real
                      gold-accent tokens as every other gold CTA/active
                      state (`border-accent`/`bg-accent`), at low opacity. */}
                  <div className="mt-2 border-l-2 border-accent bg-accent/10 px-3 py-2">
                    <p className="text-sm font-medium leading-relaxed text-foreground">{c.tone_note}</p>
                  </div>
                  {/* Contrast fix (2026-08-11): text-foreground-faint (this
                      project's real "most muted" text tier — no "text-muted"
                      utility exists, confirmed via grep) + a border-t
                      separator, so this line reads as clearly distinct from
                      the now-boxed tone_note callout directly above it.
                      Text content byte-for-byte unchanged throughout. */}
                  <p className="mt-2 border-t border-border pt-2 text-xs text-foreground-faint">
                    Sourced from an exchange-filed {c.subject === "EARNINGS_CALL_TRANSCRIPT" ? "transcript" : "presentation"}, dated{" "}
                    {formatDateIst(c.filing_date)}. Summary is RedixFi-generated and distinct from investment advice.
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </ErrorBoundary>

      {/* Annual Report AI Summary — placed directly below Concalls, same
          category of exchange-filed qualitative disclosure (kept visually
          adjacent per the task's own framing), only rendered when a
          summarized annual_reports doc exists for this symbol (one per
          symbol; a doc pending summarization or with none filed yet
          renders nothing here, same "exclude by query" posture
          _concall_block already uses). */}
      {data.annual_report_summary && (
        <ErrorBoundary>
          <AnnualReportSummaryCard data={data.annual_report_summary} />
        </ErrorBoundary>
      )}

      <ErrorBoundary>
        <Card title="Signal summary" titleClassName="text-base" action={data.signal_summary.narrative && <AiLabel />}>
          {data.signal_summary.composite_score === null ? (
            <p className="text-sm text-foreground-muted">Signal score not yet computed for this stock.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-semibold">{data.signal_summary.composite_score}/100</span>
                {data.signal_summary.delta_1d !== null && <DeltaValue value={data.signal_summary.delta_1d} />}
              </div>
              {data.signal_summary.narrative && <p className="mt-2 text-sm leading-relaxed">{data.signal_summary.narrative}</p>}
              <Link href={`/signals/${data.symbol}`} className="mt-2 inline-block text-sm font-medium text-accent">
                Open full Signal Dashboard page →
              </Link>
            </>
          )}
        </Card>
      </ErrorBoundary>
    </div>
  );
}
