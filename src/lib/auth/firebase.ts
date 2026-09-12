import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // FCM requires messagingSenderId on the app config. Firebase Auth does NOT
  // use it, but `getMessaging(app)` reads `app.options.messagingSenderId` and
  // throws `messaging/missing-app-config-values: "messagingSenderId"` when it
  // is absent — which is what broke browser push in production (2026-09-12):
  // the env var was provisioned in Vercel but this object never read it.
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True once real Firebase project keys (NEXT_PUBLIC_FIREBASE_*) are provisioned in the environment. */
export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

/**
 * Messaging needs `messagingSenderId` IN ADDITION to the auth keys above.
 * Kept separate from `firebaseConfigured` on purpose: Auth does not need it,
 * so a missing sender ID must not disable login/OTP — it should only disable
 * the browser-push toggle (see lib/push/webPush.ts).
 */
export const messagingConfigured = Boolean(firebaseConfigured && config.messagingSenderId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

/** Shared app instance — exported (2026-09-11) so lib/push/webPush.ts can
 * get Firebase Messaging off the SAME app rather than re-initializing a
 * second one for the same project. */
export function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured — set NEXT_PUBLIC_FIREBASE_* env vars.");
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  const appRef = getFirebaseApp();
  if (!authInstance) {
    authInstance = getAuth(appRef);
  }
  return authInstance;
}

// Firebase Auth error codes are raw (e.g. "auth/wrong-password") and its
// thrown Error.message wraps them in developer-facing prose ("Firebase:
// Error (auth/wrong-password).") — neither is fit for an end user. This
// maps the codes that actually surface from login/signup/reset to plain
// English; anything unmapped falls back to a generic message rather than
// ever showing a raw code string.
const FIREBASE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/wrong-password": "Incorrect email or password. Please try again.",
  "auth/invalid-credential": "Incorrect email or password. Please try again.",
  "auth/user-not-found": "No account found with this email.",
  "auth/email-already-in-use": "An account with this email already exists. Try logging in instead.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/user-disabled": "This account has been disabled. Contact support for help.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/network-request-failed": "Network error — check your connection and try again.",
  "auth/invalid-verification-code": "That code isn't correct. Please check and try again.",
  "auth/code-expired": "That code has expired. Please request a new one.",
  "auth/invalid-phone-number": "Please enter a valid phone number.",
};

const GENERIC_AUTH_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** Maps a caught Firebase Auth error (or any error) to a plain-English message — never returns a raw error code. */
export function describeAuthError(e: unknown): string {
  const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : null;
  if (code && FIREBASE_AUTH_ERROR_MESSAGES[code]) {
    return FIREBASE_AUTH_ERROR_MESSAGES[code];
  }
  return GENERIC_AUTH_ERROR_MESSAGE;
}
