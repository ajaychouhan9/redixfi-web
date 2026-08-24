/**
 * "RedixFi" wordmark lockup — "Redix" in the page foreground color, "Fi" in
 * brand gold, per the approved 2026-08 identity. Kept as styled HTML text
 * (not an SVG asset): the site font (IBM Plex Mono, see app/layout.tsx)
 * already renders crisply at any size/zoom, so recreating it as a raster or
 * traced-path asset would only add maintenance cost for no visual gain —
 * unlike LogoMark, where hand vector art genuinely beats a bitmap.
 */
export function Wordmark({
  size = "lg",
  tagline = false,
  className,
}: {
  size?: "lg" | "md";
  tagline?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className={size === "lg" ? "font-mono text-lg font-semibold tracking-tight" : "font-mono text-sm font-semibold tracking-tight"}>
        <span className="text-foreground">Redix</span>
        <span className="text-accent">Fi</span>
      </span>
      {tagline && <div className="text-[11px] text-foreground-faint">Market. Simplified.</div>}
    </div>
  );
}
