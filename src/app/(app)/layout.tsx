import { Sidebar, BottomNav } from "@/components/layout/Sidebar";
import { MarketRibbon } from "@/components/layout/MarketRibbon";
import { FooterDisclaimer } from "@/components/layout/FooterDisclaimer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MarketRibbon />
        <main className="mb-14 flex-1 px-4 py-4 md:mb-0 md:px-6 md:py-6">{children}</main>
        <FooterDisclaimer />
      </div>
      <BottomNav />
    </div>
  );
}
