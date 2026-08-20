"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { firebaseLogin, getMe, refreshTokens, type AuthTokens, type AuthUser } from "@/lib/api/mutations";
import { isExpiringSoon } from "./jwt";

const STORAGE_KEY = "redixfi:auth";

interface StoredAuth {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Resolves a currently-valid access token, refreshing first if it's about to expire. Null if logged out. */
  getToken: () => Promise<string | null>;
  loginWithFirebaseToken: (firebaseToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStorage(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function writeStorage(v: StoredAuth | null) {
  if (typeof window === "undefined") return;
  if (v) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  else window.localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStored(readStorage());
    setLoading(false);
  }, []);

  // Tier-staleness fix (2026-08-21 investigation, B8 masking session) —
  // `stored.user` (the sidebar/header's ONLY source for `user.tier`) was
  // previously written just twice: at login, and whenever `getToken()`
  // happens to refresh the access token near its own expiry. Between those
  // two events it never changed — so a real server-side tier change during
  // an active session (subscription lapse/cancellation/webhook update; a
  // real Pro subscriber's DB-side `users.tier` genuinely reverting to
  // "free") left the sidebar showing the OLD tier indefinitely, while every
  // live endpoint (GET /signals, POST /ask, ...) correctly reads the
  // CURRENT tier fresh from the DB on every request (core/auth.py::
  // get_auth_context) — exactly the live-evidence symptom investigated
  // this session: a sidebar reading "PRO PLAN" while /signals masked a
  // subset of rows as free-tier-locked. The masking itself was confirmed
  // correct (reads live DB tier every request); this closes the OTHER
  // side — the cached label. One extra GET /me per fresh page load/login,
  // merged into the SAME stored `user` object every other read of `user`
  // already uses, so this needed no changes anywhere else. Ref-guarded to
  // fire once per distinct logged-in user, not on every render.
  const refreshedForUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!stored || refreshedForUserRef.current === stored.user.user_id) return;
    refreshedForUserRef.current = stored.user.user_id;
    getMe(stored.access_token)
      .then((profile) => {
        setStored((current) => {
          if (!current || current.user.user_id !== profile.user_id) return current;
          const next: StoredAuth = {
            ...current,
            user: { ...current.user, tier: profile.tier, name: profile.name, email: profile.email, phone: profile.phone },
          };
          writeStorage(next);
          return next;
        });
      })
      .catch(() => {
        // Fail-soft, same posture as every other best-effort refresh in
        // this app (e.g. AskRedixFi.tsx's refreshUsage) — keeps whatever
        // tier was already cached rather than logging the user out over a
        // transient network error.
      });
  }, [stored]);

  const loginWithFirebaseToken = useCallback(async (firebaseToken: string) => {
    const tokens: AuthTokens = await firebaseLogin(firebaseToken);
    const next: StoredAuth = { access_token: tokens.access_token, refresh_token: tokens.refresh_token, user: tokens.user };
    writeStorage(next);
    setStored(next);
  }, []);

  const logout = useCallback(() => {
    writeStorage(null);
    setStored(null);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    const current = readStorage();
    if (!current) return null;
    if (!isExpiringSoon(current.access_token)) return current.access_token;
    try {
      const refreshed = await refreshTokens(current.refresh_token);
      const next: StoredAuth = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        user: refreshed.user,
      };
      writeStorage(next);
      setStored(next);
      return next.access_token;
    } catch {
      writeStorage(null);
      setStored(null);
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user: stored?.user ?? null, loading, getToken, loginWithFirebaseToken, logout }),
    [stored, loading, getToken, loginWithFirebaseToken, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
