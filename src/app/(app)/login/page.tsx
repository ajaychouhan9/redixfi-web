"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirebaseAuth } from "@/lib/auth/firebase";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card } from "@/components/ui/Card";
import { RedixFiLogo } from "@/components/brand/RedixFiLogo";

/**
 * TASK 19 — Auth redesign. Google Sign-In (primary) + email/password
 * (fallback, Screener.in's confirmed pattern), replacing the phone-OTP
 * form that used to be the ONLY option here.
 *
 * Phone-OTP is NOT deleted outright — the task doc's two acceptance
 * criteria ("no phone number requested during signup/login" AND "existing
 * phone-OTP accounts unaffected... still log in correctly") only both hold
 * if a real, working phone path still exists somewhere, just not as a
 * default any new signup would see. It's collapsed behind a small "Log in
 * with phone instead" link at the very bottom, explicitly framed for
 * returning phone-linked accounts — nothing about it is visible or
 * prompted for on first paint, satisfying "no phone requested during
 * signup" for every NEW visitor while not stranding an existing one.
 *
 * Both new methods terminate in the exact same place the old phone form
 * did: a Firebase ID token handed to loginWithFirebaseToken(), which hits
 * the SAME POST /auth/firebase-login the phone flow always used — nothing
 * about session issuance/storage changed, only how the ID token is
 * obtained client-side.
 *
 * RECURRING BUG PATTERN (flagged in the last two sessions' completion
 * notes — the Signals paywall bug, then the News/Events staleness bug):
 * both were the frontend forgetting to attach an auth token to an API
 * request. Doesn't apply to the requests in THIS file specifically —
 * Firebase's client SDK doesn't need a token of ours (it's what PRODUCES
 * one) — but every path here still funnels through the same
 * loginWithFirebaseToken -> firebaseLogin("/auth/firebase-login") request
 * already used elsewhere, so there's no new request site here that could
 * independently forget one.
 */

type Mode = "signin" | "signup" | "reset";

/** Firebase requires E.164 (+<country code><number>); assume India for bare 10-digit input. Same convention as core/routers/me.py's server-side _to_e164 (Task 19's phone add-on) — kept in sync manually. */
function toE164(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed;
  return `+91${trimmed.replace(/\D/g, "")}`;
}

export default function LoginPage() {
  const router = useRouter();
  const { loginWithFirebaseToken } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Secondary, collapsed phone-OTP path — existing accounts only, see
  // module docstring. Kept entirely separate from `mode` above so it can
  // never become the thing a new visitor lands on by default.
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStage, setPhoneStage] = useState<"phone" | "otp">("phone");
  const [confirmation, setConfirmation] = useState<import("firebase/auth").ConfirmationResult | null>(null);

  // Lets the homepage's "Start free" CTA (VisitorIntroStrip) land directly
  // on the signup form instead of sign-in. Read via window.location rather
  // than useSearchParams so this page doesn't need a Suspense boundary for
  // a one-time initial-mode read.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("mode") === "signup") {
      // One-time initial-mode read from the URL on mount, not a sync loop —
      // deliberately not useSearchParams() to avoid forcing this otherwise-
      // static page into a Suspense boundary for a single query param.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("signup");
    }
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function finishLogin(idToken: string) {
    await loginWithFirebaseToken(idToken);
    router.push("/account");
  }

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      await finishLogin(idToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in with Google.");
    } finally {
      setBusy(false);
    }
  }

  async function submitEmailForm() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (mode === "reset") {
        const { sendPasswordResetEmail } = await import("firebase/auth");
        await sendPasswordResetEmail(auth, email);
        setNotice(`Password reset link sent to ${email} — check your inbox.`);
        return;
      }
      if (mode === "signup") {
        const { createUserWithEmailAndPassword } = await import("firebase/auth");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const idToken = await cred.user.getIdToken();
        await finishLogin(idToken);
        return;
      }
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      await finishLogin(idToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    setError(null);
    setBusy(true);
    try {
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
      const auth = getFirebaseAuth();
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      const result = await signInWithPhoneNumber(auth, toE164(phone), verifier);
      setConfirmation(result);
      setPhoneStage("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!confirmation) return;
    setError(null);
    setBusy(true);
    try {
      const cred = await confirmation.confirm(otp);
      const idToken = await cred.user.getIdToken();
      await finishLogin(idToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <RedixFiLogo variant="compact" layout="col" size={56} />
      </div>
      <h1 className="mb-4 text-xl font-semibold">{mode === "signup" ? "Create your account" : "Log in"}</h1>
      <Card>
        <div className="space-y-4">
          {/* Primary: Google Sign-In — most visible option, per the task doc. */}
          <button
            onClick={signInWithGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-foreground-faint">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Fallback: email + password (Screener.in's confirmed pattern). */}
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-foreground-muted">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
              />
            </label>
            {mode !== "reset" && (
              <label className="block text-sm">
                <span className="mb-1 block text-foreground-muted">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                />
              </label>
            )}
            <button
              onClick={submitEmailForm}
              disabled={busy || !email || (mode !== "reset" && !password)}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Log in"}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            {mode === "signin" && (
              <>
                <button onClick={() => switchMode("signup")} className="font-medium text-accent">
                  Create an account
                </button>
                <button onClick={() => switchMode("reset")} className="text-foreground-muted">
                  Forgot password?
                </button>
              </>
            )}
            {mode !== "signin" && (
              <button onClick={() => switchMode("signin")} className="font-medium text-accent">
                Back to log in
              </button>
            )}
          </div>
        </div>
        {notice && <p className="mt-3 text-sm text-up">{notice}</p>}
        {error && <p className="mt-3 text-sm text-down">{error}</p>}
      </Card>

      {/* Secondary, collapsed phone-OTP path — existing accounts only. See
          module docstring for why this exists instead of being deleted. */}
      <div className="mt-3 text-center">
        {!showPhoneLogin ? (
          <button onClick={() => setShowPhoneLogin(true)} className="text-xs text-foreground-faint underline">
            Already have a phone-linked account? Log in with phone instead
          </button>
        ) : (
          <Card className="mt-3 text-left">
            <p className="mb-3 text-xs text-foreground-muted">For existing phone-linked accounts only.</p>
            {phoneStage === "phone" ? (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Phone number</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91XXXXXXXXXX"
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                  />
                </label>
                <div id="recaptcha-container" />
                <button
                  onClick={sendOtp}
                  disabled={busy || !phone}
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Send OTP
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground-muted">Enter the code sent to {toE164(phone)}</span>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                  />
                </label>
                <button
                  onClick={verifyOtp}
                  disabled={busy || !otp}
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.4 34.9 26.8 36 24 36c-5.3 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.5 5.5C40.9 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}
