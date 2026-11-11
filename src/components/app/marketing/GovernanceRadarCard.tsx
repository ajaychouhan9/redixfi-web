"use client";

import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { RED_FLAG_CATEGORIES, RED_FLAG_RADAR_TITLE } from "@/lib/redFlagCategories";

/**
 * Landing preview of the Governance disclosures card (2026-09-11 landing overhaul).
 * Anonymous-only, same pattern as VisitorIntroStrip.
 *
 * 2026-11-11: the "Real example finding" (ABB India, related-party) was removed. It was
 * an AI paraphrase of the excerpt ("The excerpt discusses..."), not the filing's own words.
 */
export function GovernanceRadarCard() {
  const { user } = useAuth();
  if (user) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15">
          <ShieldAlert size={14} className="text-accent" />
        </span>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-accent">{RED_FLAG_RADAR_TITLE}</div>
          <div className="text-xs text-foreground-faint">Filings are reviewed automatically for nine kinds of governance disclosure</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {RED_FLAG_CATEGORIES.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-surface px-3 py-2">
            <div className="text-[13px] font-semibold text-foreground">{c.label}</div>
            <div className="text-xs text-foreground-muted">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
