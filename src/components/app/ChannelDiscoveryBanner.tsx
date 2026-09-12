"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getPublicChannels, postChannelDiscovery } from "@/lib/api/mutations";
import {
  CHANNEL_DISCOVERY_ACTIONS,
  CHANNEL_DISCOVERY_TEXT,
  MORNING_BRIEF_CHANNELS_HREF,
  discoveryActionFor,
  shouldShowChannelDiscovery,
  type ChannelDiscoveryActionKey,
} from "@/lib/publicChannels";

/**
 * Daily in-app PUBLIC CHANNEL DISCOVERY notification (2026-09-12 task).
 *
 * At most once per day. The server decides whether to show it
 * (core/public_channels.py::discovery_state reads account-persisted
 * preferences), so clearing localStorage or switching device/browser cannot
 * reset it:
 *
 *   no action           -> may show again on a later day, max once/day
 *   "Already subscribed"-> permanent suppression
 *   "Don't show again"  -> permanent suppression (no 30-day snooze)
 *
 * It never carries a channel link or URL — "View channels" navigates to the
 * dedicated section inside Account → Alerts, which is the only place channel
 * details live. Tapping anything here is NOT recorded as an external
 * subscription: the server only ever stores the user's own explicit state.
 */
export function ChannelDiscoveryBanner() {
  const { user, getToken } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const token = await getToken();
      if (!token) return;
      try {
        const res = await getPublicChannels(token);
        if (cancelled || !shouldShowChannelDiscovery(res.discovery)) return;
        setVisible(true);
        // Record that today's notification was displayed (once-per-day).
        await postChannelDiscovery(token, "seen");
      } catch {
        // Never surface a notification we couldn't verify server-side.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  if (!visible) return null;

  async function choose(key: ChannelDiscoveryActionKey) {
    const action = discoveryActionFor(key);
    setBusy(true);
    try {
      if (action) {
        const token = await getToken();
        if (token) await postChannelDiscovery(token, action);
        setVisible(false);
      }
      // "view_channels" only navigates (the <Link> below) — no server write,
      // because tapping through is not evidence of a channel follow.
    } catch {
      // Leave the banner in place if the preference couldn't be saved.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-border bg-surface px-4 py-2.5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-foreground-muted">{CHANNEL_DISCOVERY_TEXT}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={MORNING_BRIEF_CHANNELS_HREF}
            onClick={() => choose("view_channels")}
            className="rounded-lg border border-accent px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/10"
          >
            {CHANNEL_DISCOVERY_ACTIONS[0].label}
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => choose("already_subscribed")}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-foreground-muted hover:text-foreground disabled:opacity-50"
          >
            {CHANNEL_DISCOVERY_ACTIONS[1].label}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => choose("dismissed")}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-foreground-muted hover:text-foreground disabled:opacity-50"
          >
            {CHANNEL_DISCOVERY_ACTIONS[2].label}
          </button>
        </div>
      </div>
    </div>
  );
}
