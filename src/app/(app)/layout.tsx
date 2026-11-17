import { Sidebar, BottomNav } from "@/components/layout/Sidebar";
import { MarketRibbon } from "@/components/layout/MarketRibbon";
import { AiDockShell } from "@/components/layout/AiDockShell";
import { FooterDisclaimer } from "@/components/layout/FooterDisclaimer";
import { TrialStatusBar } from "@/components/layout/TrialStatusBar";
import { ChannelDiscoveryBanner } from "@/components/app/ChannelDiscoveryBanner";
import { InstallBanner } from "@/components/app/pwa/InstallBanner";

// 17 Nov 2026: this layout no longer fetches anything. It used to seed the header ribbon and the sidebar with the market overview on the server,
// and in Next.js a shared layout's fetch window is the floor for every page under it (the 14 Nov CPU finding). The header is now logo, search,
// Ask AI and the profile, and the market figures live on Home and Market Overview, which load them in the browser.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* md:ml-56 reserves the width Sidebar no longer occupies in-flow now
          that it's `md:fixed` (see Sidebar.tsx) — matches its `w-56`
          exactly so content starts right at the sidebar's edge, not under
          or away from it. No margin below md, where Sidebar is `hidden`
          and BottomNav (fixed, bottom) is the nav instead.
          `MarketRibbon` is still rendered HERE (unchanged) — `md:pt-16`
          reserves the vertical space it no longer occupies in-flow once it
          goes `md:fixed`, same pattern as `md:ml-56` does for the now-fixed
          Sidebar. 2026-08-16 mobile-overlap fix: this used to be a bare
          `pt-16` applied at every breakpoint, on the assumption the header
          is always exactly 64px tall — but below md the ribbon is now
          `relative` or `md:fixed` (see MarketRibbon.tsx's own comment) and
          can genuinely grow taller than 64px if its content wraps to 2
          lines on a narrow phone, so a fixed mobile padding would either
          under-reserve (overlap) or over-reserve (a dead gap) depending on
          how tall it actually rendered that load. `md:pt-16` reserves
          space ONLY once the ribbon is actually `fixed` (md+, where its
          height is reliably 64px) — below md it's in-flow, so it pushes
          this content down by however tall it actually is, no padding
          guess needed at all.
          Zoom/overlap fix (2026-08-18): "reliably 64px" turned out not to
          hold at every zoom level/font size — see MarketRibbon.tsx's
          ResizeObserver effect and globals.css's `--header-height`
          docstring. `md:pt-16` (a hardcoded guess) is now
          `md:pt-[var(--header-height)]`, which MarketRibbon keeps synced
          to its own real rendered height, so this reservation can never
          fall short of reality — the `md:` gate is unchanged, still only
          reserving space once the ribbon is actually fixed. */}
      {/* RedixFi AI chat UI session (2026-09-11) — the content column now
          lives inside AiDockShell, which adds `lg:mr-[400px]` while the
          panel is docked so desktop content reflows instead of being
          covered, and mounts the single responsive panel instance. */}
      <AiDockShell>
        <MarketRibbon />
        <TrialStatusBar />
        {/* Daily PUBLIC CHANNEL DISCOVERY notification — at most once/day,
            server-decided; renders nothing unless the API says it should
            show today. Not a header/footer/homepage promotion: it is the
            required in-app discovery notice and it only POINTS at the
            dedicated section inside Account → Alerts. */}
        <ChannelDiscoveryBanner />
        <InstallBanner />
        <main className="mb-14 flex-1 px-4 py-4 md:mb-0 md:px-6 md:py-6">{children}</main>
        <FooterDisclaimer />
      </AiDockShell>
      <BottomNav />
    </div>
  );
}
