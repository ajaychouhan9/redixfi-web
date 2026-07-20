"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/auth/firebase";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithFirebaseToken } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [confirmation, setConfirmation] = useState<import("firebase/auth").ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendOtp() {
    setError(null);
    setBusy(true);
    try {
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
      const auth = getFirebaseAuth();
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      const result = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmation(result);
      setStage("otp");
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
      await loginWithFirebaseToken(idToken);
      router.push("/account");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  async function devLogin() {
    setError(null);
    setBusy(true);
    try {
      await loginWithFirebaseToken("dev-test");
      router.push("/account");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dev login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-4 text-xl font-semibold">Log in</h1>
      <Card>
        {!firebaseConfigured ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground-muted">
              Phone OTP sign-in isn&apos;t provisioned in this environment (no Firebase project keys set). The API
              is running with <code className="rounded bg-neutral-bg px-1">DEV_AUTH=true</code>, so you can continue
              as the sandbox test account.
            </p>
            <button
              onClick={devLogin}
              disabled={busy}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              Continue as test user (dev)
            </button>
          </div>
        ) : stage === "phone" ? (
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
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              Send OTP
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-foreground-muted">Enter the code sent to {phone}</span>
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
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              Verify
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-down">{error}</p>}
      </Card>
    </div>
  );
}
