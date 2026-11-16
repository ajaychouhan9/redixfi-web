"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Home page order (16 Nov 2026). The page is rendered on the server for an anonymous visitor and cached; it cannot know who is
 * looking. Every section is still rendered once by the server (the props below are server-rendered nodes), so there is no new
 * fetch and the HTML stays cacheable. This component only decides the ORDER:
 *   - logged-out (and the server-rendered HTML, which is always anonymous): hero, price movers, the Ask RedixFi sample answer,
 *     the sample-report banner, pricing, then everything else as before;
 *   - logged-in (known only in the browser, once the stored token resolves): the order from 2 Nov 2026, unchanged.
 * The hero, the Ask sample and the pricing section hide themselves for a logged-in user as before, so a signed-in visitor sees
 * exactly the previous page.
 */
export function HomeSections({
  hero,
  priceMovers,
  askSample,
  sampleReport,
  pricing,
  marketStatus,
  yourStocks,
  brief,
  pulse,
  newsAndIntraday,
  marketActivity,
  shortcuts,
  governanceRadar,
  smallCap,
}: Record<
  | "hero"
  | "priceMovers"
  | "askSample"
  | "sampleReport"
  | "pricing"
  | "marketStatus"
  | "yourStocks"
  | "brief"
  | "pulse"
  | "newsAndIntraday"
  | "marketActivity"
  | "shortcuts"
  | "governanceRadar"
  | "smallCap",
  ReactNode
>) {
  const { user } = useAuth();
  if (user) {
    return (
      <>
        {hero}
        {marketStatus}
        {priceMovers}
        {yourStocks}
        {brief}
        {pulse}
        {newsAndIntraday}
        {marketActivity}
        {sampleReport}
        {shortcuts}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {governanceRadar}
          {askSample}
        </div>
        {smallCap}
        {pricing}
      </>
    );
  }
  return (
    <>
      {hero}
      {priceMovers}
      {askSample}
      {sampleReport}
      {pricing}
      {marketStatus}
      {yourStocks}
      {brief}
      {pulse}
      {newsAndIntraday}
      {marketActivity}
      {shortcuts}
      {governanceRadar}
      {smallCap}
    </>
  );
}
