import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { getSevenDayReview } from "@/lib/api/endpoints";
import { retryTransientPublicGet } from "@/lib/api/retry-public-upstream";
import type { ReviewRow, SevenDayReview } from "@/lib/api/types";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DataTable, Section } from "@/components/seo/DataTable";
import { StandardLineNote } from "@/components/seo/StandardLine";
import { WeeklyEmailOptIn } from "@/components/app/review/WeeklyEmailOptIn";
import { TrialCta } from "@/components/app/TrialCta";
import { stockPath } from "@/lib/seo/stock-symbol";
import { formatDateIst } from "@/lib/format";
import { isWeekDate, weekDescription, weekH1, weekPath, weekSentences, weekTitle } from "@/lib/seo/weekly";

// A past week does not change once built; the newest one can be rebuilt the same night.
export const revalidate = 900;

const dateOf = (ymd: string) => formatDateIst(`${ymd}T00:00:00Z`);

const load = cache(async (date: string): Promise<SevenDayReview | null> => {
  try {
    // @auth-ok: public SEO page, anonymous by design.
    const env = await retryTransientPublicGet(
      () => getSevenDayReview(date, { revalidate: 900 }),
      () => getSevenDayReview(date, { revalidate: 900, timeoutMs: 10_000 }),
    );
    const r = env.data;
    // The API answers with the stored week for exactly this date or 404; anything else is not served as this page.
    return r.available && r.as_of === date && r.lists && r.window ? r : null;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  if (!isWeekDate(date)) return { title: "Week not found", robots: { index: false, follow: false } };
  const r = await load(date);
  if (!r) return { title: "Week not found", robots: { index: false, follow: false } };
  const title = weekTitle(r);
  const description = weekDescription(r);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: weekPath(date) },
    openGraph: { title, description, type: "article" },
  };
}

const pctText = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;

function MoveTable({ caption, rows }: { caption: string; rows: ReviewRow[] }) {
  return (
    <DataTable
      caption={caption}
      head={["Stock", "Change", "Close ₹", "Volume vs usual", "Delivery %"]}
      rows={rows.map((x) => [
        <Link key={x.symbol} href={stockPath("/stocks", x.symbol)} className="text-accent hover:underline" title={x.name ?? x.symbol}>
          {x.symbol}
        </Link>,
        pctText(x.pct),
        x.close === null ? "n/a" : x.close.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
        x.vr === null ? "n/a" : `${x.vr.toFixed(2)}×`,
        x.dl === null ? "n/a" : `${x.dl.toFixed(1)}%`,
      ])}
    />
  );
}

export default async function WeeklyReviewPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isWeekDate(date)) notFound();
  const r = await load(date);
  if (!r) notFound();
  const lists = r.lists!.liquid;
  const sentences = weekSentences(r);
  const weeks = r.weeks ?? [];
  const idx = weeks.findIndex((w) => w.as_of === date);
  const older = idx >= 0 ? weeks[idx + 1] : undefined;
  const newer = idx > 0 ? weeks[idx - 1] : undefined;
  const w = r.window!;
  const x = r.excluded;

  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs crumbs={[{ name: "Home", href: "/" }, { name: "Weekly market reviews", href: "/weekly" }, { name: w.label.replace(/^Last \d+ sessions: /, ""), href: weekPath(date) }]} />
      <h1 className="text-2xl font-semibold">{weekH1(r)}</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        {w.label}. As of {dateOf(date)} close.
        {w.holidays.length ? ` Market holiday in this window: ${w.holidays.map(dateOf).join(", ")}.` : ""}
      </p>

      <Section id="market" title="The market this week">
        {sentences.length ? (
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {sentences.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground-muted">No market summary is stored for this week.</p>
        )}
      </Section>

      <Section id="rises" title="Largest price rises" note={`All liquid stocks, price change over the window. ${r.universe!.liquid.n.toLocaleString("en-IN")} stocks pass the liquidity filter.`}>
        <MoveTable caption="Largest price rises over the window" rows={lists.gains.slice(0, 10)} />
      </Section>
      <Section id="falls" title="Largest price falls">
        <MoveTable caption="Largest price falls over the window" rows={lists.falls.slice(0, 10)} />
      </Section>

      <Section id="how" title="How this page is measured">
        <div className="space-y-1.5 text-xs text-foreground-muted">
          <p>Each price change compares the last close of the window with the close of the last session before it ({dateOf(w.before)}).</p>
          {x && <p>{x.corporate_action} liquid stocks were left out because a split, bonus, demerger or similar corporate action happened inside the window, which makes their prices not comparable.</p>}
          <p>
            All liquid means EQ series only, an average daily traded value of at least ₹{r.thresholds!.min_avg_turnover_cr} crore over the last {r.thresholds!.sessions} sessions and a price of at least ₹{r.thresholds!.min_price}. The lists rank by
            price change over the window only. See{" "}
            <Link href="/how-it-works" className="underline">
              how RedixFi measures its readings
            </Link>
            .
          </p>
        </div>
      </Section>

      <nav aria-label="Other weeks" className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
        {older ? (
          <Link href={weekPath(older.as_of)} className="text-accent hover:underline">
            ← Previous week
          </Link>
        ) : (
          <span />
        )}
        <Link href="/weekly" className="text-accent hover:underline">
          All weeks
        </Link>
        {newer ? (
          <Link href={weekPath(newer.as_of)} className="text-accent hover:underline">
            Next week →
          </Link>
        ) : (
          <span />
        )}
      </nav>
      <p className="mt-2 text-sm">
        <Link href="/signals/7-day-review" className="text-accent hover:underline">
          Open the live 7-Day Review
        </Link>
      </p>

      <WeeklyEmailOptIn className="mt-5" />
      <TrialCta className="mt-5" />
      <StandardLineNote className="mt-8" />
    </div>
  );
}
