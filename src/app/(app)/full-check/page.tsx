import type { Metadata } from "next";

import { FullCheckPanel } from "@/components/app/fullcheck/FullCheckPanel";
import { FULL_CHECK_TITLE } from "@/lib/fullcheck-copy";

export const metadata: Metadata = {
  title: FULL_CHECK_TITLE,
  alternates: { canonical: "/full-check" },
  // A personal page: it shows the reader's own shortlist and runs, so it is kept out of search results.
  robots: { index: false, follow: true },
  description: "Read the points to watch, what management said, three years of numbers and holdings for the companies on your shortlist, with sources and dates.",
};

export default function FullCheckPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <FullCheckPanel />
    </div>
  );
}
