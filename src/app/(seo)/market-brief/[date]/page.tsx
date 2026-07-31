import type { Metadata } from "next";
import Link from "next/link";
import { getLatestBrief } from "@/lib/api/endpoints";
import { AiLabel } from "@/components/ui/AiLabel";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `Market Brief — ${date}`,
    description: `RedixFi's AI-written market recap for ${date} — measured facts from the day's data.`,
    alternates: { canonical: `/market-brief/${date}` },
  };
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
