import type { ReactNode } from "react";

/** A small data table that scrolls inside its own box, so the page never scrolls sideways at 375px. */
export function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[320px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
          <tr>{head.map((h, i) => <th key={h} className={`px-3 py-2 ${i > 0 ? "text-right" : ""}`}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) => <td key={j} className={`px-3 py-1.5 tabular-nums ${j > 0 ? "text-right" : ""}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-7">
      <h2 id={id} className="text-base font-semibold">{title}</h2>
      {note && <p className="mb-2 mt-0.5 text-xs text-foreground-muted">{note}</p>}
      <div className={note ? "" : "mt-2"}>{children}</div>
    </section>
  );
}
