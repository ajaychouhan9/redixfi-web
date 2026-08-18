import Link from "next/link";

export function FooterDisclaimer() {
  return (
    <footer className="border-t border-border bg-surface px-4 py-2 text-center text-[12px] text-foreground-faint">
      RedixFi provides measured market data and analytics only — not investment advice, recommendations, or
      predictions. We are not yet SEBI-registered as a Research Analyst.{" "}
      <Link href="/more/disclaimer" className="underline">
        Full disclaimer
      </Link>
    </footer>
  );
}
