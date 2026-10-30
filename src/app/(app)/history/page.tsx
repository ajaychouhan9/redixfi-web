import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import { HistoryExplorer } from "@/components/app/history/HistoryExplorer";
import { HISTORY_DISCLAIMER, HISTORY_INTRO, HISTORY_SEO_DESCRIPTION, HISTORY_SEO_TITLE, HISTORY_TITLE } from "@/lib/history-copy";

const SITE_URL = "https://www.redixfi.com";
const OG_IMAGE = `/api/og?${new URLSearchParams({
  type: "history",
  title: HISTORY_TITLE,
  subtitle: "Past days with a chosen move, with the readings around them",
}).toString()}`;

/** The plain page is indexed; any filtered address (a query string) is not. */
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Object.keys(sp ?? {}).length > 0;
  return {
    title: HISTORY_SEO_TITLE,
    description: HISTORY_SEO_DESCRIPTION,
    alternates: { canonical: "/history" },
    robots: filtered ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: `${HISTORY_TITLE} | RedixFi`,
      description: HISTORY_SEO_DESCRIPTION,
      type: "website",
      url: `${SITE_URL}/history`,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "RedixFi History Explorer" }],
    },
    twitter: { card: "summary_large_image", title: `${HISTORY_TITLE} | RedixFi`, description: HISTORY_SEO_DESCRIPTION, images: [OG_IMAGE] },
  };
}

export default function HistoryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/history`,
        url: `${SITE_URL}/history`,
        name: HISTORY_TITLE,
        description: HISTORY_SEO_DESCRIPTION,
        isPartOf: { "@type": "WebSite", name: "RedixFi", url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: HISTORY_TITLE, item: `${SITE_URL}/history` },
        ],
      },
    ],
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div>
        <h1 className="text-lg font-semibold">{HISTORY_TITLE}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{HISTORY_INTRO}</p>
        <p className="mt-1 text-xs font-medium text-foreground-muted">{HISTORY_DISCLAIMER}</p>
      </div>
      <Suspense fallback={<p className="text-sm text-foreground-muted">Loading…</p>}>
        <HistoryExplorer />
      </Suspense>
      <p className="text-xs text-foreground-faint">
        Readings use the same measured states as the{" "}
        <Link href="/signals" className="text-accent">
          Signals pages
        </Link>
        . See{" "}
        <Link href="/how-it-works" className="text-accent">
          how the reading works
        </Link>
        .
      </p>
    </div>
  );
}
