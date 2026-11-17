import { StockSignupOffer } from "@/components/app/StockSignupOffer";
import { StockTabs } from "@/components/app/stock/StockTabs";
import { StockActions } from "@/components/app/stock/StockActions";
import { RewindTab } from "@/components/app/stock/RewindTab";
import { AskAiTab } from "@/components/app/stock/AskAiTab";
import { LazyPriceChart } from "@/components/app/stock/LazyPriceChart";
import { SimpleChecklist } from "@/components/app/stock/SimpleChecklist";
import { AnnualReportSummaryCard } from "@/components/app/research/AnnualReportSummaryCard";
import { RedFlagSection } from "@/components/app/research/RedFlagSection";
import { CurrentSymbolSync } from "@/components/app/CurrentSymbolSync";
import { RecordView } from "@/components/app/RecordView";
import { isTradeForTrade } from "@/lib/stock-clarity";
import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResearch, getSignalDetail, getSignals, getVolatility } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { Sparkline } from "@/components/ui/Sparkline";
import { formatDateSafe, formatPriceAsOf, istToday } from "@/lib/format";
import { Week52Range } from "@/components/app/signals/Week52Range";
import { resolve52Week } from "@/lib/week52";
import { stockPath, stockSymbolFromParam } from "@/lib/seo/stock-symbol";
import { CorporateActionNote } from "@/components/ui/CorporateActionNote";
import type { ResearchDetail, SignalDetail, SignalRow, VolatilityResponse } from "@/lib/api/types";
import { retryTransientPublicGet } from "@/lib/api/retry-public-upstream";
import { FeedbackBox } from "@/components/app/FeedbackBox";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DataTable, Section } from "@/components/seo/DataTable";
import { inr, isNeutralText, metaDescription, neutralSentences, pageH1, pageTitle, pct, quarterDate } from "@/lib/seo/stock-facts";
import { modeLabel, personCategory, sideLabel } from "@/lib/insider-display";
import { safeNumber, safeRupees } from "@/lib/safe-format";
import { sourceName } from "@/lib/news-source";
import { coverageLine } from "@/lib/seo/data-coverage";

// ONE page per stock for everyone (17 Nov 2026): the public page and the signed-in /signals/<symbol> and /research/<symbol> pages are merged here
// (those addresses, and /stocks/<symbol>/rewind and /concall-summary, redirect permanently). Public, anonymous, ISR: the page is the same
// HTML for every visitor. Who is looking is decided in the browser (the personal buttons, the sign-up offers); the tabs mount lazily.
export const revalidate = 21600; // 6 h: stock data changes once a day (cut CPU, 14 Nov 2026)
// Without generateStaticParams a dynamic route is rendered on EVERY request and `revalidate` is ignored (found 14 Nov 2026: no-store, no ISR).
// Returning [] builds nothing up front and turns on cached on-demand pages (ISR).
export function generateStaticParams() { return []; }

