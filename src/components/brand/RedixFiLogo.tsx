import Image from "next/image";
import { Wordmark } from "@/components/brand/Wordmark";

// public/branding/redixfi-icon.png is a rendered gold-gradient graphic
// (3D bevels/highlights) that code can't reproduce — this is the actual
// provided asset, not a recreation. Real pixel dimensions (700x580),
// used to compute width from a target height so it's never stretched.
const ICON_SRC = "/branding/redixfi-icon.png";
const ICON_W = 700;
const ICON_H = 580;

/**
 * Single entry point for the RedixFi logo lockup — use this everywhere the
 * brand mark is rendered rather than referencing the icon file directly,
 * so every surface stays in sync if the asset ever changes.
 *
 * - "full": icon + wordmark + "Market. Simplified." tagline — the
 *   preferred desktop rendering wherever there's room for three lines
 *   (main app header).
 * - "compact": icon + wordmark, no tagline — narrower spaces (login page,
 *   the public marketing-page header).
 * - "symbol": the icon alone, no text — favicon-sized or icon-only spots
 *   (mobile header, any other icon-only slot).
 */
export function RedixFiLogo({
  variant = "full",
  layout = "row",
  size,
  className,
}: {
  variant?: "full" | "compact" | "symbol";
  /** "row": icon beside the wordmark (headers/nav). "col": icon above
   * the wordmark, both centered (login page, empty states). */
  layout?: "row" | "col";
  size?: number;
  className?: string;
}) {
  const height = size ?? (variant === "symbol" ? 24 : variant === "full" ? 40 : 32);
  const width = Math.round((height * ICON_W) / ICON_H);
  const icon = <Image src={ICON_SRC} alt="RedixFi" width={width} height={height} priority />;

  if (variant === "symbol") {
    return <span className={className}>{icon}</span>;
  }

  return (
    <div className={`flex ${layout === "row" ? "items-center gap-2" : "flex-col items-center gap-1"} ${className ?? ""}`}>
      {icon}
      <Wordmark tagline={variant === "full"} />
    </div>
  );
}
