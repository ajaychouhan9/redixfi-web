import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCannedScreen } from "@/data/canned-screens";
import { getSignals } from "@/lib/api/endpoints";
import { DeltaValue } from "@/components/ui/DeltaValue";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const screen = getCannedScreen(slug);
  if (!screen) return { title: "Screen not found" };
  return {
    title: screen.title,
    description: screen.description,
    alternates: { canonical: `/screens/${screen.slug}` },
  };
}

export default async function ScreenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const screen = getCannedScreen(slug);
  if (!screen) notFound();

  // @auth-ok: public SEO page, ISR-cached and crawlable — must never carry
  // a visitor's personal token. Same locked/unlocked view any anonymous
  // visitor gets on the real Signals list.
  const env = await getSignals({ ...screen.params, size: 10 }, { revalidate: 120 });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold">{screen.title}</h1>
      <p className="mb-4 text-sm text-foreground-muted">{screen.description}</p>

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
            {env.data.map((r) => (
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
          Showing 10 of {env.page_info.total.toLocaleString("en-IN")} stocks meeting this screen.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          Sign up to see all {env.page_info.total.toLocaleString("en-IN")}
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-foreground-faint">
        <Link href="/screens" className="underline">
          More screens
        </Link>
      </p>
    </div>
  );
}
