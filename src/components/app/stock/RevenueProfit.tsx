"use client";

import { useState } from "react";

import { barScale, crore, growth, growthRows, profitSentence, revenueSentence, signedPct, toneOf, type RPPoint } from "@/lib/stock-visual";

const W = 320;
const H = 166;
const PAD_B = 34;

function Bars({ pts, label }: { pts: RPPoint[]; label: string }) {
  const { max, min } = barScale(pts);
  const span = max - min || 1;
  const plotH = H - PAD_B;
  const y = (v: number) => ((max - v) / span) * plotH;
  const zero = y(0);
  const slot = W / pts.length;
  const bw = Math.min(16, slot / 2.6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 block h-auto w-full" role="img" aria-label={label}>
      <line x1="0" x2={W} y1={zero} y2={zero} stroke="var(--border)" />
      {pts.map((p, i) => {
        const latest = i === pts.length - 1;
        const cx = slot * i + slot / 2;
        const bar = (v: number | null, x: number, fill: string) => {
          if (v === null) return null;
          const top = Math.min(y(v), zero);
          const h = Math.max(1, Math.abs(y(v) - zero));
          return <rect x={x} y={top} width={bw} height={h} rx="2" fill={fill} opacity={latest ? 1 : 0.5} />;
        };
        return (
          <g key={p.at}>
            {bar(p.revenue, cx - bw - 1, "var(--bar-revenue, #8fa3b8)")}
            {bar(p.profit, cx + 1, "var(--up-fill, var(--up))")}
            <text x={cx} y={H - 18} textAnchor="middle" fontSize="12" fill="var(--foreground-muted)" fontWeight={latest ? 700 : 400}>
              {p.label.includes(" ") ? (
                <>
                  <tspan x={cx}>{p.label.split(" ")[0]}</tspan>
                  <tspan x={cx} dy="14">{p.label.split(" ")[1]}</tspan>
                </>
              ) : p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Revenue and profit (26 Nov 2026): grouped bars, revenue in grey-blue and profit in green, the latest period at full strength. Toggle Yearly | Quarterly.
 * Under it: the latest values with their growth, a small 1 year / 3 year table when the yearly series allows it, and one plain sentence of facts.
 */
export function RevenueProfit({ yearly, quarterly }: { yearly: RPPoint[]; quarterly: RPPoint[] }) {
  const hasY = yearly.length >= 2;
  const hasQ = quarterly.length >= 2;
  const [mode, setMode] = useState<"yearly" | "quarterly">(hasY ? "yearly" : "quarterly");
  if (!hasY && !hasQ) return null;
  const active = mode === "yearly" && hasY ? "yearly" : hasQ ? "quarterly" : "yearly";
  const pts = active === "yearly" ? yearly : quarterly;
  const last = pts[pts.length - 1];
  // a quarter is compared with the same quarter a year earlier (4 back); a year with the year before
  const baseIdx = active === "yearly" ? pts.length - 2 : pts.length - 5;
  const base = baseIdx >= 0 ? pts[baseIdx] : null;
  const gRev = base ? growth(last.revenue, base.revenue) : null;
  const gPro = base ? growth(last.profit, base.profit) : null;
  const per = active === "yearly" ? "year" : "quarter";
  const rows = active === "yearly" ? growthRows(yearly) : [];
  const sentences = [revenueSentence(pts, per), profitSentence(pts, per)].filter((s): s is string => !!s);
  const cls = (n: number | null) => (toneOf(n) === "up" ? "text-up" : toneOf(n) === "down" ? "text-down" : "text-foreground-muted");
  const tab = (on: boolean) => `min-h-[44px] flex-1 text-[13px] ${on ? "border-b-2 border-foreground font-bold text-foreground" : "border-b-2 border-transparent font-medium text-foreground-muted"}`;
  return (
    <section aria-labelledby="rev-profit" className="mt-7 border-t border-border pt-6" data-testid="revenue-profit">
      <div className="flex items-center justify-between gap-3">
        <h2 id="rev-profit" className="text-lg font-bold">Revenue &amp; profit</h2>
        {hasY && hasQ && (
          <div role="group" aria-label="Period" className="flex w-44">
            <button type="button" aria-pressed={active === "yearly"} onClick={() => setMode("yearly")} className={tab(active === "yearly")} data-testid="rp-yearly">Yearly</button>
            <button type="button" aria-pressed={active === "quarterly"} onClick={() => setMode("quarterly")} className={tab(active === "quarterly")} data-testid="rp-quarterly">Quarterly</button>
          </div>
        )}
      </div>
      <Bars pts={pts} label={`${active === "yearly" ? "Yearly" : "Quarterly"} revenue and profit, ${pts.map((p) => `${p.label}: revenue ${p.revenue === null ? "n/a" : crore(p.revenue)}, profit ${p.profit === null ? "n/a" : crore(p.profit)}`).join("; ")}`} />
      <div className="mt-1 flex gap-4 text-xs text-foreground-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--bar-revenue, #8fa3b8)" }} />Revenue</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--up-fill, var(--up))" }} />Profit</span>
      </div>
      <dl className="mt-3">
        {last.revenue !== null && (
          <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-border py-2">
            <dt className="text-[13px] text-foreground-muted">Revenue, {last.label}</dt>
            <dd className="text-base font-bold tabular-nums">{crore(last.revenue)}{signedPct(gRev, 1) && <span className={`ml-2 text-[13px] ${cls(gRev)}`}>{signedPct(gRev, 1)}</span>}</dd>
          </div>
        )}
        {last.profit !== null && (
          <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-border py-2">
            <dt className="text-[13px] text-foreground-muted">Profit, {last.label}</dt>
            <dd className="text-base font-bold tabular-nums">{crore(last.profit)}{signedPct(gPro, 1) && <span className={`ml-2 text-[13px] ${cls(gPro)}`}>{signedPct(gPro, 1)}</span>}</dd>
          </div>
        )}
      </dl>
      {base && <p className="mt-1 text-xs text-foreground-muted">Growth is against {base.label}.</p>}
      {rows.length > 0 && (
        <table className="mt-3 w-full text-[13px]" data-no-stack data-testid="growth-table">
          <caption className="sr-only">Growth of revenue and profit</caption>
          <thead><tr className="text-left text-foreground-muted"><th className="py-1 font-normal"><span className="sr-only">Period</span></th><th className="py-1 text-right font-normal">Revenue</th><th className="py-1 text-right font-normal">Profit</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-border">
                <th scope="row" className="py-2 text-left font-normal text-foreground-muted">{r.label}</th>
                <td className="py-2 text-right font-bold tabular-nums">{r.revenue ?? "n/a"}</td>
                <td className="py-2 text-right font-bold tabular-nums">{r.profit ?? "n/a"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {sentences.length > 0 && <p className="mt-3 text-[15px] leading-6" data-testid="rp-sentence">{sentences.join(" ")}</p>}
      <p className="mt-2 text-xs text-foreground-muted">₹ crore, as reported.</p>
    </section>
  );
}
