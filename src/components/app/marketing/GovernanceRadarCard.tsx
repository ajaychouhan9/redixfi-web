"use client";

import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

const CATEGORIES = [
  { label: "Auditor qualifications", desc: "Qualified/adverse opinions, emphasis of matter, material weakness" },
  { label: "Contingent liabilities", desc: "Pending litigation, guarantees given, disputed tax demands" },
  { label: "Related-party transactions", desc: "Disclosed dealings with promoter or related entities" },
  { label: "Promoter pledges", desc: "Shares pledged or released against promoter holdings" },
];

/**
 * Landing preview of the Red Flag Radar (2026-09-11 landing overhaul).
 * Anonymous-only, same pattern as VisitorIntroStrip.
 *
 * The example finding below is REAL, not fabricated: a genuine
 * `related_party_transaction` classification confirmed by an actual
 * live OpenAI classification request against real ABB annual-report text
 * (page 102), recorded verbatim in this project's session history. Left
 * unedited on purpose —
 * it happens to be a "no material issue found" finding, which is itself
 * an honest demonstration of the tool reporting what the filing actually
 * says rather than manufacturing alarm.
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
          <div className="font-mono text-[11px] uppercase tracking-widest text-accent">Governance &amp; Red Flag Radar</div>
          <div className="text-xs text-foreground-faint">AI reads every filing for four categories of governance risk</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-surface px-3 py-2">
            <div className="text-[13px] font-semibold text-foreground">{c.label}</div>
            <div className="text-xs text-foreground-muted">{c.desc}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-3">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-foreground-faint">
          <span>Real example finding</span>
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent-dim">related_party_transaction</span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          &ldquo;The excerpt discusses related party transactions that are repetitive in nature and states that these
          transactions are reviewed by the Statutory Auditors. It mentions that the Company did not enter into any
          Material Related Party Transactions during the year and provides related party disclosures as per Ind AS
          24.&rdquo;
        </p>
        <div className="mt-2 text-xs text-foreground-faint">ABB India — annual report, page 102</div>
      </div>
    </div>
  );
}
