import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import { HistoryTabs } from "@/components/app/history/HistoryTabs";
import { HISTORY_TAGLINE, HISTORY_INTRO, HISTORY_SEO_DESCRIPTION, HISTORY_SEO_TITLE, HISTORY_TITLE } from "@/lib/history-copy";

const SITE_URL = "https://www.redixfi.com";
const OG_IMAGE = `/api/og?${new URLSearchParams({
  type: "rewind",
  title: HISTORY_TITLE,
  subtitle: "See what happened before and after big moves",
}).toString()}`;

/** The plain page is indexed; any filtered address (a query string) is not. */
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Object.keys(sp ?? {}).length > 0;
  return {
    title: HISTORY_SEO_TITLE,
    description: HISTORY_SEO_DESCRIPTION,
    alternates: { canonical: "/rewind" },
    robots: filtered ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: HISTORY_SEO_TITLE,
      description: HISTORY_SEO_DESCRIPTION,
      type: "website",
      url: `${SITE_URL}/rewind`,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Market Rewind - see what happened before and after big stock moves" }],
    },
    twitter: { card: "summary_large_image", title: HISTORY_SEO_TITLE, description: HISTORY_SEO_DESCRIPTION, images: [OG_IMAGE] },
  };
}

export default function HistoryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/rewind`,
        url: `${SITE_URL}/rewind`,
        name: HISTORY_TITLE,
        description: HISTORY_SEO_DESCRIPTION,
        isPartOf: { "@type": "WebSite", name: "RedixFi", url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: HISTORY_TITLE, item: `${SITE_URL}/rewind` },
        ],
      },
    ],
  };
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div>
        <h1 className="text-lg font-semibold">{HISTORY_TITLE}</h1>
        <p className="mt-1 text-sm font-medium">{HISTORY_TAGLINE}</p>
        <p className="mt-1 text-sm text-foreground-muted">{HISTORY_INTRO}</p>
      </div>
      <Suspense fallback={<p className="text-sm text-foreground-muted">Loading…</p>}>
        <HistoryTabs />
      </Suspense>
      <section className="space-y-2 text-sm text-foreground-muted" aria-labelledby="rewind-about">
        <h2 id="rewind-about" className="text-sm font-semibold text-foreground">
          About Market Rewind, Chance Check and Stock Condition
        </h2>
        <p>
          <span className="font-medium text-foreground">Market Rewind</span> lists the past days on which an Indian stock moved by a size you choose, and shows the measured readings
          the day before, on the day and the day after. It reports counts of past days only.
        </p>
        <p>
          <span className="font-medium text-foreground">Chance Check</span> is a base-rate comparison. It takes the days found, counts how often each reading was present in the
          sessions before the move, and compares that with how often the same reading was present on all days of the same stock and period. A reading is marked &ldquo;Stood out&rdquo; only
          when the difference is large and larger than chance alone would explain. It is not a forecast or a recommendation.
        </p>
        <p>
          <span className="font-medium text-foreground">Stock Condition</span> is the 0 to 100 weighted combination of 8 measured readings shown on each stock page. It describes
          current measured conditions; it is not a rating or a forecast.
        </p>
      </section>
      <p className="text-xs text-foreground-muted">
        Readings use the same measured states as the{" "}
        <Link href="/signals" className="text-foreground underline">
          Signals pages
        </Link>
        . See{" "}
        <Link href="/how-it-works" className="text-foreground underline">
          how Stock Condition works
        </Link>
        .
      </p>
    </div>
  );
}
