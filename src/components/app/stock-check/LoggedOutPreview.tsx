"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { AskPreview } from "@/components/app/stock-check/AskPreview";

/** The stored Ask AI samples, shown only to visitors who are not logged in (the page itself stays static). */
export function LoggedOutPreview() {
  const { user } = useAuth();
  if (user) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4" data-testid="logged-out-preview">
      <AskPreview />
    </div>
  );
}
