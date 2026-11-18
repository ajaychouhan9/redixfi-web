"use client";

import { useState } from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthContext";
import { getSignals } from "@/lib/api/endpoints";
import type { SignalRow } from "@/lib/api/types";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { signupHref } from "@/lib/nav-items";
import { HOW_TO_READ, START_PAGE_SIZE, START_RESULTS_NOTE, START_SECTORS, START_WHAT_MATTERS, profitFlag, salesText, startListParams, startScreenerHref, yieldText } from "@/lib/start-here";
import { stockPath } from "@/lib/seo/stock-symbol";

/**
 * Part 2 of "Read a company in 15 minutes" (was "Start here", 17 Nov 2026): the words on the cards, four plain lines on reading a company, then the rules to tick and a sector, then result cards listed
 * A to Z (no ranking). The cards use only fields the Screener already returns; the list is fetched when "Show matching stocks" is tapped, in the
 * browser, so the page itself is static. The company-size question is left out while it has only "Any".
 */
export function StartHere() {
  const { user, getToken } = useAuth();
  const [chosen, setChosen] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [limited, setLimited] = useState(false);

  function toggle(id: string) {
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function load(nextPage: number) {
    setState("loading");
    try {
      const token = user ? await getToken() : null;
      const env = await getSignals(startListParams(chosen, sector, nextPage), token ? { token } : undefined);
      setRows((prev) => (nextPage === 1 ? env.data : [...prev, ...env.data]));
      setTotal(env.page_info.total);
      setPage(nextPage);
      setState("ok");
    } catch {
      // a page the plan does not include (the list is capped for logged-out visitors) or a failed read
      if (nextPage > 1) setLimited(true);
      setState(nextPage > 1 ? "ok" : "error");
    }
  }

  function show() {
    setRows([]);
    setTotal(null);
    setLimited(false);
    void load(1);
  }

  const busy = state === "loading";
  const more = state === "ok" && total !== null && rows.length < total && !limited;
  return (
    <div className="space-y-6" data-testid="start-here">
      <section aria-labelledby="start-step1" data-testid="start-step-1">
        <h2 id="start-step1" className="text-base font-semibold">Words on the cards</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HOW_TO_READ.map((h) => (
            <div key={h.term} className="rounded-xl border border-border bg-surface px-4 py-3" data-testid="start-guide-line">
              <dt className="text-sm font-semibold">{h.term}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-foreground-muted">{h.line}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="start-step2" className="rounded-2xl border border-border bg-surface-raised p-5" data-testid="start-step-2">
        <h2 id="start-step2" className="text-base font-semibold">Choose your rules</h2>
        <fieldset className="mt-3">
          <legend className="sr-only">Choose one or more</legend>
          <div className="space-y-2">
            {START_WHAT_MATTERS.map((o) => (
              <label key={o.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={chosen.includes(o.id)} onChange={() => toggle(o.id)} className="mt-1 h-4 w-4 shrink-0" />
                <span>
                  <span className="font-medium">{o.label}</span>
                  <span className="block text-xs text-foreground-muted">Rule: {o.rule}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4">
          <label className="block text-sm font-medium" htmlFor="start-sector">Sector</label>
          <select id="start-sector" value={sector} onChange={(e) => setSector(e.target.value)} className="mt-1 h-10 w-full max-w-xs rounded-lg border border-border bg-surface px-2 text-sm">
            <option value="">Any sector</option>
            {START_SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-foreground-muted">Sectors follow the NSE index groups the Screener uses.</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={show} disabled={state === "loading"} data-testid="start-show-stocks" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60">
            {state === "loading" && page === 0 ? "Loading…" : "Show matching stocks"}
          </button>
          <Link href={startScreenerHref(chosen, sector)} className="text-sm font-medium text-accent hover:underline" data-testid="start-open-screener">
            Open these filters in the Screener
          </Link>
        </div>
      </section>

      <section aria-labelledby="start-step3" data-testid="start-step-3">
        <h2 id="start-step3" className="text-base font-semibold">Companies that match</h2>
        {state === "idle" && <p className="mt-2 text-sm text-foreground-muted">Tick what matters to you, then tap &ldquo;Show matching stocks&rdquo;. With nothing ticked, every stock is listed.</p>}
        {state === "error" && <p className="mt-2 text-sm text-foreground-muted">The list could not be loaded right now. Please try again in a moment.</p>}
        {(state === "ok" || (busy && rows.length > 0)) && (
          <>
            <p className="mt-2 text-sm font-medium" data-testid="start-results-note">
              {START_RESULTS_NOTE}
              {total !== null ? ` ${total.toLocaleString("en-IN")} ${total === 1 ? "stock matches" : "stocks match"}.` : ""}
            </p>
            {rows.length === 0 && <p className="mt-2 text-sm text-foreground-muted">No stock matches all of these filters on the stored data.</p>}
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="start-cards">
              {rows.map((r) => (
                <li key={r.symbol} className="rounded-xl border border-border bg-surface p-4" data-testid="start-card">
                  <p className="text-sm font-semibold">{displayName(r.company_name) || r.symbol}</p>
                  <p className="text-xs text-foreground-muted">{r.symbol}{typeof r.last_price === "number" ? ` · ₹${formatNumber(r.last_price, 2)}` : ""}</p>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between gap-2"><dt className="text-foreground-muted">Profit in the latest quarter</dt><dd className="font-medium">{profitFlag(r)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-foreground-muted">Sales vs a year earlier</dt><dd className="font-medium tabular-nums">{salesText(r)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-foreground-muted">Dividend yield</dt><dd className="font-medium tabular-nums">{yieldText(r)}</dd></div>
                  </dl>
                  <Link href={stockPath("/stocks", r.symbol)} className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent/10" data-testid="start-read-company">
                    Read this company
                  </Link>
                </li>
              ))}
            </ul>
            {more && (
              <button type="button" onClick={() => void load(page + 1)} disabled={busy} className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground">
                {busy ? "Loading…" : `Show ${Math.min(START_PAGE_SIZE, (total ?? 0) - rows.length)} more`}
              </button>
            )}
            {limited && (
              <p className="mt-3 text-sm text-foreground-muted">
                The full list is included with a free account.{" "}
                <Link href={signupHref("/start")} className="font-medium text-accent hover:underline">Sign up free</Link>
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
