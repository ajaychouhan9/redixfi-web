import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True once real Firebase project keys (NEXT_PUBLIC_FIREBASE_*) are provisioned in the environment. */
export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured — set NEXT_PUBLIC_FIREBASE_* env vars.");
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
  }
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
}
