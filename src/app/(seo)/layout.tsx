import { FooterDisclaimer } from "@/components/layout/FooterDisclaimer";
import Link from "next/link";
import { RedixFiLogo } from "@/components/brand/RedixFiLogo";

export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between gap-2 border-b border-border px-4 sm:px-6">
        <Link href="/">
          <RedixFiLogo variant="compact" />
        </Link>
        <nav className="flex items-center gap-3 text-sm sm:gap-4">
          <Link href="/signals" className="text-foreground-muted hover:text-foreground">
            Screener
          </Link>
          <Link href="/screens" className="hidden text-foreground-muted hover:text-foreground sm:inline">
            Stock Screens
          </Link>
          <Link href="/pricing" className="text-foreground-muted hover:text-foreground">
            Pricing
          </Link>
          <Link href="/login" className="rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-foreground">
            Log in
          </Link>
        </nav>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      <FooterDisclaimer />
    </div>
  );
}