const loadCompany = cache(async (symbol: string) => {
  try {
    // @auth-ok: public SEO snapshot, ISR-cached and crawlable; a visitor's token must never reach a shared cache entry.
    const env = await retryTransientPublicGet(
      () => getResearch(symbol, { revalidate: 21600 }),
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
    const env = await getSignals({ industry: data.sector, size: 100, sort: "name", order: "asc" }, { revalidate: 21600 });
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

const dateOf = (ymd: string) => formatDateSafe(`${ymd.slice(0, 10)}T00:00:00Z`);

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const normalizedSymbol = stockSymbolFromParam(symbol);
  if (!normalizedSymbol) notFound();
  const data = await loadCompany(normalizedSymbol);
  if (!data) notFound();

  // The extra readings are anonymous reads of public data. A locked or failed read leaves that block out; nothing is guessed.
  const [detailR, volR] = await Promise.allSettled([
    getSignalDetail(data.symbol, 0, { revalidate: 21600 }), // @auth-ok: public page, anonymous
    getVolatility(data.symbol, { revalidate: 21600 }), // @auth-ok: public page, anonymous
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
  const concalls = (data.concall_transcripts ?? []).map((c) => ({ ...c, summary: neutralSentences(c.summary) })).filter((c) => c.summary).slice(0, 4);
  const news = (data.news ?? []).filter((n) => isNeutralText(n.headline)).slice(0, 8);
  const priceLabel = formatPriceAsOf(data.price.data_as_of ?? null);
  const closeDate = data.price.data_as_of?.data_as_of?.slice(0, 10) ?? null;
  const readingsDate = detail?.date ?? (sortedDelivery.length ? sortedDelivery[sortedDelivery.length - 1].date : null);
  const resultsNote = q?.latest_quarter_end ? `Results to ${quarterDate(q.latest_quarter_end)}` : undefined;
  // "Partial reading" only when an input of the delivery and volume reading is really missing (the API says so), never as a habit.
  const partial = !!detail?.partial && !detail.limited_data && !isTradeForTrade(detail.signals?.delivery_series);
  const sym = data.symbol;
  const week52 = { week52_high: data.price.week52_high, week52_low: data.price.week52_low, last_close: data.price.last_price, as_of: closeDate } as never;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Corporation",
    name: data.company_name,
    tickerSymbol: data.symbol,
    identifier: data.isin,
    url: `https://www.redixfi.com${stockPath("/stocks", data.symbol)}`,
  };

  // ---- Overview: the seven plain questions, then the price and trading readings they point to
  const overview = (
    <>
      <SimpleChecklist data={data} today={istToday()} priceLabel={priceLabel} />
      <StockSignupOffer companyName={data.company_name} className="mt-4" />

      <Section id="range" title="52-week range" note={closeDate ? `As of ${dateOf(closeDate)} close` : undefined}>
        {r52 ? (
          <Week52Range className="max-w-xs" week52={week52} lastPrice={data.price.last_price} />
        ) : (
          <p className="text-sm text-foreground-muted">The 52-week range is not shown because a corporate action makes the price history not comparable.</p>
        )}
        <div className="mt-3">
          <LazyPriceChart symbol={sym} high52={r52?.high ?? null} low52={r52?.low ?? null} />
        </div>
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

      {data.industry_comparison && data.industry_comparison.rows.some((r) => r.value !== null) && (
        <Section
          id="industry-median"
          title="Against the industry median"
          note={`Industry: ${data.industry_comparison.industry ?? "not on record"}${data.industry_comparison.n_stocks ? ` (${data.industry_comparison.n_stocks} stocks)` : ""}. Medians use each company's latest reported quarter${data.industry_comparison.as_of ? `, up to the quarter ended ${quarterDate(data.industry_comparison.as_of)}` : ""}. This is a comparison of reported figures, not a rating.`}
        >
          <ul className="space-y-2 text-sm" data-testid="industry-median">
            {data.industry_comparison.rows.filter((r) => r.value !== null).map((r) => (
              <li key={r.key}>{r.text}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-foreground-faint">
            &ldquo;Above&rdquo; and &ldquo;below&rdquo; only say where the figure sits against the median of the stocks that have it. An industry needs at least {data.industry_comparison.min_stocks} stocks with the figure to show a median.
          </p>
        </Section>
      )}

      <Section id="related" title={`More on ${sym}`}>
        <ul className="space-y-1 text-sm">
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
    </>
  );

  // ---- Annual report: the filed summary, then the reported results
  const annualReport = (
    <>
      {data.annual_report_summary ? (
        <div className="mt-5">
          <AnnualReportSummaryCard data={data.annual_report_summary} />
        </div>
      ) : (
        <Section id="annual-report-summary" title="Annual report summary">
          <p className="text-sm text-foreground-muted">No annual report summary is stored for this stock yet.</p>
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
        {f?.fallback_source && f.fallback_source.fields.length > 0 && (
          <p className="mt-2 text-xs text-foreground-faint">
            Where the main data source had no value, {f.fallback_source.fields.length} {f.fallback_source.fields.length === 1 ? "figure comes" : "figures come"} from {f.fallback_source.source}.
          </p>
        )}
        {f?.events?.next_results_date && f.events.next_results_date.slice(0, 10) >= istToday() && <p className="mt-1 text-xs text-foreground-faint">Next results date announced: {quarterDate(f.events.next_results_date)}.</p>}
        <p className="mt-2 text-xs text-foreground-faint" data-testid="data-coverage">
          {coverageLine(f)} <Link href="/more/data-sources" className="underline">What &ldquo;not available&rdquo; means</Link>
        </p>
      </Section>
    </>
  );

  const concallPanel = (
    <Section id="concall-summaries" title="Concall summaries" note="Summaries of the earnings transcripts the company has filed, with the source filing.">
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
    </Section>
  );

  const pointsPanel = (
    <div className="mt-5">
      <RedFlagSection data={data.red_flags} />
    </div>
  );

  const newsPanel = (
    <Section id="latest-news" title="Latest news">
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
  );

  const pledges = (data.pledge_history ?? []).slice(0, 4);
  const insidersPanel = (
    <>
      <Section id="promoters" title="Promoters" note={sh?.latest_date ? `Shareholding on ${quarterDate(sh.latest_date)}` : undefined}>
        {sh?.latest_date ? (
          <p className="text-sm text-foreground-muted">
            Promoters {pct(sh.promoter_pct)}, foreign institutions {pct(sh.fii_pct)}, mutual funds {pct(sh.mf_pct)}.
          </p>
        ) : (
          <p className="text-sm text-foreground-muted">No shareholding is stored for this stock.</p>
        )}
        {pledges.length > 0 ? (
          <div className="mt-2 max-w-sm">
            <DataTable
              caption="Promoter pledge by quarter"
              head={["Quarter", "Pledged %", "As of"]}
              rows={pledges.map((p) => [p.quarter, typeof p.pledged_pct === "number" ? `${p.pledged_pct}%` : "n/a", p.as_of_date ? dateOf(p.as_of_date) : "n/a"])}
            />
            <p className="mt-1 text-xs text-foreground-faint">Pledged shares are promoter shares given as security for a loan.</p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-foreground-muted">No promoter pledge is recorded for this stock.</p>
        )}
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
    </>
  );

  return (
    <div className="mx-auto max-w-4xl">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CurrentSymbolSync symbol={sym} />
      <RecordView symbol={sym} companyName={data.company_name} />
      <Breadcrumbs crumbs={[{ name: "Home", href: "/" }, { name: "Screener", href: "/signals" }, { name: `${data.company_name} (${data.symbol})`, href: stockPath("/stocks", data.symbol) }]} />

      {partial && (
        <div className="mb-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-foreground-muted" data-testid="partial-reading">
          <span className="font-medium text-foreground">Partial reading.</span> Some inputs were not available for this session; the reading is built from what was measured.
        </div>
      )}

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
      {r52 && <Week52Range className="mt-2 max-w-xs" week52={week52} lastPrice={data.price.last_price} />}
      <div className="mt-3">
        <StockActions symbol={sym} companyName={data.company_name} />
      </div>

      <StockTabs
        panels={{
          overview,
          "annual-report": annualReport,
          concall: concallPanel,
          "points-to-watch": pointsPanel,
          news: newsPanel,
          insiders: insidersPanel,
          rewind: <RewindTab symbol={sym} />,
          "ask-ai": <AskAiTab symbol={sym} company={data.company_name} />,
        }}
      />

      <StockSignupOffer companyName={data.company_name} className="mt-6" />
      <FeedbackBox page="stock" className="mt-6" />
    </div>
  );
}
