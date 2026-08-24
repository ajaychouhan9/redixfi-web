/**
 * "RedixFi" wordmark lockup - "Redix" in the page foreground color, "Fi" in
 * brand gold; the tagline below follows the same two-tone split ("Market."
 * in the foreground color, "Simplified." in gold), per the approved brand
 * reference. Kept as styled HTML text rather than folded into the icon
 * image (RedixFiLogo's icon PNG): the site font (IBM Plex Mono, see
 * app/layout.tsx) already renders crisply at any size/zoom and stays
 * theme-aware (light/dark) for free, whereas the provided logo artwork
 * bakes in a fixed dark background and white text that can't adapt.
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
    <div className={`leading-tight ${className ?? ""}`}>
      <span className={size === "lg" ? "font-mono text-lg font-semibold tracking-tight" : "font-mono text-sm font-semibold tracking-tight"}>
        <span className="text-foreground">Redix</span>
        <span className="text-accent">Fi</span>
      </span>
      {tagline && (
        <div className="text-[11px] font-medium">
          <span className="text-foreground">Market. </span>
          <span className="text-accent">Simplified.</span>
        </div>
      )}
    </div>
  );
}
