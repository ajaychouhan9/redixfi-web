"use client";

// Web push subscription flow (2026-09-11 task) — completes the frontend
// half of a delivery channel whose backend (alert_worker.py::send_push,
// FCM via firebase-admin) already existed and already worked; only the
// browser-side subscription (service worker + token registration) was
// missing. Uses Firebase Cloud Messaging's Web Push support (the SAME
// Firebase project this app already uses for auth) rather than a raw,
// hand-rolled VAPID PushManager.subscribe() flow — FCM Web Push IS
// standard browser Push API + VAPID under the hood; using Firebase's own
// wrapper avoids running two separate, incompatible push-token schemes
// (an FCM registration token vs a raw PushSubscription object) against
// the ONE backend delivery path that already speaks FCM tokens only.
import { getFirebaseApp, messagingConfigured } from "@/lib/auth/firebase";
import { addPushToken, removePushTokens } from "@/lib/api/mutations";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function webPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    // `messagingConfigured` (not `firebaseConfigured`) — push additionally
    // needs messagingSenderId, which Auth does not; without this the toggle
    // stays off and the user sees the friendly "not configured yet" message
    // instead of FCM's raw `messaging/missing-app-config-values`.
    messagingConfigured &&
    Boolean(VAPID_KEY)
  );
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Registers the service worker, requests permission if needed, gets a
 * real FCM token, and registers it with the backend (POST /me/push-token,
 * platform="web" — the same endpoint/collection a future mobile app's
 * token would use). Throws with a message suitable for direct display —
 * callers should catch and show `e.message`, not a generic "failed". */
export async function enableWebPush(authToken: string): Promise<void> {
  if (!webPushSupported()) {
    throw new Error(
      !messagingConfigured || !VAPID_KEY
        ? "Browser notifications aren't configured yet."
        : "This browser doesn't support push notifications."
    );
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(permission === "denied" ? "Notifications are blocked for this site in your browser settings." : "Permission was not granted.");
  }

  const { getMessaging, getToken } = await import("firebase/messaging");
  const messaging = getMessaging(getFirebaseApp());
  const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!fcmToken) {
    throw new Error("Could not get a notification token from the browser — try again.");
  }

  await addPushToken(authToken, fcmToken, "web");
}

/** Best-effort: deletes the token from Firebase (so this browser stops
 * being subscribed) AND removes every registered token server-side. A
 * Firebase-side failure (e.g. already revoked) still lets the backend
 * removal proceed — the account-level "off" state is what the UI shows,
 * not the browser-level token's own lifecycle. */
export async function disableWebPush(authToken: string): Promise<void> {
  try {
    if (webPushSupported()) {
      const { getMessaging, deleteToken } = await import("firebase/messaging");
      const messaging = getMessaging(getFirebaseApp());
      await deleteToken(messaging);
    }
  } catch {
    // fall through to the server-side removal regardless
  }
  await removePushTokens(authToken);
}
