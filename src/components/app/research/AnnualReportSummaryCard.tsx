import type { AnnualReportSummary } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { AiLabel } from "@/components/ui/AiLabel";
import { formatDateIst } from "@/lib/format";

/**
 * One fixed, cached AI summary per annual report (annual_report_summarizer.py,
 * mirrors concall_summarizer.py's architecture). Sibling of ConcallSummary's
 * card — same visual language, same "no B8 masking" visibility (free and
 * paid tiers see this identically, per the locked mockup and the same
 * rationale already established for concalls: /research/{symbol}'s whole
 * payload is identical for every tier).
 *
 * "Key takeaway" callout box reuses the exact gold-accent tokens
 * (`border-accent`/`bg-accent`) ResearchDetail.tsx's concalls block already
 * established for `tone_note` — same visual pattern, different field.
 *
 * The compliance disclaimer line renders `data.compliance_note` verbatim —
 * that string IS the backend's real `ANNUAL_REPORT_COMPLIANCE_NOTE`
 * constant (core/document_retrieval.py), passed through unmodified so this
 * card can never drift from the wording already established for the RAG
 * prompt path.
 */
export function AnnualReportSummaryCard({ data }: { data: AnnualReportSummary }) {
  return (
    <Card title="AI Summary of Annual Report" titleClassName="text-base" action={<AiLabel />}>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="rounded-full bg-neutral-bg px-2 py-0.5 font-semibold uppercase tracking-wide text-foreground-muted">
          {data.fiscal_year}
        </span>
        <span className="text-foreground-faint">{data.page_count} pages</span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-foreground">{data.summary}</p>

      {data.bullets.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
          {data.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-l-2 border-accent bg-accent/10 px-3 py-2">
        <p className="text-sm font-medium leading-relaxed text-foreground">
          <span className="text-accent">Key takeaway: </span>
          {data.key_takeaway}
        </p>
      </div>

      <p className="mt-2 text-xs text-foreground-faint">{data.compliance_note}</p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        <span className="text-xs text-foreground-faint">
          Filed with NSE · {formatDateIst(data.filing_date)}
        </span>
        <a
          href={data.source_pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-[13px] font-medium text-foreground-muted hover:text-foreground"
        >
          View source filing →
        </a>
      </div>
    </Card>
  );
}
