import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResearch } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { Sparkline } from "@/components/ui/Sparkline";
import { NewsList } from "@/components/app/NewsList";
import { formatDataAsOf } from "@/lib/format";
import { stockPath, stockSymbolFromParam } from "@/lib/seo/stock-symbol";
import { CorporateActionNote } from "@/components/ui/CorporateActionNote";
import type { ResearchDetail } from "@/lib/api/types";
import { retryTransientPublicGet } from "@/lib/api/retry-public-upstream";

// Public no-login snapshot — ISR: pre-rendered on first crawl/visit, then
// revalidated every 5 minutes. Fetched WITHOUT a bearer token, which the
// live API treats as anonymous (verified: unmetered, full payload) — this
// page still only SURFACES the spec's limited subset by design, not
// because the API restricts it, to preserve the signup funnel.
export const revalidate = 300;

// PERF_ANALYSIS_2026-10-05 fix (2026-10-07): generateMetadata and the page
// body both invoke loadCompany(sym) for the same request — React's cache()
// memoizes per-request-per-arguments so the second invocation is free
// instead of re-issuing the getResearch fetch.
const loadCompany = cache(async (symbol: string) => {
  try {
    // @auth-ok: public SEO snapshot, ISR-cached and crawlable — see the
    // module docstring above. Anonymous = unmetered (correct per
    // core/auth.py's own default), never a masking concern here since
    // getResearch's only tier-dependent behavior is the free-tier
    // metering counter, not data masking.
    const env = await retryTransientPublicGet(
      () => getResearch(symbol, { revalidate: 300 }),
      () => getResearch(symbol, { timeoutMs: 10_000 }),
    );
    return env.data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
});

// Unresolved corporate actions (unconfirmed / review, e.g. a demerger): the
// 52-week range mixes prices from before and after the event, so it is not shown.
function rangeHidden(data: ResearchDetail): boolean {
  const st = (data.price.corporate_action ?? data.corporate_action)?.status;
  return st === "unconfirmed" || st === "review";
}

function fmtInr(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// A few factual sentences from data already on the page, so the HTML carries
// readable text without JavaScript. Measured values only; no outlook or advice.
function introSentences(data: ResearchDetail): string[] {
  const p = data.price;
  const out = [`${data.company_name} (${data.symbol}) is listed on the NSE${data.sector ? ` and grouped under ${data.sector}` : ""}.`];
  out.push(`Its latest price is ₹${fmtInr(p.last_price)}${p.day_change_pct === null ? "" : `, ${p.day_change_pct > 0 ? "+" : ""}${p.day_change_pct.toFixed(2)}% from the previous close`}.`);
  const high52 = p.week52_high;
  const low52 = p.week52_low;
  const position52 = p.week52_position_pct;
  if (!rangeHidden(data) && high52 != null && low52 != null && position52 != null && high52 > 0) {
    out.push(`Over the past 52 weeks it traded between ₹${fmtInr(low52)} and ₹${fmtInr(high52)}; the latest price sits ${Math.round(position52)}% of the way up that range.`);
  }
  const dl = data.delivery_30d.map((d) => d.delivery_pct).filter((v) => Number.isFinite(v));
  if (dl.length >= 5) {
    out.push(`Across the last ${dl.length} sessions, an average of ${(dl.reduce((a, b) => a + b, 0) / dl.length).toFixed(1)}% of traded shares were taken for delivery.`);
  }
  return out;
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const normalizedSymbol = stockSymbolFromParam(symbol);
  if (!normalizedSymbol) return { title: "Stock not found" };
  const data = await loadCompany(normalizedSymbol);
  if (!data) return { title: `${symbol.toUpperCase()} not found` };
  const title = `${data.company_name} (${data.symbol}) — Price, Delivery & News`;
  const dc = data.price.day_change_pct;
  const high52 = data.price.week52_high;
  const low52 = data.price.week52_low;
  const rangeText = !rangeHidden(data) && high52 != null && low52 != null
    ? `52-week range ₹${fmtInr(low52)}–₹${fmtInr(high52)}, `
    : "";
  const description = `${data.company_name} (${data.symbol}): ₹${fmtInr(data.price.last_price)}, ${dc === null ? "" : `${dc > 0 ? "+" : ""}${dc.toFixed(2)}% today, `}${rangeText}delivery trend and latest news — measured data, not advice.`;
  const ogImage = `/api/og?${new URLSearchParams({
    type: "stock",
    title: data.symbol,
    subtitle: data.company_name,
    stat: `₹${data.price.last_price.toLocaleString("en-IN")}`,
    // no day change is shown across a split or bonus (price history not comparable)
    statLabel: data.price.day_change_pct === null ? "Price history not comparable" : `${data.price.day_change_pct >= 0 ? "+" : ""}${data.price.day_change_pct}% today`,
    direction: data.price.day_change_pct === null || data.price.day_change_pct >= 0 ? "up" : "down",
  }).toString()}`;
  return {
    title,
    description,
    alternates: { canonical: `/stocks/${encodeURIComponent(data.symbol)}` },
    openGraph: {
      title: `${data.company_name} (${data.symbol})`,
      description: `Price, delivery trend and news for ${data.company_name} — measured market data.`,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function StockSnapshotPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const normalizedSymbol = stockSymbolFromParam(symbol);
  if (!normalizedSymbol) notFound();
  const data = await loadCompany(normalizedSymbol);
  if (!data) notFound();

  const positionPct = Math.max(0, Math.min(100, data.price.week52_position_pct ?? 0));
  const sortedDelivery = [...data.delivery_30d].sort((a, b) => a.date.localeCompare(b.date));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Corporation",
    name: data.company_name,
    tickerSymbol: data.symbol,
    identifier: data.isin,
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-sm text-foreground-muted">
        {data.symbol} · {data.sector}
      </p>
      <h1 className="text-2xl font-semibold">{data.company_name}</h1>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-semibold">₹{data.price.last_price.toLocaleString("en-IN")}</span>
        <DeltaValue value={data.price.day_change_pct} kind="pct" />
      </div>
      {/* Sep 2026 fix: `data` here already carries price.data_as_of (the
          fresh intraday overlay's real candle timestamp, or the last
          completed session's date) — every other surface (ResearchDetail,
          Signal tables) already renders this via formatDataAsOf(); this
          SEO snapshot page simply never did. */}
      <p className="mt-1 text-xs text-foreground-faint">{formatDataAsOf(data.price.data_as_of)}</p>
      <CorporateActionNote info={data.price.corporate_action ?? data.corporate_action} className="mt-1 text-xs text-foreground-muted" />
      {!rangeHidden(data) && (
      <div className="mt-3 max-w-xs">
        <div className="h-1.5 w-full rounded-full bg-neutral-bg">
          <div className="h-1.5 rounded-full bg-accent" style={{ width: `${positionPct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-foreground-faint">
          <span>52wk low ₹{data.price.week52_low}</span>
          <span>52wk high ₹{data.price.week52_high}</span>
        </div>
      </div>
      )}

      <p className="mt-5 text-sm leading-relaxed text-foreground-muted">{introSentences(data).join(" ")}</p>
      <p className="mt-2 text-sm">
        More on {data.symbol}:{" "}
        <Link href={stockPath("/research", data.symbol)} className="text-accent hover:underline">research page</Link>
        {" · "}
        <Link href={stockPath("/signals", data.symbol)} className="text-accent hover:underline">Stock Condition</Link>
        {" · "}
        <Link href={stockPath("/track-record", data.symbol)} className="text-accent hover:underline">signal history</Link>
      </p>

      {sortedDelivery.length > 1 && (
        <div className="mt-6">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">
            Delivery % (30 days)
          </h2>
          <div className="text-accent">
            <Sparkline values={sortedDelivery.map((d) => d.delivery_pct)} height={40} />
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Latest news</h2>
        <NewsList items={data.news.slice(0, 3)} />
      </div>

      {/* Defensive: `concall_transcripts` is typed as always-present but a
          real production /research/{symbol} response can omit it — crashed
          this page live with RELIANCE (TypeError: Cannot read properties
          of undefined) during this task's own testing. */}
      {(data.concall_transcripts?.length ?? 0) > 0 && (
        <p className="mt-4 text-sm">
          <Link href={`${stockPath("/stocks", data.symbol)}/concall-summary`} className="font-medium text-accent hover:underline">
            Read the latest concall summary →
          </Link>
        </p>
      )}

      <div className="mt-8 rounded-xl border border-accent/30 bg-accent/5 p-5 text-center">
        <p className="text-sm font-medium">
          See {data.symbol}&apos;s full Research Pro page — insider trades, promoter pledge trend, options
          positioning, corporate events and an AI-generated summary.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          Sign up free
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-foreground-faint">
        <Link href="/pricing" className="underline">
          See pricing
        </Link>
      </p>
    </div>
  );
}
