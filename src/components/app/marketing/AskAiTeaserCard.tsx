"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Landing preview of Ask-RedixFi (2026-09-11 landing overhaul).
 * Anonymous-only, same pattern as VisitorIntroStrip.
 *
 * The Q&A below is a REAL answer from the production `/api/v1/ask`
 * endpoint (2026-09-10 evaluation run, DHRUV, concall question), copied
 * verbatim including its cited sources — not a fabricated sample.
 */
export function AskAiTeaserCard() {
  const { user } = useAuth();
  if (user) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15">
          <Sparkles size={14} className="text-accent" />
        </span>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-accent">Ask RedixFi</div>
          <div className="text-xs text-foreground-faint">A real answer, source-cited from an actual concall</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-accent px-3.5 py-2 text-sm text-accent-foreground">
          What were the main operational updates discussed in the latest Concall?
        </div>

        <div className="max-w-[95%] rounded-xl rounded-tl-sm border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed text-foreground">
          <p>The latest concall discussed several operational updates, including:</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>
              The company reported a total order book of <strong>INR 600 crores</strong>, with a recent correction of
              about <strong>INR 30-35 crores</strong> due to project cost estimates — less than 5% of the total order
              book.
            </li>
            <li>Management highlighted that project-level profitability remains positive despite the adjustment.</li>
            <li>
              The company secured new contracts, including its first project in the aviation sector, and emphasized
              ongoing diversification into new infrastructure segments and geographies.
            </li>
            <li>
              The unexecuted order book was reported at <strong>INR 256 crores</strong>.
            </li>
          </ul>
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border pt-2">
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent-dim">concall_transcript</span>
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent-dim">investor_calls</span>
          </div>
        </div>
      </div>

      <Link href="/login?mode=signup" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
        Ask your own question →
      </Link>
    </div>
  );
}
