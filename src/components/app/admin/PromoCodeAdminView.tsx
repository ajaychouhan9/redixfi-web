"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/lib/api/client";
import {
  listPromoCodes,
  createPromoCodeAdmin,
  updatePromoCodeAdmin,
  deactivatePromoCodeAdmin,
  type CreatePromoCodeBody,
} from "@/lib/api/mutations";
import type { PromoCodeAdmin } from "@/lib/api/types";

/**
 * `/admin/promo-codes` — NOT linked in any user-facing nav (see
 * src/components/layout/Sidebar.tsx's fixed NAV_ITEMS, untouched by this
 * page). The hidden URL is not the security boundary: every call this
 * component makes (list/create/update/deactivate) hits an API route
 * gated server-side by core/admin_auth.py::require_admin, checked fresh
 * on every request regardless of whether this page happens to load. A
 * non-admin who somehow reaches this URL sees ONLY the access-denied
 * state below — the create form and code table never render without a
 * successful authenticated 403-free response first.
 */

// Multi-tier restructure (2026-08-08) — 4 labels, one per Basic/Pro x
// monthly/annual combination (was "monthly"/"annual", spanning the
// single pre-restructure paid tier). Mirrors routers/admin.py's
// VALID_APPLIES_TO exactly (kept in sync manually — see that file's own
// comment on why this isn't a shared import across two routers for 4
// literals).
const APPLIES_TO_OPTIONS = [
  { value: "basic_monthly", label: "Basic (monthly)" },
  { value: "pro_monthly", label: "Pro (monthly)" },
  { value: "basic_annual", label: "Basic Annual" },
  { value: "pro_annual", label: "Pro Annual" },
  // Deliberately NO founding option of any kind — a promo code can never
  // discount the (now-retired) founding price-lock. This isn't just a UI
  // omission: the backend (core/routers/billing.py::_valid_promo)
  // refuses the combination unconditionally even if a request were
  // hand-crafted to include it (kept as inert defensive code post-
  // retirement, not removed), and routers/admin.py refuses to even WRITE
  // a founding-related value into a code's applies_to. Belt and
  // suspenders, all layers agree.
];

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function emptyForm(): CreatePromoCodeBody & { unlimited: boolean; noExpiry: boolean } {
  return {
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    applies_to: ["basic_monthly", "pro_monthly"],
    max_redemptions: 100,
    unlimited: false,
    one_use_per_user: false,
    valid_till: "",
    noExpiry: false,
    channel_tag: "admin",
  };
}

