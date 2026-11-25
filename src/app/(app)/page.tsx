import type { Metadata } from "next";

import { HeroStockSearch } from "@/components/app/HeroStockSearch";
import { HomeBoxes } from "@/components/app/home/HomeBoxes";
import { HomeMarketStrip } from "@/components/app/home/HomeMarketStrip";
import { HomeBrief } from "@/components/app/home/HomeBrief";
import { HomeMovers } from "@/components/app/home/HomeMovers";
import { HomeTrialLine } from "@/components/app/home/HomeTrialLine";

// The page makes no request of its own; a refresh window keeps the cached copy from outliving a deploy (a fully static page is sent with a one-year cache lifetime).
export const revalidate = 300;

export const metadata: Metadata = { alternates: { canonical: "/" } };

/**
 * Home (17 Nov 2026), the same page for everyone: search box, AI brief, five boxes, a movers preview and a small trial line.
 * It makes NO request on the server: the brief and the movers load in the browser after the page opens, so the page is a static,
 * cached file. (It used to make nine server requests and show many cards; those moved to Market Overview and the account menu.)
 */
export default function HomePage() {
  return (
    <div className="@container mx-auto w-full min-w-0 max-w-4xl space-y-5">
      <section aria-labelledby="home-title" data-testid="home-search">
        <h1 id="home-title" className="max-w-2xl text-[22px] font-bold leading-tight sm:text-3xl" data-testid="hero-headline">
          Understand any NSE stock in 5 minutes
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-snug text-foreground-muted" data-testid="hero-subline">
          Plain-language data for 2,000+ NSE stocks. No buy or sell advice.
        </p>
        <HeroStockSearch />
      </section>
      <HomeMarketStrip />
      <HomeMovers />
      <HomeBrief />
      <HomeBoxes />
      <HomeTrialLine />
    </div>
  );
}
