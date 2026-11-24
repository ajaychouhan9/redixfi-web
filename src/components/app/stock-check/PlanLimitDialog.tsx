"use client";

import { useState } from "react";
import Link from "next/link";

import { deleteRuleRun, listRuleRuns, type RuleRun } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import { fmtDay, stocksText } from "@/lib/my-rules";
import { FREE_UPGRADE_SAVE, SEE_PRICING } from "@/lib/report-flow";
import {
  DELETE_OTHER, DELETE_OTHER_LEAD, DROP_CANCEL, DROP_CONFIRM, DROP_WARNING_DATE, FREE_MORE_LINE, RESULT_DELETE, SAVE_REPLACE_BUTTON, SAVE_REPLACE_FREE,
} from "@/lib/saved-results";
import { DialogDownloads } from "@/components/app/stock-check/SavedResults";

export interface Drops {
  ruleId: string;
  drops: { id: string; run_date: string };
  limit: number;
}

/** The warning before a saved result is replaced or removed, with the downloads (paid plans) or the upgrade line (Free). `onConfirm` saves and removes the oldest; `onAfterDelete` saves after a different result was deleted. */
export function PlanLimitDialog({ d, onConfirm, onCancel, onAfterDelete }: { d: Drops; onConfirm: () => void; onCancel: () => void; onAfterDelete: () => void }) {
  const { getToken } = useAuth();
  const [runs, setRuns] = useState<RuleRun[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  async function choose() {
    try {
      const token = await getToken();
      if (!token) return;
      setRuns((await listRuleRuns(token, d.ruleId)).runs);
    } catch {
      setMsg("The saved results could not be loaded right now.");
    }
  }
  async function remove(id: string) {
    try {
      const token = await getToken();
      if (!token) return;
      await deleteRuleRun(token, d.ruleId, id);
      onAfterDelete();
    } catch {
      setMsg("That result could not be removed right now. Nothing was saved.");
    }
  }
  return (
    <div className="space-y-2 rounded-lg border border-accent bg-surface-raised p-3 text-sm" role="group" aria-label="Replace a saved result?" data-testid="run-drop-ask">
      {d.limit === 1 ? (
        <>
          <p data-testid="run-drop-text">{SAVE_REPLACE_FREE}</p>
          <p className="text-xs text-foreground-muted" data-testid="run-drop-plans">
            {FREE_UPGRADE_SAVE} {FREE_MORE_LINE}{" "}
            <Link href="/pricing" className="font-medium text-accent hover:underline" data-testid="upgrade-link">{SEE_PRICING}</Link>
          </p>
        </>
      ) : (
        <p data-testid="run-drop-text">{DROP_WARNING_DATE(d.limit, fmtDay(d.drops.run_date) ?? d.drops.run_date)}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <DialogDownloads ruleId={d.ruleId} runId={d.drops.id} />
        {d.limit > 1 && <button type="button" onClick={() => void choose()} className="min-h-[44px] rounded-lg border border-border px-3 text-sm font-medium hover:border-accent" data-testid="run-drop-other">{DELETE_OTHER}</button>}
        <button type="button" onClick={onConfirm} className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground" data-testid="run-drop-confirm">{d.limit === 1 ? SAVE_REPLACE_BUTTON : DROP_CONFIRM}</button>
        <button type="button" onClick={onCancel} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium" data-testid="run-drop-cancel">{DROP_CANCEL}</button>
      </div>
      {runs && (
        <div data-testid="run-drop-choose">
          <p className="text-xs text-foreground-muted">{DELETE_OTHER_LEAD}</p>
          <ul className="mt-1 space-y-1">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-1">
                <span>{fmtDay(r.run_date) ?? r.run_date} · {stocksText(r.count)}</span>
                <button type="button" onClick={() => void remove(r.id)} className="min-h-[44px] rounded-lg border border-border px-3 text-sm font-medium hover:border-accent" data-testid="run-drop-delete-one">{RESULT_DELETE}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {msg && <p className="text-xs text-foreground-muted" role="status">{msg}</p>}
    </div>
  );
}
