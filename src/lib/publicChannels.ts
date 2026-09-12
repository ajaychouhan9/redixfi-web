import type { ChannelDiscoveryState } from "./api/types";

/**
 * Public Morning Brief channel DISCOVERY notification (2026-09-12 task).
 *
 * Kept as pure, framework-free logic so the locked behavior can be unit
 * tested without a browser:
 *
 *   * shown at most once per day (the SERVER decides, in
 *     core/public_channels.py::discovery_state — this file never re-derives
 *     or caches that decision itself);
 *   * "Already subscribed" and "Don't show again" are PERMANENT (no snooze);
 *   * doing nothing may show it again on a later day.
 */

/** Exact copy the task specifies for the in-app discovery notification. */
export const CHANNEL_DISCOVERY_TEXT =
  "Get the RedixFi Morning Brief — Follow our WhatsApp or Telegram channel for the daily market brief.";

export const CHANNEL_DISCOVERY_ACTIONS = [
  { key: "view_channels", label: "View channels" },
  { key: "already_subscribed", label: "Already subscribed" },
  { key: "dismissed", label: "Don't show again" },
] as const;

export type ChannelDiscoveryActionKey = (typeof CHANNEL_DISCOVERY_ACTIONS)[number]["key"];

/** Anchor inside Account → Alerts → Delivery channels. The discovery
 * notification only ever POINTS there — it never carries a channel link
 * itself, so channel details stay exclusively inside Alerts. */
export const MORNING_BRIEF_CHANNELS_HREF = "/account/alerts#morning-brief-channels";
export const MORNING_BRIEF_CHANNELS_ANCHOR_ID = "morning-brief-channels";

/** The ONLY thing the banner asks the server: should it render today?
 * `should_show` is computed server-side so the once-per-day rule and the two
 * permanent opt-outs survive logout / device / browser changes (they are
 * account preferences, not localStorage). */
export function shouldShowChannelDiscovery(state: ChannelDiscoveryState | null | undefined): boolean {
  if (!state) return false;
  if (state.already_subscribed || state.dismissed) return false;
  return state.should_show === true;
}

/** Which server action a clicked button maps to (null = no server write;
 * "View channels" only navigates — tapping it is NOT recorded as an external
 * subscription). */
export function discoveryActionFor(key: ChannelDiscoveryActionKey): "already_subscribed" | "dismissed" | null {
  if (key === "already_subscribed") return "already_subscribed";
  if (key === "dismissed") return "dismissed";
  return null;
}
