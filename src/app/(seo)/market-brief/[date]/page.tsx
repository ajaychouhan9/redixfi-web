import { finalizeMeta } from "@/lib/seo/page-meta";
import { humanDate } from "@/lib/human-date";
import type { Metadata } from "next";
import Link from "next/link";
import { getLatestBrief } from "@/lib/api/endpoints";
import { AiLabel } from "@/components/ui/AiLabel";

export const revalidate = 300;
// Without generateStaticParams a dynamic route is rendered on EVERY request and `revalidate` is ignored (found 14 Nov 2026: no-store, no ISR).
// Returning [] builds nothing up front and turns on cached on-demand pages (ISR).
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const day = humanDate(date);
  return finalizeMeta({ title: `Market brief for ${day}`, description: `RedixFi's AI-written market recap for ${day}, built from the day's measured data.` }, `/market-brief/${date}`);
}

export default async function MarketBriefDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const brief = await getLatestBrief({ revalidate: 300 });
  const matches = brief && brief.date === date;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Market Brief — {date}</h1>
      {matches ? (
        <div className="rounded-xl border border-border p-5">
          <div className="mb-2">
            <AiLabel />
          </div>
          <p className="text-sm leading-relaxed">{brief.body}</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-foreground-muted">
            This date isn&apos;t in the archive yet — right now only the latest brief is retrievable.
          </p>
          {brief && (
            <Link href={`/market-brief/${brief.date}`} className="mt-2 inline-block text-sm font-medium text-accent">
              See the latest brief ({brief.date}) →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
