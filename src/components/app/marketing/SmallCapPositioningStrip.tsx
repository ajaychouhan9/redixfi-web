"use client";

import { Telescope } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Landing differentiator strip (2026-09-11 landing overhaul). Anonymous-only,
 * same pattern as VisitorIntroStrip. No specific coverage numbers — small/
 * mid-cap document-coverage gaps are real but not quantified here per the
 * locked-facts instruction to describe document coverage qualitatively only.
 */
export function SmallCapPositioningStrip() {
  const { user } = useAuth();
  if (user) return null;

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface-raised px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15">
        <Telescope size={16} className="text-accent" />
      </span>
      <div>
        <div className="text-[15px] font-semibold text-foreground">
          The research tool for stocks institutional coverage misses
        </div>
        <p className="mt-0.5 text-sm text-foreground-muted">
          Large-cap coverage is everywhere. RedixFi runs the same measured signals, AI document summaries and
          governance checks on small- and mid-cap names that institutional research desks often skip entirely.
        </p>
      </div>
    </div>
  );
}
