"use client";

import { RequireAuth } from "@/components/app/account/RequireAuth";
import { ReviewQueueAdminView } from "@/components/app/admin/ReviewQueueAdminView";

// NOT linked in any user-facing nav (see src/components/layout/Sidebar.tsx's
// fixed NAV_ITEMS — untouched by this page), exactly like /admin/promo-codes.
// The hidden URL is not the security boundary: every request
// ReviewQueueAdminView makes is gated server-side by
// core/admin_auth.py::require_admin (ADMIN_USER_IDS allowlist), checked fresh
// on every request, independent of this route ever being linked anywhere.
//
// This page shows LLM output that has NOT been published — that is the whole
// point of the queue — so the gate matters more here than on the promo page.
export default function AdminReviewQueuePage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 text-lg font-semibold">Review queue</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Qwen outputs held back by a validator. Nothing here is visible to users until approved.
        </p>
        <ReviewQueueAdminView />
      </div>
    </RequireAuth>
  );
}
