import { generateSitemaps } from "../sitemap";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://redixfi.com";

// Hand-built sitemap INDEX (2026-09-11, programmatic SEO task).
//
// Next's own `generateSitemaps()` convention (used in ../sitemap.ts) auto-
// serves each chunk at `/sitemap/[id].xml` — confirmed working, real XML,
// real URLs. What it does NOT reliably serve in this Next version is a
// literal aggregated `/sitemap.xml` index (confirmed 404 in dev; the
// framework expects crawlers to discover chunks via multiple `Sitemap:`
// lines in robots.txt instead). The task explicitly asked for "a sitemap
// index file referencing all chunks", so this route builds one directly —
// it re-uses the SAME `generateSitemaps()` chunk-id source of truth
// (no separate chunk-count logic to drift out of sync), just renders it
// as a `<sitemapindex>` instead of leaving chunk discovery to robots.txt
// alone. robots.ts points its `sitemap` field here.
export async function GET() {
  const chunks = await generateSitemaps();
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    chunks.map((c) => `<sitemap><loc>${SITE_URL}/sitemap/${c.id}.xml</loc></sitemap>`).join("\n") +
    `\n</sitemapindex>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
