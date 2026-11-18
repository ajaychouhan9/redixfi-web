import type { Metadata } from "next";
import Link from "next/link";

import { LoggedOutPreview } from "@/components/app/stock-check/LoggedOutPreview";
import { ShortlistLadder } from "@/components/app/stock-check/ShortlistLadder";
import { ReadCompany } from "@/components/app/start/ReadCompany";
import { PART2_INTRO, PART2_TITLE, READ_INTRO } from "@/lib/read-company";
import { PAGE_SUBTITLE, PAGE_TITLE, SEO_TITLE } from "@/lib/stock-check";

// The page makes no request of its own; a refresh window keeps the cached copy from outliving a deploy (a fully static page is sent with a one-year cache lifetime).
export const revalidate = 3600;

const DESCRIPTION =
  "Five steps, about 15 minutes, using the tabs on any stock page: points to watch, growth, insiders and big holders, what management said, and what price and delivery did. Then build a shortlist with your own rules. Facts from filings and the exchange. Not advice.";

export const metadata: Metadata = {
  title: SEO_TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/stock-check" },
  openGraph: { title: SEO_TITLE, description: DESCRIPTION, type: "website", url: "https://www.redixfi.com/stock-check" },
};

// What this site does and does not do, in plain words. No company is named here, on purpose.
const NOT_DO = "RedixFi shows measured data with its dates and sources. It gives no buy or sell advice, no price forecasts and no ratings. What you do with the facts is your decision, or one to take with a registered adviser.";

/** Static, cacheable page (no server fetch): the chips are links, the figures file and the shortlist load in the browser, and only when asked. */
export default function StockCheckPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold" data-testid="stock-check-title">{PAGE_TITLE}</h1>
      <p className="mt-1 text-base text-foreground-muted" data-testid="stock-check-subtitle">{PAGE_SUBTITLE}</p>
      <p className="mt-3 text-sm leading-relaxed text-foreground-muted" data-testid="read-intro">
        {READ_INTRO}
      </p>

      <div className="mt-5">
        <ReadCompany />
      </div>

      <div className="mt-6">
        <LoggedOutPreview />
      </div>

      <h2 className="mt-10 text-xl font-semibold" data-testid="read-part2">
        {PART2_TITLE}
      </h2>
      <p className="mt-1 text-sm text-foreground-muted">{PART2_INTRO}</p>
      <div className="mt-4">
        <ShortlistLadder />
      </div>

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
