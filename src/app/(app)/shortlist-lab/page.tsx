import type { Metadata } from "next";
import Link from "next/link";

import { LabTabs } from "@/components/app/stock-check/LabTabs";
import { PAGE_SUBTITLE, PAGE_TITLE, SEO_TITLE } from "@/lib/stock-check";

// The page makes no request of its own; a refresh window keeps the cached copy from outliving a deploy (a fully static page is sent with a one-year cache lifetime).
export const revalidate = 3600;

const DESCRIPTION =
  "Learn six steps and five questions, then set your own rules and read the result. Facts from filings and the exchange. Not advice.";

export const metadata: Metadata = {
  title: SEO_TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/shortlist-lab" },
  openGraph: { title: SEO_TITLE, description: DESCRIPTION, type: "website", url: "https://www.redixfi.com/shortlist-lab" },
};

// What this site does and does not do, in plain words. No company is named here, on purpose.
const NOT_DO = "RedixFi shows measured data with its dates and sources. It gives no buy or sell advice, no price forecasts and no ratings. What you do with the facts is your decision, or one to take with a registered adviser.";

/** Static, cacheable page (no server fetch): the chips are links, the figures file and the shortlist load in the browser, and only when asked. */
export default function StockCheckPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold" data-testid="stock-check-title">{PAGE_TITLE}</h1>
      <p className="mt-1 text-base text-foreground-muted" data-testid="stock-check-subtitle">{PAGE_SUBTITLE}</p>
      <div className="mt-5"><LabTabs /></div>

      <section className="mt-8 rounded-xl border border-border bg-surface px-4 py-3" aria-labelledby="start-not-do" data-testid="start-guide-card">
        <h2 id="start-not-do" className="text-sm font-semibold">What this site does not do</h2>
        <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{NOT_DO}</p>
      </section>

      <p className="mt-6 text-sm">
        Know markets already?{" "}
        <Link href="/signals" className="font-medium text-accent hover:underline">
          Open the full Screener
        </Link>
        .
      </p>
    </div>
  );
}
