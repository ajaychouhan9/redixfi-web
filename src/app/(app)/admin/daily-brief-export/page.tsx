"use client";

import { RequireAuth } from "@/components/app/account/RequireAuth";
import { DailyBriefExportView } from "@/components/app/admin/DailyBriefExportView";

// NOT linked in any user-facing nav (same posture as /admin/promo-codes —
// see that page's own comment). The hidden URL is not the security
// boundary: every request DailyBriefExportView makes is gated
// server-side by core/admin_auth.py::require_admin (ADMIN_USER_IDS
// allowlist), independent of this route ever being linked anywhere.
export default function AdminDailyBriefExportPage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-lg font-semibold">Daily Brief — social export</h1>
        <p className="mb-6 text-sm text-foreground-muted">
          Copy-pasteable text for manual posting to X, Instagram, Reddit and Facebook. Posting is manual — nothing
          here posts automatically.
        </p>
        <DailyBriefExportView />
      </div>
    </RequireAuth>
  );
}
