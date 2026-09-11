"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getDailyBriefExport } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/client";
import { buildSocialVariants, type SocialVariant } from "@/lib/dailyBriefSocialFormat";
import type { DailyBrief } from "@/lib/api/types";

/** Same authState pattern PromoCodeAdminView.tsx already established —
 * the hidden route is not the security boundary, core/admin_auth.py::
 * require_admin (checked server-side on every request) is; a non-admin
 * token gets 403 here and sees only the access-denied state below, same
 * as that page. */
export function DailyBriefExportView() {
  const { getToken } = useAuth();
  const [authState, setAuthState] = useState<"checking" | "denied" | "ok">("checking");
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setAuthState("denied");
        return;
      }
      try {
        const data = await getDailyBriefExport(token);
        setBrief(data);
        setAuthState("ok");
      } catch (e) {
        setAuthState(e instanceof ApiError ? "denied" : "denied");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copy(variant: SocialVariant) {
    try {
      await navigator.clipboard.writeText(variant.text);
      setCopiedKey(variant.key);
      setTimeout(() => setCopiedKey((k) => (k === variant.key ? null : k)), 1500);
    } catch {
      // clipboard unavailable — the textarea below is still selectable/copyable by hand
    }
  }

  if (authState === "checking") return <p className="text-sm text-foreground-muted">Loading…</p>;
  if (authState === "denied") return <p className="text-sm text-down">You don&apos;t have access to this page.</p>;
  if (!brief) {
    return (
      <p className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-foreground-muted">
        No AI Daily Brief has been generated yet today — check back after the morning or close edition runs.
      </p>
    );
  }

  const variants = buildSocialVariants(brief);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm">
        <span className="font-medium">{brief.period === "close" ? "Close" : "Morning"} edition</span>
        <span className="text-foreground-muted"> · {brief.date} · generated {new Date(brief.created_at).toLocaleString("en-IN")}</span>
      </div>

      {variants.map((v) => {
        const overLimit = v.charLimit !== null && v.charCount > v.charLimit;
        return (
          <div key={v.key} className="rounded-xl border border-border bg-surface-raised p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-accent">{v.label}</span>
                <span className="ml-2 text-xs text-foreground-faint">{v.platformNote}</span>
              </div>
              <button
                onClick={() => copy(v)}
                className="flex items-center gap-1 rounded-md border border-border bg-hover px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground"
              >
                {copiedKey === v.key ? <Check size={13} className="text-up" /> : <Copy size={13} />}
                {copiedKey === v.key ? "Copied" : "Copy to clipboard"}
              </button>
            </div>
            <textarea
              readOnly
              value={v.text}
              rows={v.key === "long" ? 12 : v.key === "medium" ? 8 : 5}
              className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs leading-relaxed"
            />
            <p className={`mt-1 text-xs ${overLimit ? "text-down" : "text-foreground-faint"}`}>
              {v.charCount.toLocaleString("en-IN")} characters{v.charLimit ? ` / ${v.charLimit.toLocaleString("en-IN")} limit` : ""}
              {overLimit ? " — over limit" : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
