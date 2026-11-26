"use client";

import { useMemo, useRef, useState } from "react";

type Pt = { t: number | string; v: number };

const W = 600;
const H = 220;
const PAD_R = 46; // room for the price labels
const PAD_B = 22; // room for the time labels
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function label(t: number | string, intraday: boolean): string {
  if (typeof t === "number") return new Date(t * 1000).toISOString().slice(11, 16);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return m ? (intraday ? t : `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`) : t;
}

/**
 * A small price chart drawn as plain SVG (26 Nov 2026), replacing the 180 KB charting library: one line, five price labels on the right, four time labels
 * underneath, and a readout when a finger or the pointer is on it. The line colour comes from the site's gain and loss chart colours.
 */
export function LineChart({ series, tone, intraday, onHover }: { series: Pt[]; tone: "up" | "down" | "flat"; intraday: boolean; onHover: (h: { label: string; value: number } | null) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const [at, setAt] = useState<number | null>(null);
  const geo = useMemo(() => {
    const vs = series.map((p) => p.v);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (hi === lo) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * 0.1;
    lo -= pad; hi += pad;
    const pw = W - PAD_R, ph = H - PAD_B;
    const x = (i: number) => (i / (series.length - 1)) * pw;
    const y = (v: number) => ((hi - v) / (hi - lo)) * ph;
    const path = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
    const ticks = [0, 1, 2, 3, 4].map((k) => lo + ((hi - lo) * k) / 4);
    const xl = [0, 1, 2, 3].map((k) => Math.round((k * (series.length - 1)) / 3));
    return { x, y, path, ticks, xl, pw, ph };
  }, [series]);

  const stroke = tone === "down" ? "var(--down-fill, #e5484d)" : tone === "up" ? "var(--up-fill, #00a86b)" : "var(--foreground-muted, #4b5563)";

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(series.length - 1, Math.round((px / geo.pw) * (series.length - 1))));
    setAt(i);
    onHover({ label: label(series[i].t, intraday), value: series[i].v });
  }
  function leave() {
    setAt(null);
    onHover(null);
  }

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block h-full w-full touch-pan-y" role="img" aria-label="Price chart" onPointerMove={move} onPointerDown={move} onPointerLeave={leave} onPointerCancel={leave}>
      {geo.ticks.map((v) => (
        <g key={v}>
          <line x1="0" x2={geo.pw} y1={geo.y(v)} y2={geo.y(v)} stroke="var(--border, #eeeeee)" />
          <text x={geo.pw + 6} y={geo.y(v) + 4} fontSize="12" fill="var(--foreground-muted, #4b5563)" className="tabular-nums">{v >= 1000 ? Math.round(v).toLocaleString("en-IN") : v.toFixed(2)}</text>
        </g>
      ))}
      <path d={geo.path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {geo.xl.map((i, k) => (
        <text key={i} x={geo.x(i)} y={H - 5} fontSize="12" fill="var(--foreground-muted, #4b5563)" textAnchor={k === 0 ? "start" : k === 3 ? "end" : "middle"}>{label(series[i].t, intraday)}</text>
      ))}
      {at !== null && (
        <g>
          <line x1={geo.x(at)} x2={geo.x(at)} y1="0" y2={geo.ph} stroke="var(--foreground-muted, #4b5563)" strokeDasharray="3 3" />
          <circle cx={geo.x(at)} cy={geo.y(series[at].v)} r="4" fill={stroke} stroke="var(--background, #fff)" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
