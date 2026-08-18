import { Lock } from "lucide-react";
import Link from "next/link";

/** Free-tier paywall visual: blur the real value, show a lock glyph over it.
 * Same pattern across every locked surface (mockup's LockedCell/LockedRow) —
 * defined once here instead of re-implemented per component. Inline variant
 * for table cells, block variant for a full row. */
export function LockedInline({ children, title = "Unlock with Analytics Pro" }: { children: React.ReactNode; title?: string }) {
  return (
    <span className="relative inline-flex max-w-full items-center" title={title}>
      <span aria-hidden className="pointer-events-none select-none blur-[3px] opacity-60">
        {children}
      </span>
      <Lock size={11} className="ml-1 shrink-0 text-accent" />
    </span>
  );
}

export function LockedRow({ children, title = "Unlock with Analytics Pro" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="relative" title={title}>
      <div aria-hidden className="pointer-events-none select-none blur-[3px] opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-end pr-1">
        <Lock size={12} className="text-accent" />
      </div>
    </div>
  );
}

/** The "Free tier shows a fixed sample... Unlock all" banner — same copy
 * pattern used at the bottom of every masked list (Signals table, Home
 * movers). Always states the real rule plainly (never implies a curated
 * "best of" selection — compliance CURATION TEST). */
export function UnlockBanner({ label, cta = "Unlock all 750 measured scores" }: { label: string; cta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
      <span className="text-[12px] text-foreground-faint">{label}</span>
      <Link href="/pricing" className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-foreground">
        {cta}
      </Link>
    </div>
  );
}
