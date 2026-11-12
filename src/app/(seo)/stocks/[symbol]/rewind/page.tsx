import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiMutate, ApiError } from "@/lib/api/client";
import { getResearch } from "@/lib/api/endpoints";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DataTable, Section } from "@/components/seo/DataTable";
import { TrialCta } from "@/components/app/TrialCta";
import { formatDateIst } from "@/lib/format";
import { stockPath, stockSymbolFromParam } from "@/lib/seo/stock-symbol";
import {
  REWIND_CONDITIONS,
  REWIND_MIN_CASES,
  hasEnoughHistory,
  periodLine,
  resultSentence,
  summarise,
  type ConditionResult,
  type RawStock,
} from "@/lib/seo/stock-rewind";

// History only. Rebuilt hourly: the stored history changes once a day.
export const revalidate = 3600;

const dateOf = (ymd: string) => formatDateIst(`${ymd.slice(0, 10)}T00:00:00Z`);
const signed = (n: number | null) => (n === null ? "n/a" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`);

interface RewindData {
  company: string;
  stock: RawStock | null;
  asOf: string;
  results: ConditionResult[];
}

const load = cache(async (symbol: string): Promise<RewindData | null> => {
  let company: string | null = null;
  try {
    // @auth-ok: public SEO page, anonymous by design.
    company = (await getResearch(symbol, { revalidate: 300 })).data.company_name;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
  const runs = await Promise.all(
    REWIND_CONDITIONS.map(async (c) => {
      try {
        // @auth-ok: public history read, anonymous by design (the API returns the same counts to everyone).
        const env = await apiMutate<{ as_of: string; stocks: RawStock[] }>(
          "/history/stockwise",
          "POST",
          { symbols: [symbol], move: c.move, direction: c.direction, period: "3y", offsets: [1, 2, 3, 4, 5] },
          { revalidate: 3600, timeoutMs: 20_000 },
        );
        return { c, stock: env.data.stocks?.[0] ?? null, asOf: env.data.as_of };
      } catch {
        return { c, stock: null, asOf: "" };
      }
    }),
  );
  const first = runs.find((r) => r.stock);
  const stock = first?.stock ?? null;
  return {
    company: company ?? symbol,
    stock,
    asOf: first?.asOf ?? "",
    results: runs.map((r) => summarise(r.c, r.stock)),
  };
});

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol: raw } = await params;
  const symbol = stockSymbolFromParam(raw);
  if (!symbol) return { title: "Stock not found", robots: { index: false, follow: false } };
  const d = await load(symbol);
  if (!d) return { title: `${symbol} not found`, robots: { index: false, follow: false } };
  const enough = hasEnoughHistory(d.stock);
  const path = `${stockPath("/stocks", symbol)}/rewind`;
  const title = `${d.company} (${symbol}) Market Rewind: past large one-day moves and what followed | RedixFi`;
  const counts = d.results.filter((r) => !r.tooFew).map((r) => `${r.count} sessions that ${r.condition.label.toLowerCase()}`);
  const description = enough
    ? `Past record for ${d.company} (${symbol}): ${counts.length ? counts.slice(0, 2).join(" and ") + ` over ${periodLine(d.stock!, d.asOf)}. ` : ""}Counts and dates of past large one-day moves and the closes that followed. History only, not a forecast.`
    : `${d.company} (${symbol}) does not have enough stored history yet for a Market Rewind page.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    robots: enough ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title: `${d.company} (${symbol}) Market Rewind`, description, type: "website" },
  };
}

function ConditionBlock({ r, asOf, stock }: { r: ConditionResult; asOf: string; stock: RawStock }) {
  return (
    <div className="rounded-lg border border-border p-3" data-testid={`rewind-${r.condition.key}`}>
      <h3 className="text-sm font-semibold">{r.condition.label}</h3>
      <p className="mt-1 text-sm">
        Past occurrences: <span className="font-semibold tabular-nums">{r.count.toLocaleString("en-IN")}</span>
        <span className="text-foreground-muted"> in {periodLine(stock, asOf)}.</span>
      </p>
      {r.tooFew ? (
        <p className="mt-1 text-sm text-foreground-muted">Too few past cases (fewer than {REWIND_MIN_CASES}) to show a result.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-foreground-muted">{resultSentence(r)}</p>
          <div className="mt-2">
            <DataTable
              caption={`Most recent past cases: ${r.condition.label}`}
              head={["Date", "Day move", "Next session", "After 5 sessions"]}
              rows={r.rows.slice(0, 10).map((x) => [dateOf(x.date), signed(x.movePct), signed(x.nextPct), signed(x.fiveDayPct)])}
            />
            {r.listed > 10 && <p className="mt-1 text-xs text-foreground-faint">The 10 most recent of {r.listed} listed cases.</p>}
          </div>
        </>
      )}
    </div>
  );
}

export default async function StockRewindPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await params;
  const symbol = stockSymbolFromParam(raw);
  if (!symbol) notFound();
  const d = await load(symbol);
  if (!d) notFound();
  const enough = hasEnoughHistory(d.stock);
  const stockUrl = stockPath("/stocks", symbol);

  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs
        crumbs={[
          { name: "Home", href: "/" },
          { name: `${d.company} (${symbol})`, href: stockUrl },
          { name: "Market Rewind", href: `${stockUrl}/rewind` },
        ]}
      />
      <h1 className="text-2xl font-semibold">
        {d.company} ({symbol}) Market Rewind: past large one-day moves and what followed
      </h1>
      <p className="mt-2 text-sm text-foreground-muted">
        A record of the past: how often and when {symbol} closed {" "}
        3% or 5% away from the previous close in one session, and what its closes did over the next sessions. Counts and dates only.
      </p>

      {!enough || !d.stock ? (
        <div className="mt-6 rounded-lg border border-border p-4" data-testid="rewind-no-history">
          <p className="text-sm font-medium">Not enough stored history for a Market Rewind of {symbol}.</p>
          <p className="mt-1 text-sm text-foreground-muted">
            {d.stock
              ? `Only ${d.stock.sessions.toLocaleString("en-IN")} sessions are stored; the page needs at least 250.`
              : "No history is stored for this stock yet."}{" "}
            The stock page has the data that is available.
          </p>
        </div>
      ) : (
        <>
          <Section id="past" title="Past occurrences" note={`${periodLine(d.stock, d.asOf)}. A result is shown only when there are at least ${REWIND_MIN_CASES} past cases.`}>
            <div className="space-y-3">
              {d.results.map((r) => (
                <ConditionBlock key={r.condition.key} r={r} asOf={d.asOf} stock={d.stock!} />
              ))}
            </div>
            <p className="mt-3 text-xs text-foreground-muted">
              Many stocks move on the same market days, and a short list of past days can show any pattern by coincidence. This is a record, not a forecast.
              {d.stock.partial_period ? " The stock has been listed for less than the full period shown." : ""}
            </p>
          </Section>
          <Section id="more" title="More">
            <ul className="space-y-1 text-sm">
              <li>
                <Link href={`/rewind?symbol=${encodeURIComponent(symbol)}`} className="text-accent hover:underline" rel="nofollow">
                  Open {symbol} in the full Market Rewind tool (other move sizes and periods)
                </Link>
              </li>
            </ul>
          </Section>
        </>
      )}

      <p className="mt-6 text-sm">
        <Link href={stockUrl} className="font-medium text-accent hover:underline">
          ← Back to the {d.company} ({symbol}) stock page
        </Link>
      </p>
      <TrialCta className="mt-4" />
    </div>
  );
}
