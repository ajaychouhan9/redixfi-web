import type { Metadata } from "next";
import Link from "next/link";
import { CANNED_SCREENS } from "@/data/canned-screens";

export const metadata: Metadata = {
  title: "Stock Screens",
  description: "Run measurable, factual stock screens across NSE/BSE — high delivery, signal score movers, event risk and volume — no login required.",
};

export default function ScreensIndexPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold">Stock screens</h1>
      <p className="mb-4 text-sm text-foreground-muted">
        Measurable, run-it-yourself screens over today&apos;s data. Free to run, capped at 10 results — sign up for
        the full universe.
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {CANNED_SCREENS.map((s) => (
          <li key={s.slug}>
            <Link href={`/screens/${s.slug}`} className="block px-4 py-3 hover:bg-neutral-bg">
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-foreground-muted">{s.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
