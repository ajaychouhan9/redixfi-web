/**
 * RedixFi's approved symbol (2026-08 brand refresh) — a stylized "R" built
 * from three ascending chart bars (the tallest bar doubling as the letter's
 * vertical stem), a bowl at the top of the stem, and a diagonal "trending
 * up" arrow breaking out past the bowl. Replaces the earlier X/gem
 * lettermark design.
 *
 * variant="gradient" (default) paints the brand gold gradient directly —
 * use standalone on a neutral surface (favicon, login page, empty states).
 * variant="solid" fills/strokes with currentColor instead — use inside an
 * already-colored badge (e.g. the header's gold-gradient square) where the
 * mark itself should be foreground-colored, not re-apply the gradient.
 *
 * Colors are CSS variables (--accent / --accent-dim), so this component
 * tracks the dark/light theme toggle automatically with no separate
 * light/dark markup. Static contexts that can't inherit page CSS (e.g.
 * app/icon.svg for the favicon) hardcode the same hex values instead — see
 * that file's own comment.
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
  const paint = variant === "solid" ? "currentColor" : `url(#${gradientId})`;

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
          <linearGradient id={gradientId} x1="2" y1="21" x2="19" y2="3" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--accent-dim)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
      )}
      {/* Ascending chart bars — short, medium, then the tall bar doubles as the R stem below */}
      <rect x="2" y="15" width="2.6" height="6" rx="0.6" fill={paint} />
      <rect x="5.4" y="11.5" width="2.6" height="9.5" rx="0.6" fill={paint} />
      <rect x="8.8" y="3" width="2.6" height="18" rx="0.6" fill={paint} />
      {/* Bowl, attached to the top of the stem (evenodd cutout forms the counter) */}
      <path
        d="M8.8,3 A3.4,3.4 0 0 1 8.8,9.8 Z M8.8,4.6 A1.9,1.9 0 0 1 8.8,8.2 Z"
        fill={paint}
        fillRule="evenodd"
      />
      {/* Diagonal "trending up" arrow breaking out past the bowl */}
      <path
        d="M9.5 16 L18 6.5 M13.5 6.5 L18 6.5 L18 11"
        stroke={paint}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
