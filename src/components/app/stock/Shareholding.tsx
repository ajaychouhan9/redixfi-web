"use client";

import { useState } from "react";

import { holdSentence, type HoldPoint } from "@/lib/stock-visual";

const ROWS: { key: "promoter" | "fii" | "mf" | "other"; label: string }[] = [
  { key: "promoter", label: "Promoter" },
  { key: "fii", label: "FII" },
  { key: "mf", label: "Mutual funds" },
  { key: "other", label: "Others" },
];

/**
 * Shareholding (26 Nov 2026): the stored quarters as chips, then one bar for each holder group with its %. "Others" is everything that is not
 * promoter, FII or mutual funds. Shown only when at least one quarter is stored.
 */
export function Shareholding({ points }: { points: HoldPoint[] }) {
  const [i, setI] = useState(points.length - 1);
  if (points.length === 0) return null;
  const p = points[Math.min(i, points.length - 1)];
  const shown = ROWS.filter((r) => p[r.key] !== null);
  if (shown.length === 0) return null;
  const sentences = [holdSentence(points, "fii", "FII"), holdSentence(points, "promoter", "Promoter")].filter((s): s is string => !!s);
  return (
    <section aria-labelledby="share-hold" className="mt-7 border-t border-border pt-6" data-testid="shareholding-visual">
      <h2 id="share-hold" className="text-lg font-bold">Shareholding</h2>
      <div role="group" aria-label="Quarter" className="mt-3 flex flex-wrap gap-2">
        {points.map((q, k) => (
          <button key={q.date} type="button" aria-pressed={k === i} onClick={() => setI(k)} data-testid={`hold-chip-${k}`} className={`min-h-[44px] rounded-full border px-4 text-[13px] ${k === i ? "border-foreground font-bold text-foreground" : "border-border font-medium text-foreground-muted"}`}>
            {q.label}
          </button>
        ))}
      </div>
      <ul className="mt-3">
        {shown.map((r) => {
          const v = p[r.key] as number;
          return (
            <li key={r.key} className="border-b border-border py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-foreground-muted">{r.label}</span>
                <span className="text-base font-bold tabular-nums">{v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-hover" role="img" aria-label={`${r.label} ${v}%`}>
                <div className="h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: r.key === "promoter" ? "var(--accent)" : "var(--bar-revenue, #8fa3b8)" }} />
              </div>
            </li>
          );
        })}
      </ul>
      {sentences.length > 0 && <p className="mt-3 text-[15px] leading-6" data-testid="hold-sentence">{sentences.join(" ")}</p>}
      <p className="mt-2 text-xs text-foreground-muted">Quarter ended {p.label}. As filed with the exchange.</p>
    </section>
  );
}
