import type { Metadata } from "next";
import Link from "next/link";
import { ResearchSearch } from "@/components/app/research/ResearchSearch";

export const metadata: Metadata = {
  title: "Research Pro",
  description: "Search RedixFi's stock research by company or symbol to inspect prices, delivery, fundamentals and filings.",
  alternates: { canonical: "/research" },
};

export default function ResearchSearchPage() {
  return (
    <div className="space-y-4">
      <ResearchSearch />
      <p className="text-center text-sm text-foreground-muted" data-testid="research-sample-report">
        Each stock page can be saved as a company report PDF.{" "}
        <Link href="/sample-report" className="font-medium text-accent hover:underline">
          See the free sample report
        </Link>
        .
      </p>
    </div>
  );
}
