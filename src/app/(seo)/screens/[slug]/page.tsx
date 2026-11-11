import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCannedScreen } from "@/data/canned-screens";
import { getSignals } from "@/lib/api/endpoints";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { cache } from "react";
import { getFundamentalScreen, FILTERS_NOTE, type FundamentalScreen } from "@/data/fundamental-screens";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StandardLineNote } from "@/components/seo/StandardLine";
import { ScreenTable } from "@/components/seo/ScreenTable";
import { ScreenMoreRows } from "@/components/seo/ScreenMoreRows";
import { TrialCta } from "@/components/app/TrialCta";
import { quarterDate } from "@/lib/seo/stock-facts";
import type { FundamentalsCoverage } from "@/lib/api/types";

export const revalidate = 120;

// Reported-figure screens: the first ten rows are rendered for everyone (and for search engines); the rest sit behind the lock component.
// When the API cannot run the filters yet the page does not exist (404) instead of showing an unfiltered list as if it were filtered.
const loadFundamentalScreen = cache(async (slug: string) => {
  const screen = getFundamentalScreen(slug);
  if (!screen) return null;
  try {
    // @auth-ok: public SEO page, anonymous by design; the full list is fetched in the browser with the visitor's own token.
    const env = await getSignals({ ...screen.params, size: 10 }, { revalidate: 600 });
    const cov = env.page_info.fundamentals_coverage;
    if (!cov) return null;
    return { screen, rows: env.data, total: env.page_info.total, cov };
  } catch {
    return null;
  }
});

const COVERAGE_LABEL: { key: keyof FundamentalsCoverage; param: string[]; label: string }[] = [
  { key: "pe", param: ["pe_min", "pe_max"], label: "P/E" },
  { key: "roe", param: ["roe_min"], label: "return on equity" },
  { key: "eps", param: ["eps_positive"], label: "EPS" },
  { key: "profit_growth", param: ["profit_growth_min"], label: "profit growth" },
  { key: "sales_growth", param: ["sales_growth_min"], label: "sales growth" },
  { key: "ema200", param: ["ema200_state"], label: "200-day EMA" },
];

function checkedLine(screen: FundamentalScreen, cov: FundamentalsCoverage): string {
  const used = COVERAGE_LABEL.filter((c) => c.param.some((p) => (screen.params as Record<string, unknown>)[p] !== undefined));
  return used.map((c) => `${c.label}: ${Number(cov[c.key]).toLocaleString("en-IN")} stocks`).join("; ");
}

