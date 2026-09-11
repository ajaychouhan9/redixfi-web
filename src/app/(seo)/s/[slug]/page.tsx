import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSharedScreen, getSignals } from "@/lib/api/endpoints";
import { DeltaValue } from "@/components/ui/DeltaValue";

// Public, unauthenticated view of a "Share this screen" link
// (2026-09-11 task). NOT ISR-cached like the canned /screens/[slug] pages
// — a shared screen is a small, long-tail set of distinct slugs (could
// grow into many thousands over time) rather than a handful of known
// canned routes, and the whole point is "today's data", so this always
// re-runs both fetches on request. Same "no B8 masking bypass" posture as
// every other public page in this codebase: getSignals is called with NO
// token, so the viewer sees exactly what any anonymous/free visitor sees
// anywhere else on the site — never the ORIGINAL creator's tier.
export const dynamic = "force-dynamic";

async function loadScreen(slug: string) {
  // @auth-ok: public view — see module docstring.
  const screen = await getSharedScreen(slug);
  if (!screen) return null;
  // @auth-ok: public view, intentionally anonymous — B8 masking must
  // apply exactly as it would for any other anonymous visitor, never the
  // original creator's tier. Same reasoning as /screens/[slug].
  // Nulls -> undefined: SharedScreenParams allows null for "filter
  // omitted" (from Mongo/JSON), SignalsListParams doesn't.
  const p = screen.params;
  const results = await getSignals({
    sector: p.sector ?? undefined,
    score_min: p.score_min ?? undefined,
    score_max: p.score_max ?? undefined,
    event_risk: p.event_risk ?? undefined,
    q: p.q ?? undefined,
    sort: p.sort,
    order: p.order,
    size: 25,
  });
  return { screen, results };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadScreen(slug);
  if (!loaded) return { title: "Shared screen not found" };
  const { screen } = loaded;
  const title = `${screen.title} — Shared Screen`;
  const description = `A RedixFi Signals screen shared by a user: ${screen.title}. Live, current data — measured, not advice.`;
  const ogImage = `/api/og?${new URLSearchParams({ type: "screener", title: screen.title, subtitle: "Shared screen · live data" }).toString()}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    // Deliberately no canonical/indexing signal like the canned screens
    // get — user-generated slugs aren't curated SEO content and shouldn't
    // compete with /screens/[slug] in search results.
    robots: { index: false, follow: true },
  };
}

export default async function SharedScreenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loaded = await loadScreen(slug);
  if (!loaded) notFound();
  const { screen, results } = loaded;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs text-foreground-faint">
        Shared screen · {screen.view_count.toLocaleString("en-IN")} view{screen.view_count === 1 ? "" : "s"}
      </p>
      <h1 className="mb-1 text-xl font-semibold">{screen.title}</h1>
      <p className="mb-4 text-sm text-foreground-muted">
        Live results, re-run just now — not a saved snapshot. Data is shown exactly as any visitor would see it,
        matching Free-tier masking rules.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
            <tr>
              <th className="px-3 py-2">Symbol</th>
              <th className="px-3 py-2">Sector</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Change</th>
              <th className="px-3 py-2">Delivery</th>
            </tr>
          </thead>
          <tbody>
            {results.data.map((r) => (
              <tr key={r.symbol} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{r.symbol}</td>
                <td className="px-3 py-2 text-xs text-foreground-muted">{r.sector}</td>
                <td className="px-3 py-2 tabular-nums">{r.composite_score ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums">{r.delta_1d !== null ? <DeltaValue value={r.delta_1d} /> : "—"}</td>
                <td className="px-3 py-2 tabular-nums text-xs">{r.delivery_pct !== null ? `${r.delivery_pct}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-5 text-center">
        <p className="text-sm font-medium">
          Showing {results.data.length} of {results.page_info.total.toLocaleString("en-IN")} stocks matching this screen.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Link
            href={`/signals?clone=${encodeURIComponent(screen.slug)}`}
            className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
          >
            Clone this screen
          </Link>
          <Link href="/login?mode=signup" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
            Sign up free
          </Link>
        </div>
        <p className="mt-2 text-xs text-foreground-faint">
          Log in to clone directly into your own Signal Dashboard — no account yet? Sign up first, then open this
          link again.
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-foreground-faint">
        <Link href="/screens" className="underline">
          Browse curated screens
        </Link>
      </p>
    </div>
  );
}
