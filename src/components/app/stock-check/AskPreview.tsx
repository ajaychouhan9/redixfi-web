import Link from "next/link";

import samples from "@/data/ask-samples.json";
import { ASK_PREVIEW, formatStored } from "@/lib/ask-samples";

/**
 * Three stored Ask AI answers for one sample company, for visitors who are logged out (and Free users in the panel). Static: the answers were
 * made once with the Ask AI pipeline, checked line by line against the database and the filings, and saved in src/data/ask-samples.json.
 * No model call and no request happens when this renders. Nothing here can be sent as a question.
 */
export function AskPreview({ compact = false, only }: { compact?: boolean; only?: string }) {
  const list = only ? samples.answers.filter((a) => a.id === only) : samples.answers;
  const when = formatStored(samples.stored_on);
  return (
    <section aria-labelledby="ask-preview-title" className="space-y-3" data-testid="ask-preview">
      {!only && (
      <div>
        <h3 id="ask-preview-title" className={compact ? "text-sm font-semibold" : "text-base font-semibold"}>
          {ASK_PREVIEW.title}
        </h3>
        <p className="mt-1 text-xs text-foreground-muted" data-testid="ask-preview-sample">
          {ASK_PREVIEW.sampleLine(samples.name)}
        </p>
      </div>
      )}
      <ul className="space-y-3">
        {list.map((a) => (
          <li key={a.id} className="rounded-xl border border-border bg-surface p-3" data-testid={`ask-sample-${a.id}`}>
            <p className="text-sm font-semibold">{a.question}</p>
            {a.lead && <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{a.lead}</p>}
            {"bullets" in a && a.bullets && (
              <ul className="mt-2 space-y-2 text-sm leading-relaxed">
                {a.bullets.map((b) => (
                  <li key={b.label}>
                    <span className="font-medium">{b.label}.</span> <span className="text-foreground-muted">{b.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {"table" in a && a.table && a.id === "points" && (
              <ul className="mt-2 space-y-3" data-testid={`ask-sample-table-${a.id}`}>
                {a.table.rows.map((r) => (
                  <li key={r[0]} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                    <p className="font-medium">{r[0]}</p>
                    <p className="mt-1 leading-relaxed text-foreground-muted">{r[1]}</p>
                    <p className="mt-1 text-xs text-foreground-faint">{r[2]}</p>
                  </li>
                ))}
              </ul>
            )}
            {"table" in a && a.table && a.id !== "points" && (
              <div className="mt-2 overflow-x-auto" data-testid={`ask-sample-table-${a.id}`}>
                <table className="w-full min-w-[17rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-foreground-muted">
                      {a.table.columns.map((c, i) => (
                        <th key={`${c}-${i}`} className="px-2 py-1 font-medium">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {a.table.rows.map((r) => (
                      <tr key={r[0]} className="border-b border-border/60 align-top">
                        {r.map((cell, i) => (
                          <td key={i} className={`px-2 py-1.5 ${i === 0 ? "font-medium" : "text-foreground-muted"} ${a.id === "numbers" && i > 0 ? "text-right tabular-nums" : ""}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {a.id === "numbers" && (
                  <button type="button" disabled className="mt-2 min-h-[44px] cursor-not-allowed rounded-lg border border-border px-3 text-sm text-foreground-faint" data-testid="ask-sample-csv">
                    {ASK_PREVIEW.csvLocked}
                  </button>
                )}
              </div>
            )}
            {"notes" in a && a.notes && (
              <ul className="mt-2 space-y-1 text-xs text-foreground-muted">
                {a.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
            <div className="mt-2 text-xs text-foreground-muted" data-testid="ask-sample-source">
              <p>
                Stored {when}. Source:{" "}
                {a.sources.map((s, i) => (
                  <span key={s.label + s.date}>
                    {i > 0 && "; "}
                    {"url" in s && s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.label}</a>
                    ) : (
                      s.label
                    )}{" "}
                    ({s.date})
                  </span>
                ))}
                .
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs font-medium text-foreground-muted" data-testid="ask-preview-note">{ASK_PREVIEW.note}</p>
      <p className="text-sm">
        <Link href="/login" className="font-medium text-accent hover:underline" data-testid="ask-preview-login">
          {ASK_PREVIEW.login}
        </Link>
      </p>
    </section>
  );
}
