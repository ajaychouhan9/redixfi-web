import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResearch } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";

// Public no-login page — same ISR posture as /stocks/[symbol]: pre-rendered
// on first crawl/visit, revalidated every 5 minutes, fetched WITHOUT a
// bearer token (anonymous = unmetered, verified). No B8 masking concern
// here at all: concall_transcripts is explicitly documented as never
// tier-gated (research.py::_concall_block — "_compute_research() was never
// tier-gated in the first place"), so this page shows the exact same data
// a logged-in Basic or Pro visitor would see — only the surrounding CTA
// differs (signup funnel), never the underlying content.
export const revalidate = 300;

async function loadCompany(symbol: string) {
  try {
    // @auth-ok: public SEO snapshot, ISR-cached and crawlable — see the
    // module docstring above.
    const env = await getResearch(symbol, { revalidate: 300 });
    return env.data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const data = await loadCompany(symbol.toUpperCase());
  // Defensive: `concall_transcripts` is typed as always-present but a real
  // production /research/{symbol} response can omit it entirely (crashed
  // /stocks/[symbol] live with RELIANCE during this task's own testing —
  // same guard applied there).
  if (!data?.concall_transcripts?.length) return { title: `${symbol.toUpperCase()} concall summary not found` };

  const latest = data.concall_transcripts[0];
  const title = `${data.company_name} (${data.symbol}) — Latest Concall Summary`;
  const description = `AI summary of ${data.company_name}'s latest ${latest.subject === "EARNINGS_CALL_TRANSCRIPT" ? "concall" : "investor presentation"} (${latest.filing_date}) — source-cited, measured tone: ${latest.tone_label}.`;
  const ogImage = `/api/og?${new URLSearchParams({
    type: "concall",
    title: data.symbol,
    subtitle: `${data.company_name} — Concall Summary`,
    stat: latest.tone_label,
    statLabel: `${latest.subject === "EARNINGS_CALL_TRANSCRIPT" ? "Concall" : "Investor presentation"} · ${latest.filing_date}`,
  }).toString()}`;

  return {
    title,
    description,
    alternates: { canonical: `/stocks/${data.symbol}/concall-summary` },
    openGraph: { title, description, type: "article", images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function ConcallSummaryPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const data = await loadCompany(symbol.toUpperCase());
  if (!data?.concall_transcripts?.length) notFound();

  const latest = data.concall_transcripts[0];
  const older = data.concall_transcripts.slice(1, 4);

  // Article schema: this page is an AI-generated summary of a specific
  // document (the concall transcript), not the company itself — Article
  // is the accurate Schema.org type, with `about` linking to the company
  // as an Organization (task's suggested types: Organization / Article).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${data.company_name} — ${latest.subject === "EARNINGS_CALL_TRANSCRIPT" ? "Concall" : "Investor Presentation"} Summary`,
    datePublished: latest.filing_date || undefined,
    author: { "@type": "Organization", name: "RedixFi" },
    publisher: { "@type": "Organization", name: "RedixFi" },
    about: { "@type": "Organization", name: data.company_name, tickerSymbol: data.symbol },
    articleBody: latest.summary,
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-sm text-foreground-muted">
        <Link href={`/stocks/${data.symbol}`} className="hover:underline">
          {data.symbol}
        </Link>{" "}
        · Concall Summary
      </p>
      <h1 className="text-2xl font-semibold">{data.company_name}</h1>

      <div className="mt-5 rounded-xl border border-border bg-surface-raised p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
            {latest.subject === "EARNINGS_CALL_TRANSCRIPT" ? "Concall" : "Investor Presentation"}
          </span>
          <span className="text-xs text-foreground-faint">{latest.filing_date}</span>
        </div>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
            latest.tone_label === "Positive"
              ? "bg-up-bg text-up"
              : latest.tone_label === "Negative"
                ? "bg-down-bg text-down"
                : "bg-surface text-foreground-muted"
          }`}
        >
          Tone: {latest.tone_label}
        </span>
        <p className="mt-3 text-sm leading-relaxed text-foreground">{latest.summary}</p>
        <p className="mt-2 text-xs text-foreground-faint">{latest.tone_note}</p>
        {latest.source_pdf_url && (
          <a href={latest.source_pdf_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-accent hover:underline">
            View source filing →
          </a>
        )}
      </div>

      {older.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Earlier concalls</h2>
          <ul className="space-y-2">
            {older.map((c, i) => (
              <li key={i} className="rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-foreground-faint">{c.filing_date}</span> — {c.summary.slice(0, 120)}…
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-accent/30 bg-accent/5 p-5 text-center">
        <p className="text-sm font-medium">
          See {data.symbol}&apos;s full Research Pro page — annual report summary, insider trades, promoter pledge
          trend, options positioning and Ask-RedixFi AI.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          Sign up free
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-foreground-faint">
        <Link href={`/stocks/${data.symbol}`} className="underline">
          Back to {data.symbol} snapshot
        </Link>
      </p>
    </div>
  );
}
