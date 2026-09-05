"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/lib/api/client";
import {
  listReviewQueue,
  getReviewQueueRow,
  approveReviewRow,
  rejectReviewRow,
} from "@/lib/api/mutations";
import type { ReviewQueueDetail, ReviewQueueList, ReviewQueueState } from "@/lib/api/types";

/**
 * `/admin/review-queue` — NOT linked in any user-facing nav (see
 * src/components/layout/Sidebar.tsx's fixed NAV_ITEMS, untouched by this
 * page), same posture as PromoCodeAdminView. The hidden URL is not the
 * security boundary: every request here hits a route gated server-side by
 * core/admin_auth.py::require_admin, re-checked on every request. A
 * non-admin who reaches this URL sees ONLY the access-denied state — the
 * queue never renders without a successful 403-free response first.
 *
 * This matters more here than on the promo page: everything in this queue is
 * LLM output that has NOT been published to users.
 *
 * THE REVIEW SCREEN IS DELIBERATELY THREE PANES. Judging a held output means
 * comparing the source document, what Qwen actually produced, and why the
 * validator rejected it. Showing fewer than all three turns the reviewer into
 * a rubber stamp, which defeats the point of holding the output at all.
 */

const STATE_TABS: { value: ReviewQueueState | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "retry_queued", label: "Retry queued" },
  { value: "approved", label: "Approved" },
  { value: "discarded", label: "Discarded" },
  { value: "all", label: "All" },
];

/** Fields an annual_report / concall output can carry. Mirrors
 *  api/app/core/review_queue.py::OUTPUT_FIELDS — kept in sync by hand, same
 *  convention as PromoCodeAdminView's APPLIES_TO options. Only fields the
 *  backend accepts are editable; anything else would be silently dropped on
 *  approve, which would be worse than not offering it. */
const EDITABLE_FIELDS = [
  "executive_summary",
  "key_points",
  "important_risks",
  "summary",
  "bullets",
  "key_takeaway",
  "tone_label",
  "tone_note",
];

const LIST_FIELDS = new Set(["key_points", "important_risks", "bullets"]);

function toEditable(output: Record<string, unknown> | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of EDITABLE_FIELDS) {
    const v = output?.[f];
    if (v === undefined) continue;
    out[f] = Array.isArray(v) ? v.join("\n") : String(v ?? "");
  }
  return out;
}

/** Turn the textareas back into the shape the backend expects. List-valued
 *  fields go back to arrays, split on newlines — a reviewer editing bullets
 *  should not have to hand-write JSON. */
function fromEditable(edited: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(edited)) {
    out[k] = LIST_FIELDS.has(k)
      ? v.split("\n").map((s) => s.trim()).filter(Boolean)
      : v;
  }
  return out;
}

