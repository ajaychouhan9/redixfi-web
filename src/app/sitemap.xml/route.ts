import { getSevenDayReview, getSignals } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { unstable_cache } from "next/cache";
import { CANNED_SCREENS } from "@/data/canned-screens";
import { FUNDAMENTAL_SCREENS } from "@/data/fundamental-screens";

// The stock universe comes from the public signals list. A build must not
// depend on twelve live API pages, and a failed page must never yield a
// seemingly complete but truncated stock sitemap.
export const dynamic = "force-dynamic";

const SITE_URL = "https://www.redixfi.com";
const XML_CONTENT_TYPE = "application/xml; charset=utf-8";
const PAGE_SIZE = 200;
const PAGE_CONCURRENCY = 2;
const TRANSIENT_STATUSES = new Set([502, 503, 504]);

// Only pages a search engine may index. Pages that carry a noindex tag or a canonical to another page (/research/<symbol>,
// /signals/<symbol>, filtered addresses, account pages) are never listed.
const PUBLIC_CORE_ROUTES = [
  "/",
  "/signals",
  "/signals/7-day-review",
  "/weekly",
  "/intraday",
  "/research",
  "/screens",
  "/market-activity",
  "/more/about-us",
  "/more/disclaimer",
  "/more/terms",
  "/more/privacy",
  "/more/refund-policy",
  "/more/data-sources",
  "/news",
  "/pricing",
  "/how-it-works",
  "/sample-report",
  "/rewind",
  "/volatility",
] as const;

// Pages whose content is rebuilt from the latest completed session: their lastmod is that session's date. Static pages carry no lastmod
// (a date we did not measure would be made up).
const SESSION_ROUTES = new Set<string>(["/signals", "/signals/7-day-review", "/weekly", "/intraday", "/rewind", "/volatility", "/screens"]);

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function isCanonicalPublicSymbol(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const symbol = value.trim().toUpperCase();

  // symbols_master is the source of truth. This defensive check excludes raw
  // numeric BSE scrip codes while retaining valid NSE symbols such as 360ONE
  // and 3MINDIA.
  return /^[A-Z0-9][A-Z0-9&._-]*$/.test(symbol) && /[A-Z]/.test(symbol);
}

