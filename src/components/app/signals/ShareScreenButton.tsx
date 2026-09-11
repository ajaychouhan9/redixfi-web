"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createSharedScreen } from "@/lib/api/mutations";
import type { SharedScreenParams } from "@/lib/api/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://redixfi.com";

/**
 * "Share this screen" (2026-09-11 task) — persists the CURRENT filter/sort
 * state as a public, re-run-on-view record (core/shared_screens_repo.py)
 * and hands back a short `/s/{slug}` link. Logged-in only: the record is
 * owned by a real user_id (require_auth on the backend), same posture as
 * alert rules/watchlists — an anonymous visitor can still OPEN a shared
 * link (the public view page needs no login), just not mint one.
 */
export function ShareScreenButton({ params, disabled }: { params: SharedScreenParams; disabled?: boolean }) {
  const { user, getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("My signal screen");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const shareUrl = slug ? `${SITE_URL}/s/${slug}` : null;

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please log in again.");
      const result = await createSharedScreen(token, { title: title.trim() || "My signal screen", params });
      setSlug(result.slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the shared link.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the URL is still visible/selectable in the input below
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        title="Share this screen"
        className="flex items-center gap-1 rounded-lg border border-border bg-hover px-2 py-1.5 text-xs text-foreground-muted disabled:opacity-40"
      >
        <Share2 size={13} />
        Share
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-surface-raised p-3 text-sm shadow-lg">
          {!shareUrl ? (
            <>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">Name this screen</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                className="mb-2 w-full rounded-lg border border-border bg-hover px-2 py-1.5 text-xs outline-none"
              />
              {error && <p className="mb-2 text-xs text-down">{error}</p>}
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy}
                className="w-full rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create shareable link"}
              </button>
            </>
          ) : (
            <>
              <p className="mb-1 text-xs font-medium text-foreground-muted">Shareable link ready</p>
              <div className="mb-2 flex items-center gap-1.5">
                <input readOnly value={shareUrl} className="w-full truncate rounded-lg border border-border bg-hover px-2 py-1.5 text-xs outline-none" />
                <button type="button" onClick={handleCopy} title="Copy link" className="shrink-0 rounded-lg border border-border p-1.5 text-foreground-muted hover:text-foreground">
                  {copied ? <Check size={13} className="text-up" /> : <Copy size={13} />}
                </button>
              </div>
              <p className="text-xs text-foreground-faint">Anyone with this link sees live, current data — masked the same way it is for them elsewhere on RedixFi.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
