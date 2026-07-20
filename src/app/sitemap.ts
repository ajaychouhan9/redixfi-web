import type { MetadataRoute } from "next";
import { getAllSignals, getLatestBrief } from "@/lib/api/endpoints";
import { CANNED_SCREENS } from "@/data/canned-screens";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://redixfi.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  let stockRoutes: MetadataRoute.Sitemap = [];
  try {
    const signals = await getAllSignals({ revalidate: 3600 });
    stockRoutes = signals.map((s) => ({
      url: `${SITE_URL}/stocks/${s.symbol}`,
      changeFrequency: "daily",
      priority: 0.5,
    }));
  } catch {
    // API unreachable at build/request time — ship the sitemap without
    // stock pages rather than fail the whole route.
  }

  let briefRoutes: MetadataRoute.Sitemap = [];
  try {
    const brief = await getLatestBrief({ revalidate: 3600 });
    if (brief) {
      briefRoutes = [{ url: `${SITE_URL}/market-brief/${brief.date}`, changeFrequency: "yearly", priority: 0.4 }];
    }
  } catch {
    // no brief yet
  }

  return [...staticRoutes, ...screenRoutes, ...stockRoutes, ...briefRoutes];
}
