"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getFirebaseAuth } from "@/lib/auth/firebase";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card } from "@/components/ui/Card";

/** Firebase requires E.164 (+<country code><number>); assume India for bare 10-digit input. */
function toE164(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed;
  return `+91${trimmed.replace(/\D/g, "")}`;
}

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
      const result = await signInWithPhoneNumber(auth, toE164(phone), verifier);
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

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-4 text-xl font-semibold">Log in</h1>
      <Card>
        {stage === "phone" ? (
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