async function FundamentalScreenPage({ slug }: { slug: string }) {
  const f = await loadFundamentalScreen(slug);
  if (!f) notFound();
  const { screen, rows, total, cov } = f;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: screen.heading,
    description: screen.description,
    itemListElement: rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: `${r.company_name} (${r.symbol})` })),
  };
  return (
    <div className="mx-auto max-w-4xl">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs crumbs={[{ name: "Home", href: "/" }, { name: "Stock screens", href: "/screens" }, { name: screen.heading, href: `/screens/${screen.slug}` }]} />
      <h1 className="text-xl font-semibold">{screen.heading}</h1>
      <p className="mt-1 text-sm font-medium" data-testid="filters-note">{FILTERS_NOTE}</p>
      <p className="mt-1 text-sm text-foreground-muted">{screen.description}</p>
      <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm">
        {screen.conditions.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <p className="mt-3 text-sm">
        <span className="font-semibold tabular-nums">{total.toLocaleString("en-IN")}</span> stocks meet all of these conditions. A stock with no reported figure for a condition is not matched.
      </p>
      <p className="mt-1 text-xs text-foreground-muted">
        Stocks each condition can check: {checkedLine(screen, cov)}.
        {cov.quarter_end_latest ? ` Quarterly figures are from each company's latest reported quarter, ended between ${quarterDate(cov.quarter_end_earliest)} and ${quarterDate(cov.quarter_end_latest)}; the quarter-end date of each row is shown.` : ""}
      </p>

      <div className="mt-4">
        {rows.length ? <ScreenTable rows={rows} /> : <p className="text-sm text-foreground-muted">No stock meets all of these conditions on the stored data.</p>}
        <ScreenMoreRows params={screen.params} total={total} />
      </div>

      <TrialCta className="mt-6" />
      <p className="mt-4 text-sm">
        <Link href="/screens" className="text-accent hover:underline">More screens</Link> · <Link href="/signals" className="text-accent hover:underline">Build your own in the Screener</Link>
      </p>
      <StandardLineNote className="mt-8" />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (getFundamentalScreen(slug)) {
    const f = await loadFundamentalScreen(slug);
    if (!f) return { title: "Screen not found", robots: { index: false, follow: false } };
    return {
      title: { absolute: f.screen.title },
      description: f.screen.description,
      alternates: { canonical: `/screens/${f.screen.slug}` },
      openGraph: { title: f.screen.heading, description: f.screen.description, type: "website" },
    };
  }
  const screen = getCannedScreen(slug);
  if (!screen) return { title: "Screen not found" };
  const ogImage = `/api/og?${new URLSearchParams({
    type: "screener",
    title: screen.title,
    subtitle: screen.description,
  }).toString()}`;
  return {
    title: screen.title,
    description: screen.description,
    alternates: { canonical: `/screens/${screen.slug}` },
    openGraph: { title: screen.title, description: screen.description, type: "website", images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: screen.title, description: screen.description, images: [ogImage] },
  };
}

export default async function ScreenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (getFundamentalScreen(slug)) return <FundamentalScreenPage slug={slug} />;
  const screen = getCannedScreen(slug);
  if (!screen) notFound();

  // @auth-ok: public SEO page, ISR-cached and crawlable — must never carry
  // a visitor's personal token. Same locked/unlocked view any anonymous
  // visitor gets on the real Signals list.
  const env = await getSignals({ ...screen.params, size: 10 }, { revalidate: 120 });

  // ItemList: the accurate Schema.org type for a ranked list of named
  // items (here, stocks matching the screen's real filter/sort) — B8-safe
  // by construction, since it only names symbols already visible in the
  // unmasked identity fields (row.symbol/company_name are never masked;
  // see signals_view.py::row_from_joined) and never includes a masked
  // numeric field.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: screen.title,
    description: screen.description,
    itemListElement: env.data.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${r.company_name} (${r.symbol})`,
    })),
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <h1 className="mb-1 text-xl font-semibold">{screen.title}</h1>
      <p className="mb-4 text-sm text-foreground-muted">{screen.description}</p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
            <tr>
              <th className="px-3 py-2">Symbol</th>
              <th className="px-3 py-2">Sector</th>
              <th className="px-3 py-2">Change</th>
              <th className="px-3 py-2">Delivery</th>
            </tr>
          </thead>
          <tbody>
            {env.data.map((r) => (
              <tr key={r.symbol} className="border-t border-border">
                <td className="px-3 py-2 font-medium">
                  <Link href={`/stocks/${encodeURIComponent(r.symbol)}`} className="text-accent hover:underline">
                    {r.symbol}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs text-foreground-muted">{r.sector}</td>
                <td className="px-3 py-2 tabular-nums">{r.delta_1d !== null ? <DeltaValue value={r.delta_1d} /> : "—"}</td>
                <td className="px-3 py-2 tabular-nums text-xs">{r.delivery_pct !== null ? `${r.delivery_pct}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-5 text-center">
        <p className="text-sm font-medium">
          Showing 10 of {env.page_info.total.toLocaleString("en-IN")} stocks meeting this screen.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          Sign up to see all {env.page_info.total.toLocaleString("en-IN")}
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-foreground-faint">
        <Link href="/screens" className="underline">
          More screens
        </Link>
      </p>
    </div>
  );
}
