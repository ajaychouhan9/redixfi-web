import type { Metadata } from "next";
import Link from "next/link";

import { ReadCompany } from "@/components/app/start/ReadCompany";
import { StartHere } from "@/components/app/start/StartHere";
import { PART2_INTRO, PART2_TITLE, READ_INTRO } from "@/lib/read-company";

// The page makes no request of its own; a refresh window keeps the cached copy from outliving a deploy (a fully static page is sent with a one-year cache lifetime).
export const revalidate = 3600;

const TITLE = "Read a company in 15 minutes: five steps on any NSE stock page";
const DESCRIPTION =
  "Five steps, about 15 minutes, using the tabs on any stock page: points to watch, growth, insiders and big holders, what management said, and what price and delivery did. Facts from filings and the exchange. Not advice.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/start" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: "https://www.redixfi.com/start" },
};

// What this site does and does not do, in plain words. No company is named here, on purpose.
const NOT_DO = "RedixFi shows measured data with its dates and sources. It gives no buy or sell advice, no price forecasts and no ratings. What you do with the facts is your decision, or one to take with a registered adviser.";

/** Static, cacheable page (no server fetch): the chips are links, and the filter in Part 2 runs only when its button is tapped. */
export default function ReadCompanyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Read a company in 15 minutes</h1>
      <p className="mt-2 text-sm leading-relaxed text-foreground-muted" data-testid="read-intro">
        {READ_INTRO}
      </p>

      <div className="mt-5">
        <ReadCompany />
      </div>

      <h2 className="mt-10 text-xl font-semibold" data-testid="read-part2">
        {PART2_TITLE}
      </h2>
      <p className="mt-1 text-sm text-foreground-muted">{PART2_INTRO}</p>
      <div className="mt-4">
        <StartHere />
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
