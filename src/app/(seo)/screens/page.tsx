import type { Metadata } from "next";
import Link from "next/link";
import { CANNED_SCREENS } from "@/data/canned-screens";
import { FUNDAMENTAL_SCREENS, FILTERS_NOTE } from "@/data/fundamental-screens";
import { getSignals } from "@/lib/api/endpoints";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Stock Screens",
  alternates: { canonical: "/screens" },
  description: "Run measurable, factual stock screens across NSE/BSE — high delivery, volume against its usual level, distance from the 52-week high and news in the last 5 days — no login required.",
};

export default async function ScreensIndexPage() {
  // The reported-figure screens are listed only when the API can run their filters.
  // @auth-ok: public SEO page, anonymous by design.
  const presetsLive = await getSignals({ size: 1 }, { revalidate: 600 }).then((r) => !!r.page_info.fundamentals_coverage).catch(() => false);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold">Stock screens</h1>
      <p className="mb-4 text-sm text-foreground-muted">
        Measurable, run-it-yourself screens over today&apos;s data. Free to run, capped at 10 results — sign up for
        the full universe.
      </p>
      {presetsLive && (
        <>
          <h2 className="mb-1 text-base font-semibold">Screens on reported data</h2>
          <p className="mb-2 text-xs text-foreground-muted">{FILTERS_NOTE}</p>
          <ul className="mb-6 divide-y divide-border rounded-xl border border-border">
            {FUNDAMENTAL_SCREENS.map((s) => (
              <li key={s.slug}>
                <Link href={`/screens/${s.slug}`} className="block px-4 py-3 hover:bg-neutral-bg">
                  <p className="text-sm font-medium">{s.heading}</p>
                  <p className="text-xs text-foreground-muted">{s.description}</p>
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mb-2 text-base font-semibold">Delivery, volume and news screens</h2>
        </>
      )}
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
