import type { MetadataRoute } from "next";
import { getSignals, getLatestBrief } from "@/lib/api/endpoints";
import { CANNED_SCREENS } from "@/data/canned-screens";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://redixfi.com";
const STOCK_CHUNK_SIZE = 500;

// Modular/chunked sitemap (2026-09-11, programmatic SEO task) — uses
// Next's built-in `generateSitemaps()` convention rather than hand-rolling
// XML: Next auto-serves each returned {id} as its own `/sitemap/[id].xml`
// route AND auto-generates the top-level `/sitemap.xml` INDEX file that
// references every chunk — exactly the "split into ~500-URL chunks with an
// index referencing all chunks" requirement, using the framework's own
// tested mechanism instead of a parallel hand-built one.
//
// id 0 carries every non-stock URL (static routes, screener pages, brief
// dates) — small and fixed. ids 1..N are stock chunks of
// STOCK_CHUNK_SIZE=500 symbols each, fetched by page directly from
// /signals rather than via getAllSignals (which pages through the ENTIRE
// universe up front) — each chunk fetches only its own slice, so
// generating chunk 3 doesn't require pulling chunks 1-2's data first.
export async function generateSitemaps() {
  let total = 0;
  try {
    // @auth-ok: sitemap generation, always anonymous — a crawler has no
    // identity to authenticate as. size:1 just to read page_info.total
    // cheaply, not to fetch rows.
    const first = await getSignals({ page: 1, size: 1 }, { revalidate: 3600 });
    total = first.page_info.total;
  } catch {
    // API unreachable — ship a single stock chunk (id 1) that will itself
    // fail soft to an empty chunk below, rather than crashing sitemap
    // generation entirely.
  }
  const stockChunks = Math.max(1, Math.ceil(total / STOCK_CHUNK_SIZE));
  return Array.from({ length: stockChunks + 1 }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  // Next's generated route wrapper (next-metadata-route-loader.js, the
  // `generateSitemaps` branch) actually invokes this handler with
  // `{ id: targetIdPromise }` — `id` arrives as a PROMISE at runtime, matching this app's async
  // `params` convention elsewhere, even though the declared type is a plain
  // `number`. Confirmed live: destructuring it directly and comparing
  // `id === 0` silently matched nothing (an un-awaited Promise is never
  // `=== 0`) and every chunk shipped empty. Await it explicitly.
  const chunkId = Number(await id);
  if (chunkId === 0) {
    const staticRoutes: MetadataRoute.Sitemap = [
      { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
      { url: `${SITE_URL}/signals`, changeFrequency: "hourly", priority: 0.9 },
      { url: `${SITE_URL}/intraday`, changeFrequency: "hourly", priority: 0.7 },
      { url: `${SITE_URL}/research`, changeFrequency: "daily", priority: 0.6 },
      { url: `${SITE_URL}/news`, changeFrequency: "hourly", priority: 0.6 },
      { url: `${SITE_URL}/pricing`, changeFrequency: "weekly", priority: 0.8 },
      { url: `${SITE_URL}/screens`, changeFrequency: "daily", priority: 0.7 },
      { url: `${SITE_URL}/market-brief`, changeFrequency: "daily", priority: 0.7 },
      { url: `${SITE_URL}/more/disclaimer`, changeFrequency: "monthly", priority: 0.3 },
      { url: `${SITE_URL}/more/data-sources`, changeFrequency: "monthly", priority: 0.3 },
    ];

    const screenRoutes: MetadataRoute.Sitemap = CANNED_SCREENS.map((s) => ({
      url: `${SITE_URL}/screens/${s.slug}`,
      changeFrequency: "daily",
      priority: 0.6,
    }));

    let briefRoutes: MetadataRoute.Sitemap = [];
    try {
      const brief = await getLatestBrief({ revalidate: 3600 });
      if (brief) {
        briefRoutes = [{ url: `${SITE_URL}/market-brief/${brief.date}`, changeFrequency: "yearly", priority: 0.4 }];
      }
    } catch {
      // no brief yet
    }

    return [...staticRoutes, ...screenRoutes, ...briefRoutes];
  }

  const page = chunkId; // id 1 -> page 1 (symbols 1-500), id 2 -> page 2, etc.
  try {
    // @auth-ok: sitemap generation, always anonymous — see module docstring.
    const env = await getSignals({ page, size: STOCK_CHUNK_SIZE, sort: "name", order: "asc" }, { revalidate: 3600 });
    return env.data.map((s) => ({
      url: `${SITE_URL}/stocks/${s.symbol}`,
      changeFrequency: "daily",
      priority: 0.5,
    }));
  } catch {
    // API unreachable at build/request time — ship this chunk empty rather
    // than fail the whole sitemap index.
    return [];
  }
}
