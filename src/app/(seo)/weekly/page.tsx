import type { Metadata } from "next";
import Link from "next/link";
import { getSevenDayReview } from "@/lib/api/endpoints";
import { retryTransientPublicGet } from "@/lib/api/retry-public-upstream";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StandardLineNote } from "@/components/seo/StandardLine";
import { weekPath } from "@/lib/seo/weekly";

export const revalidate = 900;

const TITLE = "Weekly market reviews: archive of past weeks of Indian market data | RedixFi";
const DESCRIPTION =
  "Every stored week of the RedixFi 7-Day Review as its own page: index moves, advancing and declining stocks, the largest price rises and falls and what was announced. Measured data only.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/weekly" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
};

export default async function WeeklyArchivePage() {
  let weeks: { as_of: string; sessions: number; label: string }[] = [];
  try {
    // @auth-ok: public SEO page, anonymous by design.
    const env = await retryTransientPublicGet(
      () => getSevenDayReview(undefined, { revalidate: 900 }),
      () => getSevenDayReview(undefined, { revalidate: 900, timeoutMs: 10_000 }),
    );
    weeks = env.data.weeks ?? [];
  } catch {
    weeks = [];
  }
  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs crumbs={[{ name: "Home", href: "/" }, { name: "Weekly market reviews", href: "/weekly" }]} />
      <h1 className="text-2xl font-semibold">Weekly market reviews</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Each page is one stored week of the 7-Day Review: what the indices did, how many stocks closed higher and lower, the largest price changes and what was announced. The newest week is also on the{" "}
        <Link href="/signals/7-day-review" className="text-accent hover:underline">
          7-Day Review
        </Link>{" "}
        page.
      </p>
      {weeks.length === 0 ? (
        <p className="mt-6 text-sm text-foreground-muted">The archive is not available right now. Please check back later.</p>
      ) : (
        <ul className="mt-5 divide-y divide-border rounded-lg border border-border" data-testid="weekly-archive">
          {weeks.map((w) => (
            <li key={w.as_of}>
              <Link href={weekPath(w.as_of)} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2.5 text-sm hover:bg-hover">
                <span className="font-medium">{w.label.replace(/^Last \d+ sessions: /, "")}</span>
                <span className="text-xs text-foreground-muted">{w.sessions} sessions</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <StandardLineNote className="mt-8" />
    </div>
  );
}
