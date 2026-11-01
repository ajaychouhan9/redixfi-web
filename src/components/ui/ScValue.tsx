import Link from "next/link";
import { Lock } from "lucide-react";

/** The lock shown in place of a Stock Condition number the caller may not see (the one visibility rule: the API sends no number for these rows).
 *  A small lock and the word "Pro", linked to the plans page. Same width as a two-digit number's cell so rows do not shift; the link keeps a
 *  44px tap target through a negative margin, so a dense row stays as tall as before. */
export function ProLock({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/pricing"
      data-testid="sc-lock"
      aria-label="Stock Condition is shown on the Pro plan. See plans"
      title="Stock Condition is shown on the Pro plan"
      className={`-my-3 inline-flex min-h-[44px] min-w-[3rem] items-center justify-end gap-1 text-xs font-medium text-foreground-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      <Lock size={11} className="shrink-0 text-accent" aria-hidden />
      Pro
    </Link>
  );
}

/** A Stock Condition number, or the lock, or a dash when there is genuinely no number. */
export function ScValue({ value, locked, className = "" }: { value: number | null | undefined; locked?: boolean; className?: string }) {
  if (locked) return <ProLock className={className} />;
  return (
    <span data-testid="sc-value" className={`-my-3 inline-flex min-h-[44px] min-w-[3rem] items-center justify-end tabular-nums ${className}`}>
      {value === null || value === undefined ? "-" : value}
    </span>
  );
}
