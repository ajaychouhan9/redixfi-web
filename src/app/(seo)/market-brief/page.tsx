import type { Metadata } from "next";
import Link from "next/link";
import { getLatestBrief } from "@/lib/api/endpoints";
import { AiLabel } from "@/components/ui/AiLabel";

// Build-failure fix (2026-09-11) — same treatment as /track-record. This is
// the only other prerendered route that fetches a live upstream
// (GET /brief/latest) without catching; while it was build-prerendered a
// transient upstream error (nginx HTML / 500) could abort the whole Vercel
// build. Render on request instead — data freshness is unchanged (the fetch
// below still requests revalidate: 300, and /market-brief/[date] is already
// dynamic).
export const dynamic = "force-dynamic";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Market Brief Archive",
  description: "RedixFi's AI-written daily market recap — measured facts from the day's data, labeled AI-generated.",
};

export default async function MarketBriefIndexPage() {
  const brief = await getLatestBrief({ revalidate: 300 });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Market Brief</h1>
      {brief ? (
        <div className="rounded-xl border border-border p-5">
          <div className="mb-2 flex items-center justify-between">
            <Link href={`/market-brief/${brief.date}`} className="text-sm font-semibold text-accent hover:underline">
              {brief.date}
            </Link>
            <AiLabel />
          </div>
          <p className="text-sm leading-relaxed">{brief.body}</p>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">No brief has been generated yet — check back after market open.</p>
      )}
    </div>
  );
}
