import Link from "next/link";

export interface QuickBlock {
  id: string;
  title: string;
  /** Plain lines; the first three show, the rest sit behind "Read more". */
  lines: string[];
  /** Small grey line under the heading (a date or a source). */
  note?: string | null;
  /** The tab that holds the full text. */
  tab: string;
  tabLabel: string;
}

/** Up to 3 bullets; the rest sit behind "Read more" in the same block (a plain <details>, no script). */
export function BulletList({ lines, className = "mt-3" }: { lines: string[]; className?: string }) {
  if (lines.length === 0) return null;
  return (
    <div className={className}>
      <ul className="list-disc space-y-2 pl-5 text-[15px] leading-6">
        {lines.slice(0, 3).map((l, i) => <li key={i}>{l}</li>)}
      </ul>
      {lines.length > 3 && (
        <details className="mt-1">
          <summary className="flex min-h-[44px] cursor-pointer items-center text-[13px] font-medium text-accent">Read more</summary>
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-6">
            {lines.slice(3).map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

/** The short RedixFi blocks of the stock page: up to 3 lines each, the rest behind "Read more" (a plain <details>, no script). A block with no lines is left out. */
export function QuickReads({ blocks }: { blocks: QuickBlock[] }) {
  const have = blocks.filter((b) => b.lines.length > 0);
  if (have.length === 0) return null;
  return (
    <>
      {have.map((b) => (
        <section key={b.id} aria-labelledby={`qr-${b.id}`} className="mt-7 border-t border-border pt-6" data-testid={`quick-${b.id}`}>
          <h2 id={`qr-${b.id}`} className="text-lg font-bold">{b.title}</h2>
          {b.note && <p className="mt-1 text-xs text-foreground-muted">{b.note}</p>}
          <BulletList lines={b.lines} />
          <Link href={`#${b.tab}`} className="inline-flex min-h-[44px] items-center text-[13px] font-medium text-accent hover:underline">{b.tabLabel}</Link>
        </section>
      ))}
    </>
  );
}
