"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { firebaseLogin, refreshTokens, type AuthTokens, type AuthUser } from "@/lib/api/mutations";
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
