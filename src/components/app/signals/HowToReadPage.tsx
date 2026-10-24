import { Collapsible } from "@/components/ui/Collapsible";

/** Three short lines on how to read the stock page. Collapsed by default. */
export function HowToReadPage() {
  return (
    <Collapsible question="How to read this page">
      <ul className="space-y-1.5 text-[13px] leading-snug text-foreground-muted">
        <li>The score is a summary of measured signals.</li>
        <li>Volatility shows how much the price moved, not where it will go.</li>
        <li>This page does not give predictions or advice.</li>
      </ul>
    </Collapsible>
  );
}
