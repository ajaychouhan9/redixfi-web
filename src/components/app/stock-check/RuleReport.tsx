"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { deleteRuleAnswer, downloadRuleExport, listRuleAnswers, type MyScreen, type RuleAnswer } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPaidEntitled } from "@/lib/entitlements";
import {
  ANSWERS_EMPTY, ANSWERS_NOTE, ANSWERS_TITLE, ANSWER_AS_OF, EXPORT_CSV, EXPORT_FAILED, EXPORT_FREE_NOTE, EXPORT_LEAD, EXPORT_PDF, REMOVE_ANSWER, SAMPLE_PDF_PATH, SAMPLE_REPORT,
  answerSources, saveErrorText,
} from "@/lib/rule-answers";

const btn = "min-h-[44px] rounded-lg border border-border px-3 text-sm font-medium hover:border-accent disabled:opacity-60";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const cell = (v: unknown): string => (v === null || v === undefined || v === "" ? "No figure" : typeof v === "number" ? v.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : String(v));

function AnswerItem({ a, onRemove }: { a: RuleAnswer; onRemove: (id: string) => void }) {
  const src = answerSources(a);
  return (
    <li className="rounded-lg border border-border bg-surface-raised p-3 text-sm" data-testid="rule-answer">
      <p className="font-medium break-words">{a.symbol ? `${a.symbol} · ` : ""}{a.question}</p>
      <p className="text-xs text-foreground-muted" data-testid="rule-answer-date">{ANSWER_AS_OF(a.answered_at)}</p>
      <p className="mt-1 whitespace-pre-line break-words text-foreground-muted">{a.answer}</p>
      {a.table && a.table.rows.length > 0 && (
        <div className="mt-2 max-w-full overflow-x-auto rounded-lg border border-border">
          <table className="w-max min-w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-foreground-faint">{a.table.columns.map((c) => <th key={c.key} className="whitespace-nowrap px-2 py-1">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {a.table.rows.slice(0, 15).map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">{a.table!.columns.map((c) => <td key={c.key} className="whitespace-nowrap px-2 py-1">{cell(r[c.key])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {src && <p className="mt-1 text-xs text-foreground-faint" data-testid="rule-answer-sources">Sources: {src}</p>}
      <button type="button" onClick={() => onRemove(a.id)} className={`${btn} mt-2 text-foreground-muted`} data-testid="rule-answer-remove">{REMOVE_ANSWER}</button>
    </li>
  );
}

/** Under one saved rule: its saved Ask AI answers, and the PDF / CSV export (paid plans) or the stored sample report (Free). */
export function RuleReport({ rule, onChanged }: { rule: MyScreen; onChanged: () => void }) {
  const { user, getToken } = useAuth();
  const paid = isPaidEntitled(user);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<RuleAnswer[] | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [busy, setBusy] = useState<"pdf" | "csv" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && answers === null) {
      try {
        const token = await getToken();
        if (!token) return;
        const r = await listRuleAnswers(token, rule.id);
        setAnswers(r.answers);
        setLimit(r.limit);
      } catch {
        setMsg(saveErrorText(undefined));
      }
    }
  }
  async function remove(id: string) {
    try {
      const token = await getToken();
      if (!token) return;
      await deleteRuleAnswer(token, rule.id, id);
      setAnswers((l) => (l ? l.filter((x) => x.id !== id) : l));
      onChanged();
    } catch {
      setMsg("That answer could not be removed right now.");
    }
  }
  async function download(kind: "pdf" | "csv") {
    setBusy(kind);
    setMsg(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("login");
      const { blob, filename } = await downloadRuleExport(rule.id, kind, token);
      saveBlob(blob, filename ?? `redixfi-rule.${kind}`);
    } catch (e) {
      const d = e instanceof ApiError ? (e.detail as { message?: string } | undefined) : undefined;
      setMsg(d?.message ?? EXPORT_FAILED);
    } finally {
      setBusy(null);
    }
  }

  const n = answers ? answers.length : rule.answers ?? 0;
  return (
    <div className="mt-2 space-y-2 border-t border-border pt-2" data-testid="rule-report">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void toggle()} aria-expanded={open} className={`${btn} inline-flex items-center gap-2`} data-testid="rule-answers-toggle">
          {ANSWERS_TITLE(n)}
          <ChevronDown size={14} className={open ? "rotate-180" : ""} aria-hidden />
        </button>
        {paid ? (
          <>
            <button type="button" onClick={() => void download("pdf")} disabled={busy !== null} className={btn} data-testid="rule-export-pdf">{busy === "pdf" ? "Preparing…" : EXPORT_PDF}</button>
            <button type="button" onClick={() => void download("csv")} disabled={busy !== null} className={btn} data-testid="rule-export-csv">{busy === "csv" ? "Preparing…" : EXPORT_CSV}</button>
          </>
        ) : (
          <a href={SAMPLE_PDF_PATH} target="_blank" rel="noopener noreferrer" className={`${btn} inline-flex items-center`} data-testid="rule-sample-report">{SAMPLE_REPORT}</a>
        )}
      </div>
      <p className="text-xs text-foreground-muted" data-testid="rule-export-note">{paid ? EXPORT_LEAD : EXPORT_FREE_NOTE}</p>
      {msg && <p className="text-xs text-foreground-muted" role="status" data-testid="rule-report-msg">{msg}</p>}
      {open && (
        <div className="space-y-2" data-testid="rule-answers">
          {answers === null && !msg && <p className="text-xs text-foreground-muted">Loading…</p>}
          {answers && answers.length === 0 && <p className="text-sm text-foreground-muted" data-testid="rule-answers-empty">{ANSWERS_EMPTY}</p>}
          {answers && answers.length > 0 && (
            <ul className="space-y-2">
              {answers.map((a) => (
                <AnswerItem key={a.id} a={a} onRemove={(id) => void remove(id)} />
              ))}
            </ul>
          )}
          {limit !== null && <p className="text-xs text-foreground-faint">{ANSWERS_NOTE(limit)}</p>}
        </div>
      )}
    </div>
  );
}
