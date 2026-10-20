"use client";

/**
 * Score history — collapsible section on the stock page, directly under the
 * composite-score card.
 *
 * Shows what was STORED for each session: the measured inputs that went into
 * the score and the score change that followed. It deliberately carries no
 * next-day price, hit rate, win rate, Track Record numbers or "signal worked" content — only the
 * session's own measured data.
 *
 * Free/Basic see the server-configured free limit (default 5); Pro sees the
 * Pro limit (default 10). Rows past the caller's limit arrive as locked
 * placeholders with null values, so nothing hidden is sent to the browser.
 * A stock on a corporate-action hold never renders the table; the page's
 * existing note is the correct content instead.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronDown, Lock } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { ExplainTerm } from "@/components/ui/ExplainTerm";
import { getScoreHistory } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatShortDate } from "@/lib/format";
import type { CorporateActionNote, ScoreHistoryResponse, ScoreHistoryRow } from "@/lib/api/types";

/**
 * Link target for "How is this score calculated?".
 *   "explain:<metric>" -> opens the existing score-explainer popup (current).
 *   "/how-it-works"    -> renders a normal link if you add that page later.
 * One-line switch; nothing else in this component needs to change.
 */
const SCORE_EXPLAINER_TARGET = "explain:composite_score";

const CHIP_INPUTS: { key: string; label: string }[] = [
  { key: "trend", label: "Trend" },
  { key: "rsi", label: "RSI" },
  { key: "sector", label: "Sector" },
  { key: "fii", label: "FII" },
  { key: "pcr", label: "PCR" },
  { key: "pledge", label: "Pledge" },
  { key: "insider", label: "Insider" },
];

function DirectionChip({ label, direction }: { label: string; direction?: "up" | "down" | "flat" }) {
  const tone = direction === "up" ? "up" : direction === "down" ? "down" : "neutral";
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "–";
  const word = direction === "up" ? "up" : direction === "down" ? "down" : "flat";
  return (
    <Chip tone={tone} className="px-1.5 py-0 text-[10px]" >
      <span aria-hidden>{arrow}</span>
      <span aria-label={`${label} ${word}`}>{label}</span>
    </Chip>
  );
}

function fmtPct(v: number | null | undefined, digits = 1): string {
  return v === null || v === undefined ? "—" : `${v.toFixed(digits)}%`;
}

