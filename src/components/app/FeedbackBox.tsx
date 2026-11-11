"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/auth/AuthContext";
import { submitFeedback } from "@/lib/api/mutations";

/** One question, "What were you looking for?", with an optional email (11 Nov 2026). Stored with the page and the plan; rate limited by the API. */
export function FeedbackBox({ page, className = "" }: { page: "stock" | "no_result" | "pricing"; className?: string }) {
  const { getToken } = useAuth();
  const path = usePathname() || "";
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!text.trim()) return;
    setState("busy");
    setError(null);
    try {
      const token = await getToken();
      await submitFeedback({ text: text.trim(), page, path, email: email.trim() || undefined }, token);
      setState("done");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We could not send that. Please try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return <p className={`text-sm text-foreground-muted ${className}`} data-testid="feedback-done">Thank you. We read every answer.</p>;
  }
  return (
    <div className={`rounded-xl border border-border bg-surface-raised p-3 ${className}`} data-testid="feedback-box">
      <label className="block text-sm font-medium" htmlFor={`feedback-${page}`}>What were you looking for?</label>
      <textarea
        id={`feedback-${page}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        rows={2}
        className="mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
        placeholder="A few words are enough"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email, only if you want a reply (optional)"
          className="min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
          aria-label="Email (optional)"
        />
        <button type="button" onClick={send} disabled={!text.trim() || state === "busy"} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50">
          {state === "busy" ? "Sending…" : "Send"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-down">{error}</p>}
    </div>
  );
}
