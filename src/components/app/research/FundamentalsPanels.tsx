"use client";

import { useEffect, useState } from "react";
import { Collapsible } from "@/components/ui/Collapsible";
import { ExplainTerm } from "@/components/ui/ExplainTerm";
import { Chip } from "@/components/ui/Chip";
import { Sparkline } from "@/components/ui/Sparkline";
import { getResearchPeers } from "@/lib/api/endpoints";
import { formatShortDate } from "@/lib/format";
import type { FundamentalsBlock, PeerRow } from "@/lib/api/types";

// Factual, symmetric labels only — no "good"/"bad" framing (compliance
// symmetry rule). A flag being present is a measured fact about the
// filed numbers, not a verdict.
const FLAG_LABELS: Record<string, string> = {
  REVENUE_ACCELERATING: "Revenue growth accelerating",
  MARGIN_EXPANSION: "Operating margin above its own average",
  PAT_DECLINE_2Q: "Profit declined YoY for 2 straight quarters",
  FII_REDUCING: "FII holding falling for 2+ quarters",
  PROMOTER_STAKE_UP: "Promoter holding rose this quarter",
  HIGH_DEBT: "Debt-to-equity above 1x",
};

function fmtNum(v: number | null, digits = 2): string {
  return v === null ? "—" : v.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

function fmtPct(v: number | null, digits = 1): string {
  if (v === null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

function fmtCr(v: number | null): string {
  return v === null ? "—" : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
}

/**
 * Task 09 UI panels — each collapsible, each titled as a question a real
 * person asks, each with a tap-to-learn explainer. Derived-first; raw
 * filed figures sit behind their own "view filed figures" expander at the
 * bottom. Every metric here comes from fundamentals_derived — the API
 * never serves fundamentals_raw, so there is nothing analyst-rating-shaped
 * to accidentally render (see FundamentalsBlock's type docstring).
 */
export function FundamentalsPanels({ symbol, fundamentals }: { symbol: string; fundamentals: FundamentalsBlock | null }) {
  const [peers, setPeers] = useState<PeerRow[] | null>(null);
  const [peersError, setPeersError] = useState(false);

  useEffect(() => {
    if (!fundamentals?.coverage.has_peers) return;
    let cancelled = false;
    getResearchPeers(symbol)
      .then((env) => !cancelled && setPeers(env.data.peers))
      .catch(() => !cancelled && setPeersError(true));
    return () => {
      cancelled = true;
    };
  }, [symbol, fundamentals?.coverage.has_peers]);

  if (!fundamentals) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-4 text-sm text-foreground-muted">
        Fundamentals data not yet available for {symbol}.
      </div>
    );
  }

  const { identity, quarterly, valuation, shareholding, events, flags, coverage } = fundamentals;

  return (
    <div className="space-y-3">
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {flags.map((f) => (
            <Chip key={f} tone="neutral">
              {FLAG_LABELS[f] ?? f.replace(/_/g, " ").toLowerCase()}
            </Chip>
          ))}
        </div>
      )}

      {/* ---- Is it growing? ---- */}
      <Collapsible question="Is it growing?" defaultOpen>
        {!coverage.has_quarterly ? (
          <p className="text-sm text-foreground-muted">Quarterly financial data not available yet.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Revenue (latest Q)" value={quarterly.revenue !== null ? fmtCr(quarterly.revenue) : "—"} />
              <Stat
                label="Revenue YoY"
                value={
                  <ExplainTerm
                    metricKey="revenue_growth"
                    ctx={{
                      quarterEnd: quarterly.latest_quarter_end ?? "",
                      pct: fmtPct(quarterly.revenue_yoy_pct),
                      accel: quarterly.revenue_accel_quarters >= 2 ? `${quarterly.revenue_accel_quarters}th` : "",
                    }}
                  >
                    {fmtPct(quarterly.revenue_yoy_pct)}
                  </ExplainTerm>
                }
              />
              <Stat label="PAT YoY" value={fmtPct(quarterly.pat_yoy_pct)} />
              <Stat
                label="Operating margin"
                value={
                  <ExplainTerm
                    metricKey="operating_margin"
                    ctx={{ pct: fmtPct(quarterly.opm_pct), vsAvg: quarterly.opm_vs_8q_avg ?? "in line with" }}
                  >
                    {quarterly.opm_pct !== null ? `${quarterly.opm_pct.toFixed(1)}%` : "—"}
                    {quarterly.opm_vs_8q_avg && (
                      <span className="ml-1 text-xs text-foreground-faint">({quarterly.opm_vs_8q_avg} 8q avg)</span>
                    )}
                  </ExplainTerm>
                }
              />
            </div>
            {quarterly.series_8q.length > 1 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                  Revenue, last {quarterly.series_8q.length} quarters
                </p>
                <div className="text-accent">
                  <Sparkline values={quarterly.series_8q.map((q) => q.revenue ?? 0)} />
                </div>
              </div>
            )}
          </div>
        )}
      </Collapsible>

      {/* ---- Is it expensive versus peers? ---- */}
      <Collapsible question="Is it expensive versus peers?">
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              label="P/E (TTM)"
              value={
                <ExplainTerm
                  metricKey="pe_vs_sector"
                  ctx={{ pe: fmtNum(valuation.pe_ttm, 1), sectorPe: fmtNum(valuation.sector_pe, 1), rel: valuation.pe_vs_sector ?? "in line with" }}
                >
                  {fmtNum(valuation.pe_ttm, 1)}
                </ExplainTerm>
              }
            />
            <Stat label="Sector P/E" value={fmtNum(valuation.sector_pe, 1)} />
            <Stat label="Dividend yield" value={fmtPct(valuation.dividend_yield_pct)} />
          </div>
          {/* Facts side by side, user's own reading — never "cheaper = better". */}
          {peersError ? (
            <p className="text-sm text-foreground-muted">Peer comparison not available right now.</p>
          ) : !coverage.has_peers ? (
            <p className="text-sm text-foreground-muted">No peer comparison data on file for {symbol}.</p>
          ) : peers === null ? (
            <p className="text-sm text-foreground-muted">Loading peer comparison…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                  <tr>
                    <th className="py-1.5 pr-3">Company</th>
                    <th className="py-1.5 pr-3">P/E</th>
                    <th className="py-1.5 pr-3">P/B</th>
                    <th className="py-1.5 pr-3">Net margin</th>
                    <th className="py-1.5 pr-3">ROE</th>
                    <th className="py-1.5 pr-3">D/E</th>
                    <th className="py-1.5 pr-3">Div. yield</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border bg-accent/5 font-medium">
                    <td className="py-1.5 pr-3">{symbol} (this stock)</td>
                    <td className="py-1.5 pr-3">{fmtNum(valuation.pe_ttm, 1)}</td>
                    <td className="py-1.5 pr-3">{fmtNum(valuation.pb, 1)}</td>
                    <td className="py-1.5 pr-3">—</td>
                    <td className="py-1.5 pr-3">—</td>
                    <td className="py-1.5 pr-3">—</td>
                    <td className="py-1.5 pr-3">{fmtPct(valuation.dividend_yield_pct)}</td>
                  </tr>
                  {peers.map((p, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1.5 pr-3">{p.company_name ?? "—"}</td>
                      <td className="py-1.5 pr-3">{fmtNum(p.pe, 1)}</td>
                      <td className="py-1.5 pr-3">{fmtNum(p.pb, 1)}</td>
                      <td className="py-1.5 pr-3">{fmtPct(p.net_margin_ttm)}</td>
                      <td className="py-1.5 pr-3">{fmtPct(p.roe_ttm)}</td>
                      <td className="py-1.5 pr-3">{fmtNum(p.debt_to_equity, 2)}</td>
                      <td className="py-1.5 pr-3">{fmtPct(p.dividend_yield)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Collapsible>

      {/* ---- Who owns it, and did that change? ---- */}
      <Collapsible question="Who owns it, and did that change?">
        {!coverage.has_shareholding ? (
          <p className="text-sm text-foreground-muted">Shareholding data not available yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <OwnerRow
              label="Promoter"
              pct={shareholding.promoter_pct}
              changeQoq={shareholding.promoter_change_qoq}
              streak={shareholding.promoter_streak}
              date={shareholding.latest_date}
              explainerKey="promoter_holding"
            />
            <OwnerRow
              label="FII"
              pct={shareholding.fii_pct}
              changeQoq={shareholding.fii_change_qoq}
              streak={shareholding.fii_streak}
              date={shareholding.latest_date}
              explainerKey="fii_holding"
            />
            <OwnerRow
              label="MF"
              pct={shareholding.mf_pct}
              changeQoq={shareholding.mf_change_qoq}
              streak={shareholding.mf_streak}
              date={shareholding.latest_date}
            />
          </div>
        )}
      </Collapsible>

      {/* ---- What's coming up? ---- */}
      <Collapsible question="What's coming up?">
        <div className="space-y-3 text-sm">
          <Stat
            label="Results"
            value={
              events.next_results_date ? (
                <ExplainTerm metricKey="next_results_date" ctx={{ date: formatShortDate(events.next_results_date) }}>
                  Last reported {formatShortDate(events.next_results_date)}
                </ExplainTerm>
              ) : (
                "—"
              )
            }
          />
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Recent dividends</p>
            {events.recent_dividends.length === 0 ? (
              <p className="text-foreground-muted">None on file.</p>
            ) : (
              <ul className="space-y-1">
                {events.recent_dividends.map((d, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-foreground-muted">{d.record_date ? formatShortDate(d.record_date) : "—"}</span>
                    <span>
                      ₹{fmtNum(d.value, 2)} ({fmtNum(d.percentage, 0)}%)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {events.recent_bonus.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Recent bonus issues</p>
              <ul className="space-y-1">
                {events.recent_bonus.map((b, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-foreground-muted">{b.record_date ? formatShortDate(b.record_date) : "—"}</span>
                    <span>{b.remarks}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Collapsible>

      {/* ---- How volatile is it? ---- */}
      <Collapsible question="How volatile is it?">
        <div className="text-sm">
          <ExplainTerm metricKey="volatility_risk" ctx={{ category: identity.risk_category ?? "unclassified", stddev: fmtNum(identity.volatility_stddev, 2) }}>
            <span className="font-medium">{identity.risk_category ?? "Not classified"}</span>
            {identity.volatility_stddev !== null && <span className="ml-1 text-foreground-faint">(std. dev. {fmtNum(identity.volatility_stddev, 2)})</span>}
          </ExplainTerm>
        </div>
      </Collapsible>

      {/* ---- Raw filed figures, behind an expander ---- */}
      <Collapsible question="View filed figures">
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Balance sheet (latest filed)</p>
            <dl className="space-y-1">
              <RawRow label="Debt-to-equity" value={fundamentals.balance.debt_to_equity} />
              <RawRow label="Book value / share" value={fundamentals.balance.book_value_per_share} unit="₹" />
              <RawRow label="Current ratio" value={fundamentals.balance.current_ratio} />
              <RawRow label="Shares outstanding (Cr)" value={fundamentals.balance.shares_outstanding} />
            </dl>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Cash flow (latest filed)</p>
            <dl className="space-y-1">
              <RawRow label="Operating cash flow" value={fundamentals.cashflow.ocf_latest} unit="₹Cr" />
              <RawRow label="Capital expenditure" value={fundamentals.cashflow.capex_latest} unit="₹Cr" />
              <RawRow label="Free cash flow" value={fundamentals.cashflow.fcf_latest} unit="₹Cr" />
              <RawRow label="FCF-positive years (last 5)" value={fundamentals.cashflow.fcf_positive_years_5} />
            </dl>
          </div>
          {fundamentals.annual.series_5y.length > 0 && (
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Annual (5y)</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                    <tr>
                      <th className="py-1 pr-3">FY</th>
                      <th className="py-1 pr-3">Revenue</th>
                      <th className="py-1 pr-3">PAT</th>
                      <th className="py-1 pr-3">OPM %</th>
                      <th className="py-1 pr-3">EPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundamentals.annual.series_5y.map((y, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1 pr-3">{y.fiscal_year}</td>
                        <td className="py-1 pr-3">{fmtCr(y.revenue)}</td>
                        <td className="py-1 pr-3">{fmtCr(y.pat)}</td>
                        <td className="py-1 pr-3">{y.opm_pct !== null ? `${y.opm_pct.toFixed(1)}%` : "—"}</td>
                        <td className="py-1 pr-3">{fmtNum(y.eps, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Collapsible>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground-faint">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}

function RawRow({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="tabular-nums">{value === null ? "—" : `${unit ?? ""}${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}</dd>
    </div>
  );
}

function OwnerRow({
  label,
  pct,
  changeQoq,
  streak,
  date,
  explainerKey,
}: {
  label: string;
  pct: number | null;
  changeQoq: number | null;
  streak: string | null;
  date: string | null;
  explainerKey?: string;
}) {
  const valueSpan = (
    <>
      {pct === null ? (
        "—"
      ) : (
        <>
          {pct.toFixed(2)}%
          {changeQoq !== null && (
            <span className={changeQoq > 0 ? "text-up" : changeQoq < 0 ? "text-down" : "text-neutral"}>
              {" "}
              ({changeQoq > 0 ? "+" : ""}
              {changeQoq.toFixed(2)}pp)
            </span>
          )}
        </>
      )}
    </>
  );
  return (
    <div>
      <p className="text-xs font-medium text-foreground-faint">{label}</p>
      <p className="mt-0.5 text-sm">
        {!explainerKey || pct === null ? (
          valueSpan
        ) : (
          <ExplainTerm metricKey={explainerKey} ctx={{ pct: pct.toFixed(2), date: date ?? "", change: changeQoq?.toFixed(2) ?? "0", streak: streak ?? "stable" }}>
            {valueSpan}
          </ExplainTerm>
        )}
      </p>
      {streak && <p className="text-xs text-foreground-faint">{streak}</p>}
    </div>
  );
}
