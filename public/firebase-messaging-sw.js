// Firebase Cloud Messaging background service worker (2026-09-11 task).
// Handles push events while the RedixFi tab isn't focused/open — a
// foreground push (tab open) is instead handled in-app via
// lib/push/webPush.ts's onMessage listener, matching Firebase's own
// documented split between background (this file) and foreground
// (in-page) message handling.
//
// Config values below are the SAME public NEXT_PUBLIC_FIREBASE_* values
// already shipped in every page's client JS bundle (see .env.local) —
// a Firebase web API key is designed to be public (security is enforced
// by Firebase Auth/security rules and the authorized-domains allowlist,
// not by hiding this key). A plain static file (not a Next.js route) has
// no build-time env substitution available, so these are the literal
// values, not a duplicate-source-of-truth risk in practice: they change
// only if the Firebase project itself changes, which is a rare,
// deliberate, whole-app event.
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBPmCL5PNyvX6va269575dDGJFrAucINg0",
  authDomain: "redixfi-540b1.firebaseapp.com",
  projectId: "redixfi-540b1",
  messagingSenderId: "449356118370",
  appId: "1:449356118370:web:6f85af56dcf7abd902543b",
});

const messaging = firebase.messaging();

// Default notification shown for a data-only or background push. RedixFi
// always sends notification.title/notification.body (alert_worker.py's
// send_push), so this handler is mostly a safety net, not the primary
// content source.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "RedixFi";
  const body = payload.notification?.body ?? "";
  self.registration.showNotification(title, {
    body,
    icon: "/branding/redixfi-icon.png",
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