function validDay(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function loc(url: string, lastmod?: string | null): string {
  return `<url><loc>${escapeXml(url)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
}

async function signalPage(page: number) {
  // @auth-ok: public sitemap identity list only; never use visitor-specific data.
  const fetchPage = () => getSignals(
    { page, size: PAGE_SIZE, sort: "name", order: "asc" },
    { timeoutMs: 35_000 },
  );
  try {
    return await fetchPage();
  } catch (error) {
    const transientStatus = error instanceof ApiError && TRANSIENT_STATUSES.has(error.status);
    const timedOut = error !== null && typeof error === "object" &&
      "name" in error && error.name === "TimeoutError";
    if (!transientStatus && !timedOut) throw error;
    await new Promise((resolve) => setTimeout(resolve, 200));
    return fetchPage();
  }
}

interface SitemapData {
  /** One entry per stock: its symbol, the date of its latest stored session, and whether its Rewind page is indexable. */
  stocks: { symbol: string; lastmod: string | null; rewind: boolean }[];
  /** The latest completed session, used as lastmod of the pages rebuilt from it. */
  session: string | null;
  /** The API supports the reported-figure filters, so the preset screens are real. Without it they are not listed. */
  presets: boolean;
  /** Stored weeks of the 7-Day Review (week-end dates). */
  weeks: string[];
}

async function completeSitemapData(): Promise<SitemapData> {
  const first = await signalPage(1);
  const total = first.page_info?.total;
  if (!Number.isSafeInteger(total) || total <= 0) throw new Error("Invalid signals pagination total");
  const pages = Math.ceil(total / PAGE_SIZE);
  const responses = [first];
  // Limit concurrent list requests; the old all-at-once fanout could load
  // the API heavily and fail any page without preserving a usable response.
  for (let start = 2; start <= pages; start += PAGE_CONCURRENCY) {
    responses.push(...await Promise.all(
      Array.from({ length: Math.min(PAGE_CONCURRENCY, pages - start + 1) }, (_, i) => signalPage(start + i)),
    ));
  }
  const rows = responses.flatMap((response, index) => {
    const expectedSize = Math.min(PAGE_SIZE, total - index * PAGE_SIZE);
    if (response.page_info?.page !== index + 1 ||
        response.page_info?.total !== total ||
        !Array.isArray(response.data) || response.data.length !== expectedSize) {
      throw new Error("Incomplete signals pagination");
    }
    return response.data;
  });
  // A malformed symbol is left out on its own; it never empties the stock list.
  const good = rows.filter((row) => isCanonicalPublicSymbol(row?.symbol));
  if (good.length !== total) console.warn(`[sitemap] Skipped ${total - good.length} malformed stock symbol(s).`);
  const seen = new Set<string>();
  const stocks = good.map((row) => {
    const symbol = row.symbol.trim().toUpperCase();
    if (seen.has(symbol)) throw new Error("Duplicate stock symbol in signals pagination");
    seen.add(symbol);
    // A stock has a Rewind page when it has a 52-week figure, which needs a full year of its own sessions (the same rule the page uses).
    return { symbol, lastmod: validDay(row.date), rewind: typeof row.pct_below_52w_high === "number" };
  }).sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));
  const session = stocks.map((s) => s.lastmod).filter((d): d is string => !!d).sort().pop() ?? null;
  const presets = !!first.page_info?.fundamentals_coverage;
  // @auth-ok: public archive list, anonymous by design.
  const review = await getSevenDayReview(undefined, { timeoutMs: 20_000 });
  const weeks = (review.data.weeks ?? []).map((w) => w.as_of).filter((d): d is string => !!validDay(d)).sort().reverse();
  return { stocks, session, presets, weeks };
}

// Cache only a completely validated stock universe. An exception cannot
// replace it with an incomplete page range or the core-route fallback.
const cachedSitemapData = unstable_cache(completeSitemapData, ["sitemap-data-v3"], {
  revalidate: 3600,
});

export async function GET() {
  // @auth-ok: sitemap generation is anonymous by design so search crawlers
  // can discover the same public universe without a visitor token.
  let data: SitemapData = { stocks: [], session: null, presets: false, weeks: [] };
  let complete = false;
  try {
    data = await cachedSitemapData();
    complete = true;
  } catch (error) {
    const reason = error instanceof ApiError ? `HTTP ${error.status}` :
      error instanceof Error ? error.message : "unknown error";
    console.warn(`[sitemap] Stock universe unavailable (${reason}); serving core URLs only.`);
  }

  const entries: string[] = [
    ...PUBLIC_CORE_ROUTES.map((route) => loc(`${SITE_URL}${route}`, SESSION_ROUTES.has(route) ? data.session : null)),
    // The canned screens are a fixed list in this codebase, so they never depend on the API.
    ...CANNED_SCREENS.map((screen) => loc(`${SITE_URL}/screens/${encodeURIComponent(screen.slug)}`, data.session)),
    // The reported-figure screens exist only when the API can run their filters.
    ...(data.presets ? FUNDAMENTAL_SCREENS.map((screen) => loc(`${SITE_URL}/screens/${encodeURIComponent(screen.slug)}`, data.session)) : []),
    ...data.stocks.map((s) => loc(`${SITE_URL}/stocks/${encodeURIComponent(s.symbol)}`, s.lastmod)),
    ...data.stocks.filter((s) => s.rewind).map((s) => loc(`${SITE_URL}/stocks/${encodeURIComponent(s.symbol)}/rewind`, s.lastmod)),
    // A stored week does not change after it is built: its lastmod is its own week-end date.
    ...data.weeks.map((d) => loc(`${SITE_URL}/weekly/${d}`, d)),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": XML_CONTENT_TYPE,
      "Cache-Control": complete
        ? "public, s-maxage=3600, stale-while-revalidate=86400"
        : "no-store",
    },
  });
}
