import { Sidebar, BottomNav } from "@/components/layout/Sidebar";
import { MarketRibbon } from "@/components/layout/MarketRibbon";
import { FooterDisclaimer } from "@/components/layout/FooterDisclaimer";
import { getMarketOverview } from "@/lib/api/endpoints";

// CLS fix (2026-08-08) — see MarketRibbon.tsx's own docstring for the
// full root-cause writeup (Lighthouse: 0.249 CLS, attributed to <main>
// shifting down as this ribbon grew from a client-fetch-only skeleton to
// its real content). @auth public — /market/overview never varies by
// tier (confirmed in an earlier session's audit), so a single anonymous
// server-side fetch is correct to seed every visitor's first paint with,
// logged-in or not; MarketRibbon's own client poll still refreshes with
// a real token's context for anything downstream that needs it (none of
// this ribbon's own content does).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let initialOverview = null;
  let initialFresh = true;
  let initialSignalsAsOf: string | null = null;
  try {
    // revalidate: 60 (matches MarketRibbon's own 60s client poll interval)
    // — NOT the default no-store. A no-store fetch anywhere inside a
    // shared layout forces EVERY route under it into fully dynamic
    // per-request rendering; confirmed by running the build both ways —
    // ~13 previously-static pages (/account/*, /news, /watchlist,
    // /more/*, /login, /track-record, /admin/promo-codes) flipped from ○
    // to ƒ with a bare no-store call here. A revalidating fetch keeps
    // ISR/static optimization intact for pages that don't otherwise need
    // dynamic rendering, while still refreshing this data at least once a
    // minute — this data was never meant to be request-fresh anyway (the
    // client poll below already re-fetches on the same cadence).
    const env = await getMarketOverview({ revalidate: 60 });
    initialOverview = env.data;
    initialFresh = env.meta.data_fresh;
    initialSignalsAsOf = env.meta.signals_as_of ?? null;
  } catch {
    // Backend hiccup at request time — MarketRibbon's own client-side
    // poll (unchanged) refreshes the data a moment later; same graceful-
    // degradation posture the component already had before this fix.
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar initialOverview={initialOverview} initialFresh={initialFresh} initialSignalsAsOf={initialSignalsAsOf} />
      {/* md:ml-56 reserves the width Sidebar no longer occupies in-flow now
          that it's `md:fixed` (see Sidebar.tsx) — matches its `w-56`
          exactly so content starts right at the sidebar's edge, not under
          or away from it. No margin below md, where Sidebar is `hidden`
          and BottomNav (fixed, bottom) is the nav instead. */}
      <div className="flex min-w-0 flex-1 flex-col md:ml-56">
        <MarketRibbon initialOverview={initialOverview} initialFresh={initialFresh} initialSignalsAsOf={initialSignalsAsOf} />
        <main className="mb-14 flex-1 px-4 py-4 md:mb-0 md:px-6 md:py-6">{children}</main>
        <FooterDisclaimer />
      </div>
      <BottomNav />
    </div>
  );
}
