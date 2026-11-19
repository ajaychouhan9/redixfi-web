import type { Metadata } from "next";

import { HeroStockSearch } from "@/components/app/HeroStockSearch";
import { HomeBoxes } from "@/components/app/home/HomeBoxes";
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
        <h1 id="home-title" className="max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl" data-testid="hero-headline">
          Check any NSE stock in minutes: delivery, insider trades, points to watch and concall summaries.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground-muted sm:text-[15px]" data-testid="hero-subline">
          Plain-language data for 2,000+ NSE stocks, updated daily. No buy or sell advice.
        </p>
        <HeroStockSearch />
      </section>
      <HomeBrief />
      <HomeBoxes />
      <HomeMovers />
      <HomeTrialLine />
    </div>
  );
}
