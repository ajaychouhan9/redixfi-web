import { TrialCta } from "@/components/app/TrialCta";
import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResearch, getSignalDetail, getSignals, getVolatility } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { Sparkline } from "@/components/ui/Sparkline";
import { formatDateIst, formatPriceAsOf, istToday } from "@/lib/format";
import { Week52Range } from "@/components/app/signals/Week52Range";
import { resolve52Week } from "@/lib/week52";
import { stockPath, stockSymbolFromParam } from "@/lib/seo/stock-symbol";
import { CorporateActionNote } from "@/components/ui/CorporateActionNote";
import type { ResearchDetail, SignalDetail, SignalRow, VolatilityResponse } from "@/lib/api/types";
import { retryTransientPublicGet } from "@/lib/api/retry-public-upstream";
import { FeedbackBox } from "@/components/app/FeedbackBox";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DataTable, Section } from "@/components/seo/DataTable";
import { StandardLineNote } from "@/components/seo/StandardLine";
import { inr, metaDescription, pageH1, pageTitle, pct, quarterDate } from "@/lib/seo/stock-facts";
import { modeLabel, personCategory, sideLabel } from "@/lib/insider-display";
import { safeNumber, safeRupees } from "@/lib/safe-format";
import { sourceName } from "@/lib/news-source";

// ONE public page per stock (12 Nov 2026). /research/<symbol> and /signals/<symbol> stay for signed-in work and point here with a
// canonical tag and noindex. Public, anonymous, ISR: the page shows a subset that is the same for every visitor.
export const revalidate = 300;

