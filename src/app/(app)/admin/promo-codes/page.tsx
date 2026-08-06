"use client";

import { RequireAuth } from "@/components/app/account/RequireAuth";
import { PromoCodeAdminView } from "@/components/app/admin/PromoCodeAdminView";

// NOT linked in any user-facing nav (see src/components/layout/Sidebar.tsx's
// fixed NAV_ITEMS — untouched by this page). The hidden URL is not the
// security boundary: every request PromoCodeAdminView makes is gated
// server-side by core/admin_auth.py::require_admin (ADMIN_USER_IDS
// allowlist), independent of this route ever being linked anywhere.
export default function AdminPromoCodesPage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-lg font-semibold">Promo codes</h1>
        <PromoCodeAdminView />
      </div>
    </RequireAuth>
  );
}