function fmtRatio(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${v.toFixed(2)}×`;
}

function ScoreLine({ rows }: { rows: ScoreHistoryRow[] }) {
  const points = useMemo(
    () =>
      [...rows]
        .reverse()
        .filter((r) => !r.locked && r.score !== null)
        .map((r) => ({ date: r.date, score: r.score as number })),
    [rows]
  );
  if (points.length < 2) return null;
  const W = 300, H = 56, P = 5;
  const scores = points.map((p) => p.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(1, max - min);
  const coords = points.map((p, i) => {
    const x = P + (i * (W - 2 * P)) / Math.max(1, points.length - 1);
    const y = H - P - ((p.score - min) / span) * (H - 2 * P);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const first = points[0], last = points[points.length - 1];
  return (
    <div className="mb-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full" preserveAspectRatio="none" aria-hidden>
        <polyline points={coords.join(" ")} fill="none" stroke="currentColor"
          className="text-accent" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={coords[0].split(",")[0]} cy={coords[0].split(",")[1]} r="2" className="fill-accent" />
        <circle cx={coords[coords.length - 1].split(",")[0]} cy={coords[coords.length - 1].split(",")[1]}
          r="2.4" className="fill-accent" />
      </svg>
      <p className="sr-only">
        Composite score moved from {first.score} on {formatShortDate(first.date)} to {last.score} on{" "}
        {formatShortDate(last.date)} over {points.length} stored sessions.
      </p>
    </div>
  );
}

function ScoreExplainerLink({ symbol, score }: { symbol: string; score: number | null }) {
  const label = "How is this score calculated?";
  if (SCORE_EXPLAINER_TARGET.startsWith("explain:")) {
    return (
      <ExplainTerm
        metricKey={SCORE_EXPLAINER_TARGET.slice("explain:".length)}
        symbol={symbol}
        ctx={{ composite_score: score ?? "—", symbol }}
      >
        <span className="underline decoration-dotted underline-offset-2">{label}</span>
      </ExplainTerm>
    );
  }
  return (
    <Link href={SCORE_EXPLAINER_TARGET} className="text-accent underline decoration-dotted underline-offset-2">
      {label}
    </Link>
  );
}

function LockedRow({ date, tierLabel, asCard = false }: { date: string; tierLabel: string; asCard?: boolean }) {
  const rows = (
    <div className="flex select-none items-center justify-between gap-2 text-xs opacity-40 blur-[3px]" aria-hidden>
      <span className="text-foreground-muted">{formatShortDate(date)}</span>
      <span className="text-foreground-faint">•••</span>
      <span className="text-foreground-faint">•••</span>
      <span className="text-foreground-faint">•••</span>
      <span className="text-foreground-faint">•••</span>
    </div>
  );
  const badge = (
    <div className="absolute inset-0 flex items-center justify-center gap-1.5">
      <Lock size={11} className="text-foreground-faint" />
      <span className="text-[10px] font-medium text-foreground-muted">Locked · {tierLabel}</span>
    </div>
  );
  if (asCard) {
    return (
      <li className="relative overflow-hidden rounded-lg border border-border px-3 py-3">
        {rows}
        {badge}
      </li>
    );
  }
  return (
    <>
      {rows}
      {badge}
    </>
  );
}

export function ScoreHistorySection({
  symbol,
  corporateAction,
}: {
  symbol: string;
  corporateAction?: CorporateActionNote | null;
}) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ScoreHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Fetch exactly once per symbol when the section is first opened. getToken
  // is read through a ref so a profile refresh (which changes its identity)
  // cannot cancel the in-flight request and leave the section on "Loading".
  const startedRef = useRef(false);
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    let alive = true;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const token = await getTokenRef.current();
        const res = await getScoreHistory(symbol, { token });
        if (alive) setData(res.data);
      } catch {
        if (alive) setFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, symbol]);

  // Corporate-action hold: the page already renders the existing note; the
  // table must not be shown (adjusted splits, demergers, held-back scores).
  if (corporateAction) return null;

  const rows = data?.rows ?? [];
  const locked = rows.filter((r) => r.locked);
  const sessions = data?.limit ?? 0;

  return (
    <section className="mt-3 rounded-xl border border-border bg-surface-raised shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`score-history-${symbol}`}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">Score history</span>
          <span className="block text-[11px] text-foreground-faint">
            {data?.blocked ? "Not shown — corporate action in progress" : data ? `${data.available} stored session${data.available === 1 ? "" : "s"}` : `Last ${sessions || 5}–10 sessions`}
            {" · "}inputs and score change
          </span>
        </span>
        <ChevronDown size={16} className={clsx("shrink-0 text-foreground-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id={`score-history-${symbol}`} className="border-t border-border px-4 pb-4 pt-3">
          {loading && <p className="text-xs text-foreground-muted">Loading stored sessions…</p>}

          {failed && !loading && (
            <p className="text-xs text-foreground-muted">Could not load score history right now.</p>
          )}

          {data?.blocked && (
            <p className="text-xs text-foreground-muted">
              {data.note || "This stock has a corporate action in progress, so earlier sessions are not comparable."}
            </p>
          )}

          {data && !data.blocked && data.locked && (
            <p className="text-xs text-foreground-muted">
              Score history is available on the full stock page for this symbol.
            </p>
          )}

          {data && !data.blocked && !data.locked && rows.length === 0 && (
            <p className="text-xs text-foreground-muted">No stored sessions yet for this stock.</p>
          )}

          {data && !data.blocked && !data.locked && rows.length > 0 && (
            <>
              <ScoreLine rows={rows} />

              {/* Desktop table — hidden below sm so phones never scroll sideways. */}
              <div className="hidden sm:block">
                <table className="w-full table-fixed border-collapse text-[11px]">
                  <caption className="sr-only">
                    Stored per-session inputs and composite score, newest first.
                  </caption>
                  <thead>
                    <tr className="text-left text-foreground-faint">
                      <th className="w-[52px] py-1 font-medium">Date</th>
                      <th className="w-[58px] py-1 font-medium">Price</th>
                      <th className="w-[74px] py-1 font-medium">Delivery</th>
                      <th className="w-[48px] py-1 font-medium">Vol</th>
                      <th className="py-1 font-medium">Inputs</th>
                      <th className="w-[42px] py-1 text-right font-medium">Score</th>
                      <th className="w-[54px] py-1 pr-2 text-right font-medium">Δ</th>
                      <th className="w-[132px] py-1 pl-1 font-medium">Main reasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => r.locked ? (
                      <tr key={r.date} className="border-t border-border">
                        <td colSpan={8} className="relative py-2">
                          <LockedRow date={r.date} tierLabel={data.next_tier ?? "Pro"} />
                        </td>
                      </tr>
                    ) : (
                      <tr key={r.date} className="border-t border-border align-top">
                        <td className="py-1.5 text-foreground-muted">{formatShortDate(r.date)}</td>
                        <td className="py-1.5"><DeltaValue value={r.price_change_pct} kind="pct" /></td>
                        <td className="py-1.5 text-foreground-muted">
                          {fmtPct(r.delivery_pct)}
                          {r.delivery_avg20 !== null && (
                            <span className="block text-[10px] text-foreground-faint">avg {fmtPct(r.delivery_avg20)}</span>
                          )}
                        </td>
                        <td className="py-1.5 text-foreground-muted">{fmtRatio(r.volume_ratio_5d)}</td>
                        <td className="py-1.5">
                          <span className="flex flex-wrap gap-1">
                            {CHIP_INPUTS.map((c) => (
                              <DirectionChip key={c.key} label={c.label} direction={r.input_directions?.[c.key]} />
                            ))}
                          </span>
                        </td>
                        <td className="py-1.5 text-right font-semibold tabular-nums">{r.score ?? "—"}</td>
                        <td className="py-1.5 pr-2 text-right">
                          {r.not_comparable ? <span className="text-[10px] text-amber">n/c</span> : <DeltaValue value={r.score_change} />}
                        </td>
                        <td className="py-1.5 pl-1 text-foreground-muted">
                          {r.not_comparable
                            ? <span className="text-[10px] text-amber">Not comparable</span>
                            : (r.reasons.length ? r.reasons.join(" · ") : "—")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phone cards — one compact card per session, no horizontal scroll. */}
              <ul className="space-y-2 sm:hidden">
                {rows.map((r) => r.locked ? (
                  <LockedRow key={r.date} date={r.date} tierLabel={data.next_tier ?? "Pro"} asCard />
                ) : (
                  <li key={r.date} className="rounded-lg border border-border px-3 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-foreground-muted">{formatShortDate(r.date)}</span>
                      <span className="text-base font-semibold tabular-nums">{r.score ?? "—"}</span>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-x-2 gap-y-1 text-[11px] text-foreground-muted">
                      <span>Price <DeltaValue value={r.price_change_pct} kind="pct" /></span>
                      <span>Delivery {fmtPct(r.delivery_pct)}</span>
                      <span>Vol {fmtRatio(r.volume_ratio_5d)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {CHIP_INPUTS.map((c) => (
                        <DirectionChip key={c.key} label={c.label} direction={r.input_directions?.[c.key]} />
                      ))}
                      <span className="ml-auto text-[11px] text-foreground-muted">
                        Δ {r.not_comparable ? <span className="text-amber">n/c</span> : <DeltaValue value={r.score_change} />}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-foreground-muted">
                      {r.not_comparable ? "Not comparable across a corporate action." : (r.reasons.length ? r.reasons.join(" · ") : "—")}
                    </p>
                  </li>
                ))}
              </ul>

              <p className="mt-2 text-[10px] text-foreground-faint">▲ improved · ▼ weakened · – unchanged</p>

              {locked.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                    <Lock size={12} className="text-foreground-faint" />
                    {data.next_tier
                      ? `${data.tier === "basic" ? "Basic" : "Free"} shows the last ${data.limit} sessions. Upgrade to ${data.next_tier} for ${data.next_limit}.`
                      : `Showing the last ${data.limit} sessions.`}
                  </p>
                  {data.next_tier && (
                    <Link href="/pricing" className="text-[11px] font-medium text-accent">
                      Upgrade to {data.next_tier} →
                    </Link>
                  )}
                </div>
              )}

              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-foreground-faint">
                <span>{data.disclaimer}</span>
                <span aria-hidden>·</span>
                <ScoreExplainerLink symbol={symbol} score={(rows.find((r) => !r.locked)?.score) ?? null} />
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
