import type { Metadata } from "next";
import { ResearchSearch } from "@/components/app/research/ResearchSearch";

export const metadata: Metadata = {
  title: "Research Pro",
  description: "Search RedixFi's stock research by company or symbol to inspect prices, delivery, fundamentals and filings.",
  alternates: { canonical: "/research" },
};

export default function ResearchSearchPage() {
  return <ResearchSearch />;
}
