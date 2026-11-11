import { TrialCta } from "@/components/app/TrialCta";
import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResearch } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { Sparkline } from "@/components/ui/Sparkline";
import { NewsList } from "@/components/app/NewsList";
import { formatDataAsOf, formatDateIst } from "@/lib/format";
import { Week52Range } from "@/components/app/signals/Week52Range";
import { resolve52Week } from "@/lib/week52";
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

// One delivery window on the page: the last DELIVERY_SESSIONS sessions, oldest first. The label, the chart, the average in the text and
// the table all use it (the stored 30 calendar days hold about 20 sessions; the page said "30 days" and "20 sessions" in different places).
const DELIVERY_SESSIONS = 20;
function deliveryWindow(data: ResearchDetail) {
  return [...data.delivery_30d]
    .filter((d) => Number.isFinite(d.delivery_pct))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-DELIVERY_SESSIONS);
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
  const r52 = rangeHidden(data) ? null : resolve52Week(p.week52_high, p.week52_low, p.last_price);
  if (r52) {
    out.push(`Over the past 52 weeks it traded between ₹${fmtInr(r52.low)} and ₹${fmtInr(r52.high)}; the latest price sits ${Math.round(r52.positionPct)}% of the way up that range.`);
  }
  const dl = deliveryWindow(data).map((d) => d.delivery_pct).filter((v) => Number.isFinite(v));
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
  const r52 = rangeHidden(data) ? null : resolve52Week(data.price.week52_high, data.price.week52_low, data.price.last_price);
  const rangeText = r52 ? `52-week range ₹${fmtInr(r52.low)}–₹${fmtInr(r52.high)}, ` : "";
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

  const sortedDelivery = deliveryWindow(data);
  const lastFive = sortedDelivery.slice(-5).reverse();

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
        <Week52Range
          className="mt-3 max-w-xs"
          week52={{ week52_high: data.price.week52_high, week52_low: data.price.week52_low, last_close: data.price.last_price, as_of: data.price.data_as_of?.data_as_of?.slice(0, 10) ?? null } as never}
          lastPrice={data.price.last_price}
        />
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
            Delivery % (last {sortedDelivery.length} sessions)
          </h2>
          <div className="text-accent">
            <Sparkline values={sortedDelivery.map((d) => d.delivery_pct)} height={40} />
          </div>
          <table className="mt-3 w-full max-w-xs text-sm">
            <caption className="sr-only">Delivery percentage, last 5 sessions</caption>
            <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
              <tr>
                <th className="py-1 pr-3">Session</th>
                <th className="py-1 text-right">Delivery %</th>
              </tr>
            </thead>
            <tbody>
              {lastFive.map((d) => (
                <tr key={d.date} className="border-t border-border">
                  <td className="py-1 pr-3">{formatDateIst(d.date)}</td>
                  <td className="py-1 text-right tabular-nums">{d.delivery_pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
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

<TrialCta className="mt-8" />
    </div>
  );
}
