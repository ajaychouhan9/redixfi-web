import type { Metadata } from "next";
import Link from "next/link";
import { FileDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getSampleReportInfo, type SampleReportInfo } from "@/lib/api/reports";
import { REPORT_DISCLAIMER, SAMPLE_INSIDE } from "@/lib/report-copy";

const SITE_URL = "https://www.redixfi.com";
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "https://api.redixfi.com/api/v1").replace(/\/$/, "");

const TITLE = "Free sample company report";
const DESCRIPTION =
  "See what a RedixFi company report PDF contains: price and 52-week range, Stock Condition, growth, peers, ownership, events, filing summaries and governance items, each with its source and date.";
const OG_IMAGE = `/api/og?${new URLSearchParams({
  type: "report",
  title: "Sample company report",
  subtitle: "Measured facts, filing summaries and sources in one PDF",
}).toString()}`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/sample-report" },
  openGraph: {
    title: `${TITLE} | RedixFi`,
    description: DESCRIPTION,
    type: "website",
    url: `${SITE_URL}/sample-report`,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "RedixFi sample company report" }],
  },
  twitter: { card: "summary_large_image", title: `${TITLE} | RedixFi`, description: DESCRIPTION, images: [OG_IMAGE] },
};

export const revalidate = 3600;

async function loadInfo(): Promise<SampleReportInfo> {
  try {
    const env = await getSampleReportInfo({ revalidate: 3600 });
    return env.data;
  } catch {
    return { available: false };
  }
}

function formatDay(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default async function SampleReportPage() {
  const info = await loadInfo();
  const generated = formatDay(info.generated_on);
  const dataDate = formatDay(info.data_as_of);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/sample-report`,
        url: `${SITE_URL}/sample-report`,
        name: TITLE,
        description: DESCRIPTION,
        isPartOf: { "@type": "WebSite", name: "RedixFi", url: SITE_URL },
        ...(info.available && info.generated_on ? { dateModified: info.generated_on } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: TITLE, item: `${SITE_URL}/sample-report` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header>
        <h1 className="text-xl font-semibold">Free sample company report</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          A real report for one large company, so you can see what is inside before choosing a plan. Every number has a
          source and a date, and a field the data source does not have says so instead of being left blank.
        </p>
      </header>

      <Card title="The sample">
        {info.available ? (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{info.company_name}</span> ({info.symbol})
              {info.sector ? <span className="text-foreground-muted"> · {info.sector}</span> : null}
            </p>
            <p className="text-xs text-foreground-faint" data-testid="sample-dates">
              Generated {generated ?? info.generated_at}
              {dataDate ? ` · price data as of ${dataDate} close` : ""}. The sample is fixed: it is refreshed by hand, not every day.
            </p>
            <a
              href={`${API_BASE}/reports/sample`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              data-testid="sample-download"
            >
              <FileDown size={15} />
              Download the sample report (PDF)
            </a>
            <p className="text-xs text-foreground-faint">
              This company was chosen because it is large, has a full year of price history, complete data, and no automated governance observations or enforcement mentions stored. Its governance page shows routine annual-report disclosures only. It is not a
              recommendation or a comparison with other companies.
            </p>
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">The sample report is not available right now. Please try again later.</p>
        )}
      </Card>

      <Card title="What is inside">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground-muted">
          {SAMPLE_INSIDE.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-foreground-faint">
          Reports for any stock with enough data are included in Basic and Pro. Every page carries: {REPORT_DISCLAIMER}
        </p>
      </Card>

      <Card title="Get reports for the stocks you follow">
        <p className="text-sm text-foreground-muted">
          Create a free account to follow stocks and see their Stock Conditions. Company report PDFs for any stock with
          enough data are part of Basic and Pro.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/login" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground" data-testid="sample-signup">
            Create a free account
          </Link>
          <Link href="/pricing" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-hover">
            See plans
          </Link>
        </div>
      </Card>

      <p className="text-sm font-medium">{REPORT_DISCLAIMER}</p>
    </div>
  );
}
