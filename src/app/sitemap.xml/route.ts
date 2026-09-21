import { getAllSignals } from "@/lib/api/endpoints";

const SITE_URL = "https://www.redixfi.com";
const XML_CONTENT_TYPE = "application/xml; charset=utf-8";

const PUBLIC_CORE_ROUTES = [
  "/",
  "/signals",
  "/intraday",
  "/research",
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

export async function GET() {
  // @auth-ok: sitemap generation is anonymous by design so search crawlers
  // can discover the same public universe without a visitor token.
  const signals = await getAllSignals({ revalidate: 3600 });
  const stockSymbols = Array.from(
    new Set(
      signals
        .map((row) => row.symbol)
        .filter(isCanonicalPublicSymbol)
        .map((symbol) => symbol.toUpperCase()),
    ),
  ).sort();

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
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
