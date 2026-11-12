import type { Metadata } from "next";
import { getDataStatus, getMarketOverview } from "@/lib/api/endpoints";
import { FreshnessDot } from "@/components/ui/FreshnessDot";
import { Card } from "@/components/ui/Card";
import { StandardLineNote } from "@/components/seo/StandardLine";
import { quarterDate } from "@/lib/seo/stock-facts";
import type { DataStatus } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Data sources & update times",
  description: "Where RedixFi's prices, delivery, options, filings and news data come from, the date of the newest data in each source, and how many stocks have each main field.",
  alternates: { canonical: "/more/data-sources" },
};

export const revalidate = 600;

// Shown only when the dates cannot be loaded. Cadences checked against the real jobs (VM scheduler, and the GitHub Actions
// workflow that runs the delivery, FII/DII and bulk/block deal syncs at 21:30 IST on weekdays).
const FALLBACK_SOURCES = [
  { name: "Price and volume history", cadence: "VM scheduler: daily bars at 07:15 and a close pass at 16:00 IST" },
  { name: "Intraday scanner (15-minute candles)", cadence: "VM scheduler: every 13 minutes, 09:31 to 15:30 IST, delayed" },
  { name: "Delivery percentage", cadence: "GitHub Actions workflow: weekdays 21:30 IST" },
  { name: "FII / DII flows", cadence: "GitHub Actions workflow: weekdays 21:30 IST" },
  { name: "Bulk and block deals", cadence: "GitHub Actions workflow: weekdays 21:30 IST" },
  { name: "Options positioning (PCR)", cadence: "VM scheduler: daily at 08:15 IST" },
  { name: "Promoter pledge", cadence: "Updated when new pledge disclosures arrive (quarterly)" },
  { name: "Insider filings", cadence: "VM scheduler: daily at 18:30 IST" },
  { name: "News", cadence: "VM scheduler: 08:20, 12:20, 16:20 and 20:20 IST" },
  { name: "Reported fundamentals", cadence: "VM scheduler: daily at 19:30 and 20:00 IST" },
  { name: "Concall summaries", cadence: "VM scheduler: daily at 18:45 IST" },
];

function day(ymd: string | null): string {
  if (!ymd) return "no data stored";
  const d = new Date(`${ymd.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default async function DataSourcesPage() {
  let fresh: boolean | null = null;
  try {
    const env = await getMarketOverview();
    fresh = env.meta.data_fresh;
  } catch {
    fresh = null;
  }
  let status: DataStatus | null = null;
  try {
    status = (await getDataStatus({ revalidate: 600 })).data;
  } catch {
    status = null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold">Data sources & update times</h1>
      {fresh !== null && (
        <div className="mb-4">
          <FreshnessDot fresh={fresh} />
        </div>
      )}
      <p className="mb-3 text-sm text-foreground-muted">
        Each source below shows the date of the newest row stored for it. The dates are read from the data itself each time this page is built, so they are not typed in.
      </p>
      {status ? (
        <Card title="Sources and the date of the newest data">
          <ul className="divide-y divide-border">
            {status.sources.map((s) => (
              <li key={s.key} className="py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-foreground-muted" data-testid="source-as-of">Newest data: {day(s.as_of)}</span>
                </div>
                <p className="mt-0.5 text-foreground-muted">{s.detail}</p>
                <p className="mt-0.5 text-xs text-foreground-faint">How it is updated: {s.cadence}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card title="Sources">
          <p className="mb-2 text-xs text-foreground-muted">The dates of the newest data could not be loaded just now. How each source is updated:</p>
          <ul className="divide-y divide-border">
            {FALLBACK_SOURCES.map((s) => (
              <li key={s.name} className="py-3 text-sm">
                <span className="font-medium">{s.name}</span>
                <p className="mt-0.5 text-xs text-foreground-faint">{s.cadence}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {status && (
        <Card title="How many stocks have each field" className="mt-4">
          <p className="mb-2 text-xs text-foreground-muted">
            Out of {status.coverage.universe.toLocaleString("en-IN")} listed stocks. Quarterly figures are each company&apos;s latest reported quarter
            {status.coverage.quarter_end_earliest ? ` (quarters ended ${quarterDate(status.coverage.quarter_end_earliest)} to ${quarterDate(status.coverage.quarter_end_latest)})` : ""}.
          </p>
          <ul className="divide-y divide-border">
            {status.coverage.fields.map((f) => (
              <li key={f.label} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-sm">
                <span>{f.label}</span>
                <span className="text-xs text-foreground-muted">
                  {f.count.toLocaleString("en-IN")} stocks{f.as_of ? ` · ${f.quarter_end ? "latest period" : "as of"} ${day(f.as_of)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="What “Not available” means" className="mt-4">
        <p className="text-sm text-foreground-muted" data-testid="not-available-text">
          {status?.not_available_text ??
            "Not available means the source did not give RedixFi a value for that stock and date. It is shown as “Not available” instead of a zero or an estimate."}
        </p>
      </Card>
      <StandardLineNote className="mt-6" />
    </div>
  );
}
