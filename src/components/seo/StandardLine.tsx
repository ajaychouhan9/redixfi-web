import { STANDARD_LINE } from "@/lib/compliance/standard-line";

/** The standard registration / not-advice line, on the page body of every public data page (the footer carries it too). */
export function StandardLineNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-foreground-muted ${className}`} data-testid="standard-line">
      {STANDARD_LINE}
    </p>
  );
}
