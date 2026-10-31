import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api/client";
import { getSevenDayReview } from "@/lib/api/endpoints";
import { retryTransientPublicGet } from "@/lib/api/retry-public-upstream";
import type { SevenDayReview } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { EventsBlock } from "@/components/app/review/EventsBlock";
import { MarketBlock } from "@/components/app/review/MarketBlock";
import { MineProvider } from "@/components/app/review/MineProvider";
import { ReviewLists } from "@/components/app/review/ReviewLists";
import { ReviewTabs } from "@/components/app/review/ReviewTabs";
import { ScChanges } from "@/components/app/review/ScChanges";
import { WeekPicker } from "@/components/app/review/WeekPicker";
import { YourStocks } from "@/components/app/review/YourStocks";
import {
  REVIEW_INTRO,
  REVIEW_PATH,
  REVIEW_SEO_DESCRIPTION,
  REVIEW_SEO_TITLE,
  REVIEW_TAGLINE,
  REVIEW_TITLE,
  REVIEW_UNAVAILABLE,
} from "@/lib/review-copy";

const SITE_URL = "https://www.redixfi.com";
const OG_IMAGE = `/api/og?${new URLSearchParams({ type: "review", title: REVIEW_TITLE, subtitle: "Biggest gains and falls of the week" }).toString()}`;

// The review is rebuilt once a night and the API caches it for minutes: five minutes here keeps a crawler or a burst of visitors from
// reaching the API on every request, and a short API outage is served from the last good copy.
export const revalidate = 300;

type SP = Promise<Record<string, string | string[] | undefined>>;

function asofOf(sp: Record<string, string | string[] | undefined>): string | undefined {
  const v = sp.asof;
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

/** The plain page is indexed; an earlier week (a query string) points back to it and is not indexed. */
export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const earlier = Object.keys((await searchParams) ?? {}).length > 0;
  return {
    title: { absolute: REVIEW_SEO_TITLE },
    description: REVIEW_SEO_DESCRIPTION,
    alternates: { canonical: REVIEW_PATH },
    robots: earlier ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: REVIEW_SEO_TITLE,
      description: REVIEW_SEO_DESCRIPTION,
      type: "website",
      url: `${SITE_URL}${REVIEW_PATH}`,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "7-Day Review - biggest gains and falls of the week" }],
    },
    twitter: { card: "summary_large_image", title: REVIEW_SEO_TITLE, description: REVIEW_SEO_DESCRIPTION, images: [OG_IMAGE] },
  };
}

async function load(asof: string | undefined): Promise<SevenDayReview | null> {
  try {
    const env = await retryTransientPublicGet(
      () => getSevenDayReview(asof, { revalidate: 300 }),
      () => getSevenDayReview(asof, { revalidate: 300, timeoutMs: 10_000 }),
    );
    return env.data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return null;
  }
}

function Footnotes({ r }: { r: SevenDayReview }) {
  const w = r.window!;
  const t = r.thresholds!;
  const x = r.excluded!;
  return (
    <section aria-labelledby="review-notes" className="space-y-1.5 text-xs text-foreground-muted" data-testid="review-notes">
      <h2 id="review-notes" className="text-sm font-semibold text-foreground">
        How this page is measured
      </h2>
      <p>
        {w.label}. {w.as_of_label}. Each price change compares the last close of the window with the close of the last session before it ({w.before}).
        {w.holidays.length > 0 ? ` Market holiday in this window: ${w.holidays.map((d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })).join(", ")}.` : ""}
      </p>
      <p data-testid="review-excluded">
        {x.corporate_action > 0
          ? `${x.corporate_action} liquid ${x.corporate_action === 1 ? "stock was" : "stocks were"} left out of every list because a split, bonus, demerger or similar corporate action happened inside the window, which makes its prices not comparable.`
          : "No liquid stock was left out for a split, bonus, demerger or similar corporate action in this window."}
      </p>
      <p>
        All liquid means EQ series only (no BE, BZ or SME stocks), an average daily traded value of at least ₹{t.min_avg_turnover_cr} crore over the last {t.sessions} sessions and a price of at
        least ₹{t.min_price}. {r.universe!.liquid.n.toLocaleString("en-IN")} stocks pass. Nifty 50, Nifty 100 and Nifty 500 use the current index lists.
      </p>
      {w.notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
      <p>
        The lists rank by the price change over the window only. See{" "}
        <Link href="/how-it-works" className="font-medium text-foreground underline decoration-accent underline-offset-2 hover:decoration-2">
          how Stock Condition works
        </Link>{" "}
        and{" "}
        <Link href="/rewind" className="font-medium text-foreground underline decoration-accent underline-offset-2 hover:decoration-2">
          Market Rewind
        </Link>
        .
      </p>
    </section>
  );
}

export default async function SevenDayReviewPage({ searchParams }: { searchParams: SP }) {
  const asof = asofOf((await searchParams) ?? {});
  const review = await load(asof);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}${REVIEW_PATH}`,
        url: `${SITE_URL}${REVIEW_PATH}`,
        name: REVIEW_TITLE,
        description: REVIEW_SEO_DESCRIPTION,
        isPartOf: { "@type": "WebSite", name: "RedixFi", url: SITE_URL },
        ...(review?.built_at ? { dateModified: review.built_at } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Signals", item: `${SITE_URL}/signals` },
          { "@type": "ListItem", position: 3, name: REVIEW_TITLE, item: `${SITE_URL}${REVIEW_PATH}` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div>
        <ReviewTabs active="review" />
        <nav aria-label="Breadcrumb" className="mb-2 text-xs text-foreground-muted">
          <ol className="flex flex-wrap gap-1.5">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/signals" className="hover:text-foreground">
                Signals
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">{REVIEW_TITLE}</li>
          </ol>
        </nav>
        <h1 className="text-lg font-semibold">{REVIEW_TITLE}</h1>
        <p className="mt-1 text-sm font-medium">{REVIEW_TAGLINE}</p>
        <p className="mt-1 text-sm text-foreground-muted">{REVIEW_INTRO}</p>
      </div>

      {!review || !review.available || !review.lists ? (
        <Card>
          <p className="text-sm text-foreground-muted" data-testid="review-unavailable">
            {REVIEW_UNAVAILABLE}
          </p>
        </Card>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-surface px-3 py-2.5" data-testid="review-window">
            <p className="text-sm font-semibold">{review.window!.label}</p>
            <p className="text-xs text-foreground-muted">{review.window!.as_of_label}</p>
          </div>
          <WeekPicker review={review} />
          <MineProvider asOf={review.as_of!}>
            <Card title="Biggest gains and falls">
              <ReviewLists review={review} />
            </Card>
            <YourStocks />
            <Card title="Market this week">
              <MarketBlock review={review} />
            </Card>
            <Card title="Biggest change in Stock Condition">
              <ScChanges review={review} />
            </Card>
            <Card title="What happened this week">
              <EventsBlock review={review} />
            </Card>
          </MineProvider>
          <Footnotes r={review} />
        </>
      )}
    </div>
  );
}
