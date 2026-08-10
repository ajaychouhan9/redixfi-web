/**
 * RedixFi's original geometric lettermark — NOT the Twitter/X wordmark.
 * Two tapered bars crossing into an X, each waisted toward the center
 * (wide at the outer ends, narrow at the crossing) with a small faceted diamond
 * dropped over the intersection — reads as a cut gem/premium mark rather
 * than a flat social-icon X. Construction is deliberately un-Twitter-like:
 * tapered bars + gradient + facet vs. Twitter's uniform-width strokes.
 *
 * variant="gradient" (default) paints the brand gold gradient directly —
 * use standalone on a neutral surface (favicon, login page, empty states).
 * variant="solid" fills with currentColor instead — use inside an
 * already-colored badge (e.g. the sidebar's gold-gradient square) where
 * the mark itself should be foreground-colored, not re-apply the gradient.
 *
 * Colors are CSS variables (--accent / --accent-dim / --accent-foreground),
 * so this component tracks the dark/light theme toggle automatically with
 * no separate light/dark markup. Static contexts that can't inherit page
 * CSS (e.g. app/icon.svg for the favicon) hardcode the same hex values
 * instead — see that file's own comment.
 */
export function LogoMark({
  size = 24,
  variant = "gradient",
  className,
}: {
  size?: number;
  variant?: "gradient" | "solid";
  className?: string;
}) {
  const gradientId = "redixfi-logomark-gradient";
  const fill = variant === "solid" ? "currentColor" : `url(#${gradientId})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="RedixFi"
      className={className}
    >
      {variant === "gradient" && (
        <defs>
          <linearGradient id={gradientId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-dim)" />
          </linearGradient>
        </defs>
      )}
      {/* Bar: top-left → bottom-right, waisted at center */}
      <path
        d="M1.16 4.84 L11.01 12.99 L19.16 22.84 L22.84 19.16 L12.99 11.01 L4.84 1.16 Z"
        fill={fill}
      />
      {/* Bar: top-right → bottom-left, waisted at center */}
      <path
        d="M22.84 4.84 L12.99 12.99 L4.84 22.84 L1.16 19.16 L11.01 11.01 L19.16 1.16 Z"
        fill={fill}
      />
      {/* Faceted highlight at the crossing */}
      <path
        d="M12 9.6 L14.4 12 L12 14.4 L9.6 12 Z"
        fill="var(--accent-foreground)"
        opacity="0.3"
      />
    </svg>
  );
}
