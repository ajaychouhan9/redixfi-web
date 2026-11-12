"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { BookmarkPlus, Check, Pencil, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSignals, type SignalsListParams } from "@/lib/api/endpoints";
import {
  createMyScreen,
  deleteMyScreen,
  listMyScreens,
  renameMyScreen,
  viewMyScreen,
  type MyScreen,
  type MyScreensList,
  type MyScreenView,
} from "@/lib/api/mutations";
import type { SharedScreenParams } from "@/lib/api/types";

/** A saved screen is compared by symbol list; above this many members the comparison is skipped (it would need many page requests). */
const MAX_COMPARE_MEMBERS = 1000;
const PAGE = 200;

/**
 * "My screens" (13 Nov 2026): private saved filter combinations per user (Free 1, Basic 5, Pro 20). Opening a screen applies its
 * filters and shows which stocks are in it now that were not in it at the last time it was opened ("added since your last view").
 * The first time a screen is opened there is nothing to compare with, so no difference is shown. Neutral wording only.
 */
export function MyScreens({ params, onApply }: { params: SharedScreenParams; onApply: (p: SharedScreenParams) => void }) {
  const { user, getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<MyScreensList | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [result, setResult] = useState<{ screen: MyScreen; view: MyScreenView | null; skipped?: boolean } | null>(null);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      setData(await listMyScreens(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your screens.");
    }
  }, [getToken]);

  if (!user) return null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please log in again.");
      await createMyScreen(token, name.trim() || "My screen", params);
      setName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the screen.");
    } finally {
      setBusy(false);
    }
  }

  async function openScreen(s: MyScreen) {
    setBusy(true);
    setError(null);
    setResult(null);
    onApply(s.params);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please log in again.");
      const base = { ...s.params } as Record<string, unknown>;
      delete base.watchlist_only;
      const first = await getSignals({ ...(base as SignalsListParams), page: 1, size: PAGE }, { token });
      const total = first.page_info.total;
      if (total > MAX_COMPARE_MEMBERS) {
        setResult({ screen: s, view: null, skipped: true });
        return;
      }
      const symbols = first.data.map((r) => r.symbol);
      for (let p = 2; p <= Math.ceil(total / PAGE); p++) {
        const next = await getSignals({ ...(base as SignalsListParams), page: p, size: PAGE }, { token });
        symbols.push(...next.data.map((r) => r.symbol));
      }
      const view = await viewMyScreen(token, s.id, symbols);
      setResult({ screen: s, view });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the screen.");
    } finally {
      setBusy(false);
    }
  }

  async function doRename() {
    if (!renaming) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please log in again.");
      await renameMyScreen(token, renaming.id, renaming.name.trim());
      setRenaming(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename the screen.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please log in again.");
      await deleteMyScreen(token, id);
      if (result?.screen.id === id) setResult(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the screen.");
    } finally {
      setBusy(false);
    }
  }

  const full = data ? data.count >= data.limit : false;

  return (
    <div className="relative" data-testid="my-screens">
      <button
        type="button"
        onClick={() => {
          if (!open && !data) void refresh();
          setOpen((o) => !o);
        }}
        title="Your saved screens"
        className="flex h-9 items-center gap-1 rounded-lg border border-border bg-hover px-2 text-xs text-foreground-muted"
      >
        <BookmarkPlus size={13} />
        My screens
      </button>
      {open && (
        <div className="fixed inset-x-4 top-24 z-30 max-h-[80vh] overflow-y-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1 sm:w-80 rounded-lg border border-border bg-surface-raised p-3 text-sm shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">My screens{data ? ` (${data.count} of ${data.limit})` : ""}</p>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="p-1 text-foreground-faint">
              <X size={14} />
            </button>
          </div>

          {data && data.screens.length === 0 && <p className="mb-2 text-xs text-foreground-faint">No saved screens yet. Set your filters, name them below and save.</p>}
          <ul className="mb-2 space-y-1">
            {data?.screens.map((s) => (
              <li key={s.id} className="flex items-center gap-1 rounded-lg border border-border/70 px-2 py-1">
                {renaming?.id === s.id ? (
                  <>
                    <input
                      value={renaming.name}
                      maxLength={60}
                      onChange={(e) => setRenaming({ id: s.id, name: e.target.value })}
                      className="min-w-0 flex-1 rounded border border-border bg-hover px-1.5 py-1 text-xs outline-none"
                    />
                    <button type="button" aria-label="Save name" disabled={busy} onClick={doRename} className="p-2 text-accent">
                      <Check size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={busy} onClick={() => openScreen(s)} className="min-w-0 flex-1 truncate py-1.5 text-left text-xs text-foreground hover:underline">
                      {s.name}
                    </button>
                    <button type="button" aria-label={`Rename ${s.name}`} onClick={() => setRenaming({ id: s.id, name: s.name })} className="p-2 text-foreground-faint">
                      <Pencil size={13} />
                    </button>
                    <button type="button" aria-label={`Delete ${s.name}`} disabled={busy} onClick={() => remove(s.id)} className="p-2 text-foreground-faint">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          {result && (
            <div className="mb-2 rounded-lg bg-hover px-2 py-2 text-xs text-foreground-muted" data-testid="my-screen-diff">
              {result.skipped ? (
                <p>&ldquo;{result.screen.name}&rdquo; shows more than {MAX_COMPARE_MEMBERS.toLocaleString("en-IN")} stocks, so it is not compared with your last view. Narrow the filters to compare.</p>
              ) : result.view?.first_view ? (
                <p>First time you open &ldquo;{result.screen.name}&rdquo;: {result.view.member_count.toLocaleString("en-IN")} stocks are in it now. Next time you open it, it will show which stocks were added since this view.</p>
              ) : result.view && result.view.added.length === 0 ? (
                <p>No stocks were added to &ldquo;{result.screen.name}&rdquo; since your last view ({result.view.member_count.toLocaleString("en-IN")} in it now).</p>
              ) : (
                result.view && (
                  <>
                    <p>
                      {result.view.added.length.toLocaleString("en-IN")} stock{result.view.added.length === 1 ? "" : "s"} added since your last view of &ldquo;{result.screen.name}&rdquo;
                      {result.view.previous_view_at ? ` (${new Date(result.view.previous_view_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})` : ""}:
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                      {result.view.added.slice(0, 40).map((sym) => (
                        <Link key={sym} href={`/stocks/${encodeURIComponent(sym)}`} className="font-mono text-accent underline">
                          {sym}
                        </Link>
                      ))}
                      {result.view.added.length > 40 && <span>and {result.view.added.length - 40} more</span>}
                    </p>
                  </>
                )
              )}
            </div>
          )}

          <label className="mb-1 block text-[11px] font-medium text-foreground-muted">Save the current filters as</label>
          <div className="flex gap-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Low debt, high delivery"
              className="min-w-0 flex-1 rounded-lg border border-border bg-hover px-2 py-1.5 text-xs outline-none"
            />
            <button type="button" disabled={busy || full} onClick={save} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-40">
              Save
            </button>
          </div>
          {full && <p className="mt-1 text-[11px] text-foreground-faint">Your plan keeps up to {data?.limit} saved screen{data?.limit === 1 ? "" : "s"}. Delete one to save another, or see <Link href="/pricing" className="underline">pricing</Link>.</p>}
          {error && <p className="mt-2 text-xs text-negative">{error}</p>}
          <p className="mt-2 text-[10px] leading-snug text-foreground-faint">
            A screen lists stocks by measured data only. RedixFi is not a SEBI-registered Research Analyst or Investment Adviser. It provides measured market data and analytics only: not investment advice, recommendations or predictions.
          </p>
        </div>
      )}
    </div>
  );
}