export function PromoCodeAdminView() {
  const { getToken } = useAuth();
  const [authState, setAuthState] = useState<"checking" | "denied" | "ok">("checking");
  const [codes, setCodes] = useState<PromoCodeAdmin[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  async function load() {
    const token = await getToken();
    if (!token) {
      setAuthState("denied");
      return;
    }
    try {
      const data = await listPromoCodes(token);
      setCodes(data);
      setAuthState("ok");
    } catch (e) {
      // A non-admin token gets 403 here — the ONLY thing this page ever
      // shows such a caller is the access-denied state below.
      if (e instanceof ApiError && (e.status === 403 || e.status === 401)) {
        setAuthState("denied");
      } else {
        setAuthState("denied");
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleAppliesTo(value: string) {
    setForm((f) => ({
      ...f,
      applies_to: f.applies_to.includes(value) ? f.applies_to.filter((v) => v !== value) : [...f.applies_to, value],
    }));
  }

  function toggleAllPlans() {
    const allValues = APPLIES_TO_OPTIONS.map((o) => o.value);
    setForm((f) => ({ ...f, applies_to: f.applies_to.length === allValues.length ? [] : allValues }));
  }

  async function submitCreate() {
    setFormError(null);
    if (!form.code.trim()) {
      setFormError("Code is required.");
      return;
    }
    if (form.applies_to.length === 0) {
      setFormError("Select at least one applicable plan.");
      return;
    }
    if (form.discount_type === "percentage" && (form.discount_value <= 0 || form.discount_value > 100)) {
      setFormError("Percentage discount must be between 1 and 100.");
      return;
    }
    if (form.discount_type === "flat" && form.discount_value <= 0) {
      setFormError("Flat discount must be greater than ₹0.");
      return;
    }
    const token = await getToken();
    if (!token) return;
    setSaving(true);
    try {
      const body: CreatePromoCodeBody = {
        code: form.code.trim(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        applies_to: form.applies_to,
        max_redemptions: form.unlimited ? null : form.max_redemptions,
        one_use_per_user: form.one_use_per_user,
        valid_till: form.noExpiry ? null : form.valid_till || null,
        channel_tag: form.channel_tag || "admin",
      };
      if (editingCode) {
        await updatePromoCodeAdmin(token, editingCode, {
          discount_type: body.discount_type,
          discount_value: body.discount_value,
          applies_to: body.applies_to,
          max_redemptions_unlimited: form.unlimited,
          max_redemptions: form.unlimited ? undefined : (form.max_redemptions ?? undefined),
          one_use_per_user: body.one_use_per_user,
          valid_till_no_expiry: form.noExpiry,
          valid_till: form.noExpiry ? undefined : body.valid_till ?? undefined,
          channel_tag: body.channel_tag,
        });
      } else {
        await createPromoCodeAdmin(token, body);
      }
      setForm(emptyForm());
      setEditingCode(null);
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Could not save promo code.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: PromoCodeAdmin) {
    setEditingCode(c.code);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      applies_to: c.applies_to,
      max_redemptions: c.max_redemptions ?? 100,
      unlimited: c.max_redemptions === null,
      one_use_per_user: c.one_use_per_user,
      valid_till: c.valid_till ? c.valid_till.slice(0, 10) : "",
      noExpiry: c.valid_till === null,
      channel_tag: c.channel_tag,
    });
  }

  function cancelEdit() {
    setEditingCode(null);
    setForm(emptyForm());
    setFormError(null);
  }

  async function toggleActive(c: PromoCodeAdmin) {
    const token = await getToken();
    if (!token) return;
    if (c.active) {
      await deactivatePromoCodeAdmin(token, c.code);
    } else {
      await updatePromoCodeAdmin(token, c.code, { active: true });
    }
    await load();
  }

  if (authState === "checking") {
    return <p className="text-sm text-foreground-muted">Checking access…</p>;
  }
  if (authState === "denied") {
    return (
      <Card>
        <p className="text-sm text-foreground-muted">Access denied.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={editingCode ? `Edit ${editingCode}` : "Create promo code"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground-faint">Code</span>
            <div className="flex gap-2">
              <input
                value={form.code}
                disabled={!!editingCode}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="LAUNCH50"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none disabled:opacity-60"
              />
              {!editingCode && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, code: randomCode() }))}
                  className="shrink-0 rounded-lg border border-border bg-hover px-3 py-2 text-xs font-medium"
                >
                  Generate
                </button>
              )}
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground-faint">Discount type</span>
            <div className="flex gap-2">
              {(["percentage", "flat"] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, discount_type: t }))}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                    form.discount_type === t ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface text-foreground-muted"
                  }`}
                >
                  {t === "percentage" ? "Percentage (incl. 100% free)" : "Flat ₹ amount"}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground-faint">
              Discount value {form.discount_type === "percentage" ? "(%, max 100)" : "(₹)"}
            </span>
            <input
              type="number"
              min={form.discount_type === "percentage" ? 1 : 1}
              max={form.discount_type === "percentage" ? 100 : undefined}
              value={form.discount_value}
              onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground-faint">Channel tag</span>
            <input
              value={form.channel_tag}
              onChange={(e) => setForm((f) => ({ ...f, channel_tag: e.target.value }))}
              placeholder="launch / whatsapp / reference"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
            />
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground-faint">Applicable plans</span>
              <button type="button" onClick={toggleAllPlans} className="text-xs text-accent hover:underline">
                {form.applies_to.length === APPLIES_TO_OPTIONS.length ? "Clear all" : "All plans"}
              </button>
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-2.5">
              {APPLIES_TO_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.applies_to.includes(o.value)} onChange={() => toggleAppliesTo(o.value)} />
                  {o.label}
                </label>
              ))}
              <p className="mt-1 text-[11px] text-foreground-faint">
                Founding Annual is never discountable — price-lock only, enforced server-side.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="mb-1 block text-xs font-medium text-foreground-faint">Usage limit</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.unlimited} onChange={(e) => setForm((f) => ({ ...f, unlimited: e.target.checked }))} />
              Unlimited total redemptions
            </label>
            {!form.unlimited && (
              <input
                type="number"
                min={1}
                value={form.max_redemptions ?? 1}
                onChange={(e) => setForm((f) => ({ ...f, max_redemptions: Number(e.target.value) }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
              />
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.one_use_per_user}
                onChange={(e) => setForm((f) => ({ ...f, one_use_per_user: e.target.checked }))}
              />
              Max once per user (independent of the total above)
            </label>
          </div>

          <div className="space-y-2">
            <span className="mb-1 block text-xs font-medium text-foreground-faint">Expiry</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.noExpiry} onChange={(e) => setForm((f) => ({ ...f, noExpiry: e.target.checked }))} />
              No expiry
            </label>
            {!form.noExpiry && (
              <input
                type="date"
                value={form.valid_till ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, valid_till: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
              />
            )}
          </div>
        </div>

        {formError && <p className="mt-3 text-sm text-down">{formError}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={submitCreate}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : editingCode ? "Save changes" : "Create code"}
          </button>
          {editingCode && (
            <button type="button" onClick={cancelEdit} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
              Cancel
            </button>
          )}
        </div>
      </Card>

      <Card title={`All codes (${codes.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            {/* Font-size audit (2026-08-11): was text-[10px], bumped to
                text-[13px] per the task's 13px "secondary labels" floor. */}
            <thead>
              <tr className="border-b border-border text-left font-mono text-[13px] uppercase tracking-wide text-foreground-faint">
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Value</th>
                <th className="px-2 py-2">Plans</th>
                <th className="px-2 py-2">Used / Limit</th>
                <th className="px-2 py-2">Expiry</th>
                <th className="px-2 py-2">Active</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.code} className="border-b border-border last:border-0">
                  <td className="px-2 py-2 font-mono font-semibold">{c.code}</td>
                  <td className="px-2 py-2">{c.discount_type}</td>
                  <td className="px-2 py-2">{c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}</td>
                  <td className="px-2 py-2 text-xs">
                    {c.applies_to.join(", ")}
                    {c.one_use_per_user && <span className="ml-1 text-foreground-faint">(1/user)</span>}
                  </td>
                  <td className="px-2 py-2">
                    {c.redeemed_count} / {c.max_redemptions ?? "∞"}
                  </td>
                  <td className="px-2 py-2 text-xs">{c.valid_till ? c.valid_till.slice(0, 10) : "No expiry"}</td>
                  <td className="px-2 py-2">
                    <span className={c.active ? "text-up" : "text-foreground-faint"}>{c.active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button type="button" onClick={() => startEdit(c)} className="mr-2 text-xs text-accent hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => toggleActive(c)} className="text-xs text-foreground-faint hover:underline">
                      {c.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-sm text-foreground-muted">
                    No promo codes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
