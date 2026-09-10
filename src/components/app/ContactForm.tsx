"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { submitContactMessage } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/client";

/**
 * Chat-box alternative to the mailto: link on the About & Contact page
 * (2026-09-11) — for a visitor who'd rather not leave the app or doesn't
 * have a working email client. Posts to POST /support/contact
 * (routers/support.py), which just stores the message — there is no
 * live/monitored inbox behind either this form or the mailto: link yet,
 * so both carry the same 24–48h response-time disclaimer rather than a
 * promise this session can't back up.
 */
export function ContactForm() {
  const { user, getToken } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const token = user ? await getToken() : null;
      await submitContactMessage(token, { name: name.trim(), email: email.trim(), message: message.trim() });
      setSent(true);
      setMessage("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <p className="text-sm text-up">Thanks — your message was sent. We usually respond within 24–48 hours.</p>;
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-foreground-muted">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
        />
      </label>
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
      <label className="block text-sm">
        <span className="mb-1 block text-foreground-muted">Message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Describe the issue or question"
          className="w-full resize-none rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
        />
      </label>
      <button
        onClick={submit}
        disabled={busy || !name.trim() || !email.trim() || !message.trim()}
        className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
      {error && <p className="text-xs text-down">{error}</p>}
    </div>
  );
}
