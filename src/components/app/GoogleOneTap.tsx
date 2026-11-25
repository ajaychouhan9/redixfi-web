"use client";

import { useEffect } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

type GoogleId = { initialize: (o: { client_id: string; callback: (r: { credential?: string }) => void; auto_select?: boolean; cancel_on_tap_outside?: boolean }) => void; prompt: () => void; cancel: () => void };
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

/**
 * Google one-tap on the sign-in page (26 Nov 2026): the browser's "Continue as <name>" card, one tap, no password. It needs the owner's Google OAuth web client
 * id in NEXT_PUBLIC_GOOGLE_CLIENT_ID (the same Google project as the Firebase sign-in); with no id it draws nothing and the "Continue with Google" button
 * (the Firebase popup) is the way in. The credential goes to the page's own handler, which signs in through Firebase.
 */
export function GoogleOneTap({ onCredential }: { onCredential: (credential: string) => void }) {
  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    const start = () => {
      const id = window.google?.accounts?.id;
      if (!id || cancelled) return;
      id.initialize({ client_id: CLIENT_ID, callback: (r) => r.credential && onCredential(r.credential), cancel_on_tap_outside: false });
      id.prompt();
    };
    if (window.google?.accounts?.id) start();
    else {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = start;
      document.head.appendChild(s);
    }
    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
