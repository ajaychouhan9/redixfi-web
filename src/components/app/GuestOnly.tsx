"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Shows its children only to a logged-out visitor, and only once the sign-in state is known. Server-rendered pages cannot know who is looking, so a
 * sign-up block placed directly in one is shown to everyone, including a logged-in user. Wrapping it here shows nothing while the state is loading
 * (so there is no flash of the logged-out version) and nothing for a signed-in user. scripts/test-wording.mjs fails the build when a file prints a
 * sign-up call to action without this wrapper (or its own useAuth check).
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading || user) return null;
  return <>{children}</>;
}
