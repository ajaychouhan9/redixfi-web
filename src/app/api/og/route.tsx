import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// Generic social-card generator (2026-09-11, programmatic SEO + sharing
// task). ONE route serves every use case rather than one route per surface:
// - OG image for /stocks/[symbol] and /stocks/[symbol]/concall-summary
// - OG image for /screens/[slug] programmatic screener pages
// - watermarked shareable cards a user can grab from the AI Daily Brief
//   card and the Top Signal Changes card ("daily market pulse", "top
//   movers") — same query-string contract, different `type`.
//
// Deliberately query-string-driven with no backend fetch at all: every
// value the card needs is passed in by the caller (already has the real
// data server-side), so this route has zero DB/API dependency and can run
// on the edge with cold-start-free rendering.
//
// 1200x630 is the standard OG/Twitter-card size (Facebook/WhatsApp/X/
// LinkedIn all crop or reject smaller). `alt` text is handled by the
// caller's own `openGraph.alt` — not this route's concern.

const COLORS = {
  bg: "#0d1220",
  surface: "#12172a",
  border: "#1e2438",
  foreground: "#e8eaf2",
  muted: "#8891a8",
  faint: "#75809d",
  accent: "#d4a94e",
  accentDim: "#b8873a",
  up: "#3ecf8e",
  down: "#f2685c",
};

const TYPE_BADGES: Record<string, string> = {
  stock: "STOCK SNAPSHOT",
  concall: "CONCALL SUMMARY",
  screener: "SCREENER",
  brief: "DAILY MARKET PULSE",
  movers: "TOP MOVERS",
};

function clamp(value: string | null, max: number, fallback: string): string {
  const v = (value ?? "").trim();
  if (!v) return fallback;
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const type = (searchParams.get("type") ?? "stock").toLowerCase();
  const badge = TYPE_BADGES[type] ?? TYPE_BADGES.stock;

  const title = clamp(searchParams.get("title"), 40, "RedixFi");
  const subtitle = clamp(searchParams.get("subtitle"), 90, "");
  const stat = clamp(searchParams.get("stat"), 20, "");
  const statLabel = clamp(searchParams.get("statLabel"), 40, "");
  // "up" | "down" | "" — colors the stat, never used for advice/prediction,
  // purely reflecting an already-observed measured value (price change,
  // score delta) being rendered on the card.
  const direction = searchParams.get("direction") === "down" ? "down" : searchParams.get("direction") === "up" ? "up" : null;
  const statColor = direction === "up" ? COLORS.up : direction === "down" ? COLORS.down : COLORS.accent;

  const iconUrl = new URL("/branding/redixfi-icon.png", req.url).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.surface} 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* Top row: category badge + brand mark */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 3,
              color: COLORS.accent,
              border: `1px solid ${COLORS.accentDim}`,
              borderRadius: 8,
              padding: "8px 18px",
              background: "rgba(212,169,78,0.08)",
            }}
          >
            {badge}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconUrl} width={48} height={40} alt="" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: COLORS.foreground }}>RedixFi</div>
              <div style={{ display: "flex", fontSize: 16, color: COLORS.faint }}>Market. Simplified.</div>
            </div>
          </div>
        </div>

        {/* Middle: title + subtitle */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: COLORS.foreground, lineHeight: 1.05 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ display: "flex", fontSize: 30, color: COLORS.muted, maxWidth: 980 }}>{subtitle}</div>
          )}
        </div>

        {/* Bottom row: stat block + compliance-safe footer tagline */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          {stat ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: statColor }}>{stat}</div>
              {statLabel && <div style={{ display: "flex", fontSize: 22, color: COLORS.faint }}>{statLabel}</div>}
            </div>
          ) : (
            <div />
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 20, color: COLORS.faint }}>Measured data, not advice</div>
            <div style={{ display: "flex", fontSize: 20, color: COLORS.accent }}>redixfi.com</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
