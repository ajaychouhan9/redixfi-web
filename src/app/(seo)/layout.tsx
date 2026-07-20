import Link from "next/link";

export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6">
        <Link href="/" className="text-lg font-bold text-accent">
          RedixFi
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/signals" className="text-foreground-muted hover:text-foreground">
            Signal Dashboard
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
      <footer className="border-t border-border px-4 py-3 text-center text-[11px] text-foreground-faint sm:px-6">
        RedixFi provides measured market data and analytics only — not investment advice, recommendations, or
        predictions. We are not yet SEBI-registered as a Research Analyst.{" "}
        <Link href="/more/disclaimer" className="underline">
          Full disclaimer
        </Link>
      </footer>
    </div>
  );
}
