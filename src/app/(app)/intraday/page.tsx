import type { Metadata } from "next";

import { IntradayTabs } from "@/components/app/intraday/tabs/IntradayTabs";
import { getIntradayTab } from "@/lib/api/endpoints";
import { retryTransientPublicGet } from "@/lib/api/retry-public-upstream";
import type { IntradayTabData, IntradayTabId } from "@/lib/api/types";
import {
  INTRADAY_H1,
  INTRADAY_PATH,
  INTRADAY_SEO_DESCRIPTION,
  INTRADAY_SEO_TITLE,
  INTRADAY_TITLE,
  TAB_ORDER,
} from "@/lib/intraday-copy";

const SITE_URL = "https://www.redixfi.com";

type SP = Promise<Record<string, string | string[] | undefined>>;

function tabOf(sp: Record<string, string | string[] | undefined>): IntradayTabId | undefined {
  const v = sp.tab;
  return typeof v === "string" && (TAB_ORDER as string[]).includes(v) ? (v as IntradayTabId) : undefined;
}

/** The plain /intraday page is indexed. A tab chosen with ?tab= points back to it and is not indexed (no duplicate content between tabs). */
export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const withQuery = Object.keys((await searchParams) ?? {}).length > 0;
  return {
    title: { absolute: INTRADAY_SEO_TITLE },
    description: INTRADAY_SEO_DESCRIPTION,
    alternates: { canonical: INTRADAY_PATH },
    robots: withQuery ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title: INTRADAY_SEO_TITLE, description: INTRADAY_SEO_DESCRIPTION, type: "website", url: `${SITE_URL}${INTRADAY_PATH}` },
    twitter: { card: "summary", title: INTRADAY_SEO_TITLE, description: INTRADAY_SEO_DESCRIPTION },
  };
}

// The tab shown first depends on the Indian clock (before 9:15 Morning, 9:15 to 15:30 Scan, after 15:30 Recap; a weekend or holiday shows the last
// session), so the page is built per request. The API keeps the stored lists in memory for a minute while the market is open.
export default async function IntradayPage({ searchParams }: { searchParams: SP }) {
  const requested = tabOf((await searchParams) ?? {});

  const load = async (t: IntradayTabId): Promise<IntradayTabData | null> => {
    try {
      // @auth-ok: first paint is anonymous (Stock Condition hidden); a signed-in visitor's browser asks again with the token (IntradayTabs).
      const env = await retryTransientPublicGet(
        () => getIntradayTab(t, { revalidate: 30 }),
        () => getIntradayTab(t, { revalidate: 30, timeoutMs: 10_000 }),
      );
      return env.data;
    } catch {
      return null;
    }
  };
  // The first request also tells us the time-of-day default; a different requested tab costs one more request.
  const probe: IntradayTabId = requested ?? "scan";
  const first = await load(probe);
  const defaultTab: IntradayTabId = first?.session.default_tab ?? "scan";
  const tab = requested ?? defaultTab;
  const data = tab === probe ? first : await load(tab);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}${INTRADAY_PATH}`,
        url: `${SITE_URL}${INTRADAY_PATH}`,
        name: INTRADAY_TITLE,
        description: INTRADAY_SEO_DESCRIPTION,
        isPartOf: { "@type": "WebSite", name: "RedixFi", url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: INTRADAY_TITLE, item: `${SITE_URL}${INTRADAY_PATH}` },
        ],
      },
    ],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1 className="mb-4 text-xl font-semibold">{INTRADAY_H1}</h1>
      <IntradayTabs key={tab} tab={tab} defaultTab={defaultTab} initial={data} />
    </div>
  );
}
