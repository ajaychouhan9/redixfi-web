import type { Metadata } from "next";

// Temporary page (18 Nov 2026) so the owner can compare the three themes on a phone and choose. Not indexed, not in the sitemap, not linked.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Theme preview | RedixFi" },
  robots: { index: false, follow: false },
  alternates: { canonical: "/theme-preview" },
};

const THEME_LIST = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "slate", label: "Slate" },
] as const;

const ROWS = [
  { name: "Example Industries", sym: "EXAMPLE", chg: 3.42, price: "1,284.50", vol: "12 lakh shares today, usual 4 lakh, 3x" },
  { name: "Sample Foods", sym: "SAMPLE", chg: -2.18, price: "412.10", vol: "8 lakh shares today, usual 5 lakh, 1.6x" },
  { name: "Demo Metals", sym: "DEMO", chg: 0.0, price: "96.75", vol: "3 lakh shares today, usual 3 lakh, 1x" },
];

function Sample({ id, label }: { id: (typeof THEME_LIST)[number]["id"]; label: string }) {
  return (
    <section data-preview={id} className="space-y-4 rounded-xl border border-border bg-background p-4 text-foreground" data-testid={`theme-sample-${id}`}>
      <h2 className="text-lg font-semibold">{label}</h2>

      <div className="rounded-xl border border-border bg-surface-raised p-3">
        <h3 className="text-sm font-semibold">Intraday movers</h3>
        <p className="text-xs text-foreground-muted">Live · 15 min delayed</p>
        <ul className="mt-2 divide-y divide-border">
          {ROWS.map((r) => (
            <li key={r.sym} className="flex items-start justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{r.name}</span>
                <span className="block text-xs text-foreground-muted">{r.sym}</span>
                <span className="block text-xs text-foreground-faint">{r.vol}</span>
              </span>
              <span className={`shrink-0 text-sm font-medium tabular-nums ${r.chg > 0 ? "text-up" : r.chg < 0 ? "text-down" : "text-neutral"}`}>
                {r.chg > 0 ? "▲ +" : r.chg < 0 ? "▼ " : "– "}
                {r.chg.toFixed(2)}%
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-foreground-faint">Past record. Not a forecast or a recommendation.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface-raised p-3">
        <p className="text-xs text-foreground-muted">EXAMPLE · NSE</p>
        <h3 className="text-xl font-semibold">Example Industries</h3>
        <p className="mt-1 text-2xl font-semibold tabular-nums">₹1,284.50</p>
        <p className="text-sm text-up">▲ +3.42% today</p>
        <p className="text-xs text-foreground-muted">As of 17 Nov close</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-foreground-faint">
              <th className="px-3 py-2">Period</th>
              <th className="px-3 py-2">Change</th>
              <th className="px-3 py-2">Delivery</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-3 py-2">1 week</td>
              <td className="px-3 py-2 text-up">+4.1%</td>
              <td className="px-3 py-2 text-foreground-muted">48%</td>
            </tr>
            <tr>
              <td className="px-3 py-2">1 month</td>
              <td className="px-3 py-2 text-down">-2.6%</td>
              <td className="px-3 py-2 text-foreground-muted">41%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">Log in</span>
        <span className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground-muted">Secondary</span>
        <span className="rounded-md px-3 py-2 text-xs font-medium text-accent underline">Link text</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-up-bg px-2 py-1 font-medium text-up">Rise</span>
        <span className="rounded-full bg-down-bg px-2 py-1 font-medium text-down">Fall</span>
        <span className="rounded-full bg-neutral-bg px-2 py-1 font-medium text-neutral">Flat</span>
        <span className="rounded-full bg-amber-bg px-2 py-1 font-medium text-amber">Delayed</span>
      </div>
    </section>
  );
}

export default function ThemePreviewPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-3">
      <h1 className="text-xl font-semibold">Theme preview</h1>
      <p className="text-sm text-foreground-muted">The same sections in the three themes. Choose one, then tell the owner. This page is temporary.</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {THEME_LIST.map((t) => (
          <Sample key={t.id} id={t.id} label={t.label} />
        ))}
      </div>
    </div>
  );
}