const loadCompany = cache(async (symbol: string) => {
  try {
    // @auth-ok: public SEO snapshot, ISR-cached and crawlable; a visitor's token must never reach a shared cache entry.
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

function rangeHidden(data: ResearchDetail): boolean {
  const st = (data.price.corporate_action ?? data.corporate_action)?.status;
  return st === "unconfirmed" || st === "review";
}

const DELIVERY_SESSIONS = 20;
function deliveryWindow(data: ResearchDetail) {
  return [...(data.delivery_30d ?? [])]
    .filter((d) => Number.isFinite(d.delivery_pct))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-DELIVERY_SESSIONS);
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const normalizedSymbol = stockSymbolFromParam(symbol);
  if (!normalizedSymbol) return { title: "Stock not found", robots: { index: false, follow: false } };
  const data = await loadCompany(normalizedSymbol);
  if (!data) return { title: `${symbol.toUpperCase()} not found`, robots: { index: false, follow: false } };
  const title = pageTitle(data.company_name, data.symbol);
  const description = metaDescription({
    company: data.company_name,
    symbol: data.symbol,
    price: data.price.last_price,
    dayChangePct: data.price.day_change_pct,
    quarterEnd: data.fundamentals?.quarterly?.latest_quarter_end ?? null,
  });
  const ogImage = `/api/og?${new URLSearchParams({
    type: "stock",
    title: data.symbol,
    subtitle: data.company_name,
    stat: `₹${data.price.last_price.toLocaleString("en-IN")}`,
    statLabel: data.price.day_change_pct === null ? "Price history not comparable" : `${data.price.day_change_pct >= 0 ? "+" : ""}${data.price.day_change_pct}% on the day`,
    direction: data.price.day_change_pct === null || data.price.day_change_pct >= 0 ? "up" : "down",
  }).toString()}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: stockPath("/stocks", data.symbol) },
    openGraph: { title: `${data.company_name} (${data.symbol})`, description, type: "website", images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

/** Same-industry stocks with the nearest market value, for the peer links. Failure leaves the section out; it never fails the page. */
async function sectorPeers(data: ResearchDetail, marketCap: number | null): Promise<SignalRow[]> {
  if (!data.sector) return [];
  try {
    // @auth-ok: public identity list only (symbol, name), anonymous by design.
    const env = await getSignals({ industry: data.sector, size: 100, sort: "name", order: "asc" }, { revalidate: 3600 });
    const rows = env.data.filter((r) => r.symbol !== data.symbol);
    if (marketCap && marketCap > 0) {
      const dist = (r: SignalRow) => (r.market_cap && r.market_cap > 0 ? Math.abs(Math.log(r.market_cap / marketCap)) : 99);
      rows.sort((a, b) => dist(a) - dist(b));
    }
    return rows.slice(0, 8);
  } catch {
    return [];
  }
}

function Fact({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-faint">{label}</p>
      <p className="text-sm font-medium tabular-nums">{children}</p>
      {note && <p className="text-[11px] text-foreground-muted">{note}</p>}
    </div>
  );
}

const dateOf = (ymd: string) => formatDateIst(`${ymd.slice(0, 10)}T00:00:00Z`);

export default async function StockSnapshotPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const normalizedSymbol = stockSymbolFromParam(symbol);
  if (!normalizedSymbol) notFound();
  const data = await loadCompany(normalizedSymbol);
  if (!data) notFound();

  // The extra readings are anonymous reads of public data. A locked or failed read leaves that block out; nothing is guessed.
  const [detailR, volR] = await Promise.allSettled([
    getSignalDetail(data.symbol, 0, { revalidate: 300 }), // @auth-ok: public SEO page, anonymous
    getVolatility(data.symbol, { revalidate: 300 }), // @auth-ok: public SEO page, anonymous
  ]);
  const detail: SignalDetail | null =
    detailR.status === "fulfilled" && !detailR.value.data.locked && detailR.value.data.has_score !== false && detailR.value.data.signals ? detailR.value.data : null;
  const vol: VolatilityResponse | null = volR.status === "fulfilled" && !volR.value.data.locked && volR.value.data.available ? volR.value.data : null;
  const f = data.fundamentals;
  const peers = await sectorPeers(data, f?.identity?.market_cap ?? null);

  const sortedDelivery = deliveryWindow(data);
  const lastFive = sortedDelivery.slice(-5).reverse();
  const r52 = rangeHidden(data) ? null : resolve52Week(data.price.week52_high, data.price.week52_low, data.price.last_price);
  const q = f?.quarterly;
  const series = (q?.series_8q ?? []).slice(-8).reverse();
  const val = f?.valuation;
  const sh = f?.shareholding;
  const insider = (data.insider_trades ?? []).slice(0, 10);
  const deals = (data.bulk_block_deals ?? []).slice(0, 8);
  const concalls = (data.concall_transcripts ?? []).slice(0, 3);
  const news = (data.news ?? []).slice(0, 5);
  const priceLabel = formatPriceAsOf(data.price.data_as_of ?? null);
  const closeDate = data.price.data_as_of?.data_as_of?.slice(0, 10) ?? null;
  const readingsDate = detail?.date ?? (sortedDelivery.length ? sortedDelivery[sortedDelivery.length - 1].date : null);
  const resultsNote = q?.latest_quarter_end ? `Results to ${quarterDate(q.latest_quarter_end)}` : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Corporation",
    name: data.company_name,
    tickerSymbol: data.symbol,
    identifier: data.isin,
    url: `https://www.redixfi.com${stockPath("/stocks", data.symbol)}`,
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs crumbs={[{ name: "Home", href: "/" }, { name: "Screener", href: "/signals" }, { name: `${data.company_name} (${data.symbol})`, href: stockPath("/stocks", data.symbol) }]} />

      <p className="text-sm text-foreground-muted">
        {data.symbol} · {data.sector}
      </p>
      <h1 className="text-2xl font-semibold">{pageH1(data.company_name, data.symbol)}</h1>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-semibold">₹{data.price.last_price.toLocaleString("en-IN")}</span>
        <DeltaValue value={data.price.day_change_pct} kind="pct" />
      </div>
      <p className="mt-1 text-xs text-foreground-faint">{priceLabel}</p>
      <CorporateActionNote info={data.price.corporate_action ?? data.corporate_action} className="mt-1 text-xs text-foreground-muted" />

      <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
        {data.company_name} ({data.symbol}) is listed on the NSE{data.sector ? ` and grouped under ${data.sector}` : ""}.
        {r52 ? ` Over the past 52 weeks it traded between ₹${inr(r52.low)} and ₹${inr(r52.high)}.` : ""}
        {q?.latest_quarter_end ? ` Its latest reported quarter ended ${quarterDate(q.latest_quarter_end)}.` : ""}
      </p>

      <TrialCta className="mt-4" />

      <Section id="range" title="52-week range" note={closeDate ? `As of ${dateOf(closeDate)} close` : undefined}>
        {r52 ? (
          <Week52Range
            className="max-w-xs"
            week52={{ week52_high: data.price.week52_high, week52_low: data.price.week52_low, last_close: data.price.last_price, as_of: closeDate } as never}
            lastPrice={data.price.last_price}
          />
        ) : (
          <p className="text-sm text-foreground-muted">The 52-week range is not shown because a corporate action makes the price history not comparable.</p>
        )}
      </Section>

      <Section id="delivery" title="Delivery and volume" note={readingsDate ? `As of ${dateOf(readingsDate)} close` : undefined}>
        <div className="grid grid-cols-2 gap-2">
          {detail && detail.signals.delivery_series !== "BE" && typeof detail.signals.delivery_pct === "number" && (
            <Fact label="Delivery share" note={`20-day average ${pct(detail.signals.delivery_avg20)}`}>{pct(detail.signals.delivery_pct)}</Fact>
          )}
          {detail && typeof detail.signals.volume_ratio_5d === "number" && (
            <Fact label="Volume vs usual" note="average of the last 5 sessions against the prior 20">{`${detail.signals.volume_ratio_5d.toFixed(2)}×`}</Fact>
          )}
        </div>
        {sortedDelivery.length > 1 && (
          <div className="mt-3">
            <p className="mb-1 text-xs text-foreground-muted">Delivery % over the last {sortedDelivery.length} sessions</p>
            <div className="text-accent">
              <Sparkline values={sortedDelivery.map((d) => d.delivery_pct)} height={40} />
            </div>
            <div className="mt-2 max-w-xs">
              <DataTable caption="Delivery percentage, last 5 sessions" head={["Session", "Delivery %"]} rows={lastFive.map((d) => [dateOf(d.date), `${d.delivery_pct.toFixed(1)}%`])} />
            </div>
          </div>
        )}
        {!detail && sortedDelivery.length <= 1 && <p className="text-sm text-foreground-muted">Delivery and volume readings are not available for this stock yet.</p>}
      </Section>

      {vol && (
        <Section id="volatility" title="Volatility (past price movement)" note={vol.as_of ? `As of ${dateOf(vol.as_of)} close` : undefined}>
          <p className="text-sm text-foreground-muted">
            {vol.band_text ?? ""}
            {vol.vol_rank && vol.ranked_of ? ` Rank ${vol.vol_rank} of ${vol.ranked_of} ranked stocks (1 is the most volatile).` : ""}
          </p>
          <p className="mt-1 text-xs text-foreground-faint">Based on the 21 daily moves up to the date shown. Past price movement, not a forecast.</p>
        </Section>
      )}

      <Section id="results" title="Quarterly results" note={q?.latest_quarter_end ? `Latest quarter ended ${quarterDate(q.latest_quarter_end)}. Figures in ₹ crore as reported.` : undefined}>
        {series.length > 0 ? (
          <DataTable
            caption="Quarterly results, last eight quarters"
            head={["Quarter ended", "Revenue", "Net profit", "Margin %", "EPS ₹"]}
            rows={series.map((p) => [quarterDate(p.quarter_end), inr(p.revenue, 0), inr(p.pat, 0), pct(p.opm_pct), inr(p.eps)])}
          />
        ) : (
          <p className="text-sm text-foreground-muted">No quarterly results are stored for this stock.</p>
        )}
        {val && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Fact label="P/E (trailing 12 months)" note={resultsNote}>{val.pe_ttm == null ? "n/a" : inr(val.pe_ttm)}</Fact>
            <Fact label="Return on equity" note={resultsNote}>{val.roe_ttm == null ? "n/a" : pct(val.roe_ttm)}</Fact>
            <Fact label="Price to book" note={resultsNote}>{val.pb == null ? "n/a" : inr(val.pb)}</Fact>
            <Fact label="Debt to equity" note={resultsNote}>{val.debt_to_equity == null ? "n/a" : inr(val.debt_to_equity)}</Fact>
          </div>
        )}
        {sh?.latest_date && (
          <p className="mt-3 text-sm text-foreground-muted">
            Shareholding on {quarterDate(sh.latest_date)}: promoters {pct(sh.promoter_pct)}, foreign institutions {pct(sh.fii_pct)}, mutual funds {pct(sh.mf_pct)}.
          </p>
        )}
        {f?.events?.next_results_date && f.events.next_results_date.slice(0, 10) >= istToday() && <p className="mt-1 text-xs text-foreground-faint">Next results date announced: {quarterDate(f.events.next_results_date)}.</p>}
      </Section>

      <Section id="insider" title="Insider trade disclosures" note="Filed disclosures, shown by trade date. Category of the person and mode as filed; names are not shown.">
        {insider.length > 0 ? (
          <DataTable
            caption="Latest insider trade disclosures"
            head={["Trade date", "Category", "Direction", "Mode", "Shares", "Value ₹"]}
            rows={insider.map((t) => [t.trade_date ? dateOf(t.trade_date) : "n/a", personCategory(t), sideLabel(t.transaction_type), modeLabel(t as never), safeNumber(t.quantity), safeRupees(t.value_amount)])}
          />
        ) : (
          <p className="text-sm text-foreground-muted">No insider trade disclosures are stored for this stock.</p>
        )}
      </Section>

      <Section id="deals" title="Bulk and block deals" note="Daily totals across the deals reported for the stock.">
        {deals.length > 0 ? (
          <DataTable
            caption="Bulk and block deals"
            head={["Date", "Type", "Shares bought", "Shares sold", "Value ₹"]}
            rows={deals.map((d) => [
              typeof d.date === "string" ? dateOf(d.date) : "n/a",
              Array.isArray(d.deal_types_present) ? (d.deal_types_present as string[]).map((x) => String(x).toLowerCase()).join(" and ") : "n/a",
              safeNumber(d.buy_quantity as number | null),
              safeNumber(d.sell_quantity as number | null),
              safeRupees(d.total_value as number | null),
            ])}
          />
        ) : (
          <p className="text-sm text-foreground-muted">No bulk or block deals are stored for this stock.</p>
        )}
      </Section>

      <Section id="concall" title="Concall summaries" note="Summaries of the earnings transcripts the company has filed, with the source filing.">
        {concalls.length > 0 ? (
          <ul className="space-y-3">
            {concalls.map((c) => (
              <li key={c.filing_date + c.source_pdf_url} className="text-sm">
                <p className="text-xs text-foreground-faint">
                  Filed {dateOf(c.filing_date)} ·{" "}
                  <a href={c.source_pdf_url} target="_blank" rel="noopener noreferrer" className="underline">
                    source filing
                  </a>
                </p>
                <p className="mt-0.5 text-foreground-muted">{c.summary}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground-muted">No concall summary is stored for this stock.</p>
        )}
        {concalls.length > 0 && (
          <p className="mt-2 text-sm">
            <Link href={`${stockPath("/stocks", data.symbol)}/concall-summary`} className="font-medium text-accent hover:underline">
              Read the latest concall summary →
            </Link>
          </p>
        )}
      </Section>

      <Section id="news" title="Latest news">
        {news.length > 0 ? (
          <ul className="space-y-3">
            {news.map((n) => (
              <li key={n.uuid} className="text-sm">
                <p className="text-xs text-foreground-faint">
                  {sourceName(n.source)} · {dateOf(n.published_at)}
                </p>
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent">
                  {n.headline}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground-muted">No related news.</p>
        )}
      </Section>

      <Section id="related" title={`More on ${data.symbol}`}>
        <ul className="space-y-1 text-sm">
          <li>
            <Link href={`${stockPath("/stocks", data.symbol)}/rewind`} className="font-medium text-accent hover:underline">
              Market Rewind for {data.symbol}: past large moves and what followed
            </Link>
          </li>
          <li>
            <Link href="/weekly" className="text-accent hover:underline">
              Weekly market reviews
            </Link>
          </li>
        </ul>
        {peers.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-faint">Other {data.sector} stocks</p>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {peers.map((p) => (
                <li key={p.symbol}>
                  <Link href={stockPath("/stocks", p.symbol)} className="text-accent hover:underline" title={p.company_name}>
                    {p.symbol}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <StandardLineNote className="mt-8" />
      <FeedbackBox page="stock" className="mt-6" />
    </div>
  );
}