export function ReviewQueueAdminView() {
  const { getToken } = useAuth();
  const [authState, setAuthState] = useState<"checking" | "denied" | "ok">("checking");
  const [tab, setTab] = useState<ReviewQueueState | "all">("pending");
  const [list, setList] = useState<ReviewQueueList | null>(null);
  const [selected, setSelected] = useState<ReviewQueueDetail | null>(null);
  const [loadingRow, setLoadingRow] = useState(false);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(state: ReviewQueueState | "all" = tab) {
    const token = await getToken();
    if (!token) {
      setAuthState("denied");
      return;
    }
    try {
      const data = await listReviewQueue(token, state);
      setList(data);
      setAuthState("ok");
    } catch (e) {
      // A non-admin token gets 403 here — the ONLY thing this page ever shows
      // such a caller is the access-denied state below.
      setAuthState("denied");
      if (e instanceof ApiError && e.status !== 403 && e.status !== 401) {
        setError(e.message);
      }
    }
  }

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function openRow(id: string) {
    setError(null);
    setNotice(null);
    setLoadingRow(true);
    setIsEditing(false);
    setNote("");
    try {
      const token = await getToken();
      if (!token) return;
      const row = await getReviewQueueRow(token, id);
      setSelected(row);
      setEdited(toEditable(row.qwen_output));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load that row.");
    } finally {
      setLoadingRow(false);
    }
  }

  async function act(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(done);
      setSelected(null);
      await load(tab);
    } catch (e) {
      // A 409 here means someone else resolved this row first — a real
      // scenario with two reviewers, and the message says so rather than
      // failing generically.
      setError(e instanceof ApiError ? e.message : "That action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function doApprove(withEdit: boolean) {
    const token = await getToken();
    if (!token || !selected) return;
    await act(
      () => approveReviewRow(token, selected.id, withEdit ? fromEditable(edited) : undefined),
      withEdit ? "Approved with your edits — published." : "Approved as-is — published.",
    );
  }

  async function doReject(retry: boolean) {
    const token = await getToken();
    if (!token || !selected) return;
    if (!retry && !note.trim()) {
      setError("A discard is permanent — write down why first.");
      return;
    }
    await act(
      () => rejectReviewRow(token, selected.id, retry, note.trim()),
      retry
        ? "Retry requested for automatic generation. If the GPU account is busy, the worker checks again after one hour. No publication has changed."
        : "Discarded. The document was not changed.",
    );
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

  // ---------------------------------------------------------------- detail
  if (selected) {
    const src = selected.source;
    return (
      <div className="space-y-4">
        <button className="text-sm underline" onClick={() => setSelected(null)}>
          ← Back to queue
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Card title={`${selected.symbol ?? selected.doc_id} — ${selected.task}`}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-foreground-muted">Document</dt>
            <dd className="break-all">{selected.doc_id}</dd>
            <dt className="text-foreground-muted">Model</dt>
            <dd>{selected.model || "—"}</dd>
            <dt className="text-foreground-muted">Attempts</dt>
            <dd>
              {selected.attempts}
              {selected.retry_count > 0 && ` (retried ${selected.retry_count}×)`}
            </dd>
            <dt className="text-foreground-muted">Held since</dt>
            <dd>{new Date(selected.created_at).toLocaleString()}</dd>
          </dl>
        </Card>

        {/* Why it was rejected — first, because it frames everything below. */}
        <Card title="Why the validator rejected it">
          <p className="text-sm font-medium text-amber-700">{selected.reason}</p>
          {selected.final_status && (
            <p className="mt-1 text-xs text-foreground-muted">{selected.final_status}</p>
          )}
        </Card>

        <Card title={isEditing ? "Qwen's output — editing" : "What Qwen produced"}>
          {!selected.qwen_output && (
            <p className="text-sm text-foreground-muted">
              Qwen produced no usable output. This row must be edited before it can be approved, or
              rejected.
            </p>
          )}
          {selected.qwen_output && !isEditing && (
            <div className="space-y-3 text-sm">
              {EDITABLE_FIELDS.filter((f) => selected.qwen_output?.[f] !== undefined).map((f) => {
                const v = selected.qwen_output?.[f];
                return (
                  <div key={f}>
                    <div className="text-xs uppercase tracking-wide text-foreground-muted">{f}</div>
                    {Array.isArray(v) ? (
                      <ul className="list-disc pl-5">
                        {v.map((item, i) => (
                          <li key={i}>{String(item)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="whitespace-pre-wrap">{String(v ?? "")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {isEditing && (
            <div className="space-y-3">
              {EDITABLE_FIELDS.map((f) => (
                <div key={f}>
                  <label className="text-xs uppercase tracking-wide text-foreground-muted">
                    {f}
                    {LIST_FIELDS.has(f) && " (one per line)"}
                  </label>
                  <textarea
                    className="mt-1 w-full rounded border p-2 text-sm"
                    rows={LIST_FIELDS.has(f) ? 4 : 3}
                    value={edited[f] ?? ""}
                    onChange={(e) => setEdited((s) => ({ ...s, [f]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
          <button
            className="mt-3 text-sm underline"
            onClick={() => setIsEditing((v) => !v)}
            disabled={busy}
          >
            {isEditing ? "Cancel editing" : "Edit before approving"}
          </button>
        </Card>

        <Card title="Source document">
          {!src.available && <p className="text-sm text-foreground-muted">Source document not found.</p>}
          {src.available && (
            <>
              <p className="mb-2 text-xs text-foreground-muted">
                {src.company_name} {src.fiscal_year ? `· ${src.fiscal_year}` : ""}
                {src.source_pdf_url && (
                  <>
                    {" · "}
                    <a className="underline" href={src.source_pdf_url} target="_blank" rel="noreferrer">
                      open original PDF
                    </a>
                  </>
                )}
              </p>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-black/5 p-3 text-xs">
                {src.excerpt}
              </pre>
              {src.truncated && (
                <p className="mt-1 text-xs text-foreground-muted">
                  Showing the first {src.excerpt?.length.toLocaleString()} of{" "}
                  {src.total_chars?.toLocaleString()} characters — open the PDF for the rest.
                </p>
              )}
            </>
          )}
        </Card>

        {selected.state === "pending" ? (
          <Card title="Decide">
            <textarea
              className="mb-3 w-full rounded border p-2 text-sm"
              rows={2}
              placeholder="Note (required to discard)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={busy || !selected.qwen_output}
                onClick={() => doApprove(false)}
              >
                Approve as-is
              </button>
              <button
                className="rounded bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={busy}
                onClick={() => doApprove(true)}
              >
                Approve with my edits
              </button>
              <button
                className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={busy}
                onClick={() => doReject(true)}
              >
                Reject → retry later
              </button>
              <button
                className="rounded bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={busy}
                onClick={() => doReject(false)}
              >
                Reject → discard
              </button>
            </div>
            <p className="mt-2 text-xs text-foreground-muted">
              Retry requests automatic GPU generation. If the GPU account is busy,
              the worker checks again after one hour. There is no fixed completion time.
              An output that fails validation returns here for review.
              Discard retains this decision and blocks automatic replacement of this candidate.
              Neither rejection removes an earlier published summary.
            </p>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-foreground-muted">
              Already {selected.state.replace("_", " ")}
              {selected.state === "retry_queued" && (selected.dispatch_batch
                ? " — selected for a batch awaiting generation/writeback"
                : " — awaiting an eligible batch slot")}
              {selected.resolution_kind === "validated_retry" && " — retry passed validation and was published automatically"}
              {selected.resolved_by && ` by ${selected.resolved_by}`}
              {selected.review_note && ` — “${selected.review_note}”`}
            </p>
          </Card>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------ list
  return (
    <div className="space-y-4">
      {notice && <p className="text-sm text-green-700">{notice}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {STATE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded px-3 py-1 text-sm ${
              tab === t.value ? "bg-foreground text-background" : "bg-black/5"
            }`}
          >
            {t.label}
            {list && t.value !== "all" && ` (${list.counts[t.value as ReviewQueueState] ?? 0})`}
          </button>
        ))}
      </div>

      {!list && <p className="text-sm text-foreground-muted">Loading…</p>}

      {list && list.rows.length === 0 && (
        <Card>
          <p className="text-sm text-foreground-muted">
            {tab === "pending" ? "Nothing waiting for review." : "Nothing here."}
          </p>
        </Card>
      )}

      {list && list.rows.length > 0 && (
        <Card>
          <ul className="divide-y">
            {list.rows.map((r) => (
              <li key={r.id} className="py-2">
                <button className="w-full text-left" onClick={() => openRow(r.id)} disabled={loadingRow}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{r.symbol ?? r.doc_id}</span>
                    <span className="text-xs text-foreground-muted">{r.task}</span>
                  </div>
                  <div className="truncate text-sm text-amber-700">{r.reason}</div>
                  <div className="text-xs text-foreground-muted">
                    held {new Date(r.created_at).toLocaleDateString()}
                    {r.retry_count > 0 && ` · retried ${r.retry_count}×`}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
