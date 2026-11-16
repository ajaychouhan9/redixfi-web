import { buildChecklist, type ChecklistInput } from "@/lib/simple-view";

/**
 * The Simple view's checklist (17 Nov 2026): seven plain questions answered from the data the stock page already loaded. Rendered on
 * the server into the cached HTML. No colour passes judgement on a figure; a missing figure says "Data not available yet".
 */
export function SimpleChecklist({ data, today, priceLabel }: { data: ChecklistInput; today: string; priceLabel: string }) {
  const lines = buildChecklist(data, { today, priceLabel });
  return (
    <section className="mt-5" aria-labelledby="simple-checklist" data-testid="simple-checklist">
      <h2 id="simple-checklist" className="text-base font-semibold">Seven questions, answered from the reported data</h2>
      <p className="mt-0.5 text-xs text-foreground-muted">
        Facts from the company&apos;s own filings and the exchange, with their dates. Not a rating and not advice: a rise and a fall are shown the same way.
      </p>
      <ol className="mt-3 space-y-3">
        {lines.map((l, i) => (
          <li key={l.key} className="rounded-lg border border-border bg-surface px-4 py-3" data-testid={`simple-line-${l.key}`}>
            <p className="text-sm font-semibold">
              {i + 1}. {l.question}
            </p>
            <p className="mt-1 text-sm text-foreground">{l.answer ?? "Data not available yet."}</p>
            {l.sources && l.sources.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {l.sources.map((s) => (
                  <li key={s.href + s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-foreground-muted">
              <span className="font-medium">Why this matters:</span> {l.why}
            </p>
            <p className="mt-1 text-xs">
              <a href={`#${l.detailsId}`} className="font-medium text-accent hover:underline">
                See details
              </a>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
