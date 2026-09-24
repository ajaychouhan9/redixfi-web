import { getSignals } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { unstable_cache } from "next/cache";

// The stock universe comes from the public signals list. A build must not
// depend on twelve live API pages, and a failed page must never yield a
// seemingly complete but truncated stock sitemap.
export const dynamic = "force-dynamic";

const SITE_URL = "https://www.redixfi.com";
const XML_CONTENT_TYPE = "application/xml; charset=utf-8";
const PAGE_SIZE = 200;
const PAGE_CONCURRENCY = 2;
const TRANSIENT_STATUSES = new Set([502, 503, 504]);

const PUBLIC_CORE_ROUTES = [
  "/",
  "/signals",
  "/intraday",
  "/research",
  "/screens",
  "/market-activity",
  "/more/about-us",
  "/more/disclaimer",
  "/more/data-sources",
  "/news",
  "/pricing",
] as const;

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

function loc(url: string): string {
  return `<url><loc>${escapeXml(url)}</loc></url>`;
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

async function completeStockSymbols(): Promise<string[]> {
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
  const symbols = rows.map((row) => row?.symbol);
  if (symbols.some((symbol) => !isCanonicalPublicSymbol(symbol))) {
    throw new Error("Invalid stock symbol in signals pagination");
  }
  const unique = new Set(symbols.map((symbol) => symbol.trim().toUpperCase()));
  if (unique.size !== total) throw new Error("Duplicate stock symbol in signals pagination");
  return [...unique].sort();
}

// Cache only a completely validated stock universe. An exception cannot
// replace it with an incomplete page range or the 11-route fallback.
const cachedStockSymbols = unstable_cache(completeStockSymbols, ["sitemap-stock-symbols-v1"], {
  revalidate: 3600,
});

export async function GET() {
  // @auth-ok: sitemap generation is anonymous by design so search crawlers
  // can discover the same public universe without a visitor token.
  let stockSymbols: string[] = [];
  let complete = false;
  try {
    stockSymbols = await cachedStockSymbols();
    complete = true;
  } catch (error) {
    const reason = error instanceof ApiError ? `HTTP ${error.status}` :
      error instanceof Error ? error.message : "unknown error";
    console.warn(`[sitemap] Stock universe unavailable (${reason}); serving core URLs only.`);
  }

  const urls = [
    ...PUBLIC_CORE_ROUTES.map((route) => `${SITE_URL}${route}`),
    ...stockSymbols.map((symbol) => `${SITE_URL}/stocks/${encodeURIComponent(symbol)}`),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(loc),
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
