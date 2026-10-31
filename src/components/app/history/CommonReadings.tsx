"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { historyErrorMessage, runCommonReadings, type CommonResult, type CommonRow } from "@/lib/api/history";
import {
  BADGE,
  COL_ALL,
  COL_DIFF,
  COL_PRESENT,
  COL_READING,
  COL_SESSION,
  LEGEND,
  COMMON_BUTTON,
  COMMON_ERROR,
  COMMON_HOW,
  COMMON_HOW_TITLE,
  COMMON_NEEDS_MOVE,
  COMMON_SUB,
  COMMON_SUBLABEL,
  COMMON_TOO_FEW,
  COUNTS_TITLE,
} from "@/lib/history-common-copy";
import { BTN, BTN_PRIMARY, ErrorState, Fold, H2, INNER, Skeleton, fmtInt, offLabel } from "@/components/app/history/ui";

const MIN_DAYS = 30;

function share(k: number, n: number, pct: number | null) {
  return n ? `${fmtInt(k)} of ${fmtInt(n)} days (${(pct ?? 0).toFixed(2)}%)` : "Not available";
}
const diffText = (v: number | null) => (v == null ? "Not available" : `${v > 0 ? "+" : ""}${v.toFixed(2)} pts`);
const pctText = (v: number | null) => (v == null ? "n/a" : `${v.toFixed(2)}%`);

function RowCard({ r }: { r: CommonRow }) {
  return (
    <li className={`rounded-lg border px-3 py-2 ${r.stood_out ? "border-accent bg-accent/10" : "border-border bg-surface-2"}`} data-testid="common-row">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[13px] font-semibold">
          {r.reading} <span className="font-normal text-foreground-muted">· session {offLabel(r.offset)}</span>
        </p>
        {r.stood_out && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-foreground">
            <Check className="h-3 w-3" aria-hidden /> {BADGE}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[12px] tabular-nums text-foreground-muted" title={`${share(r.k, r.n, r.pct)}; all days ${share(r.base_k, r.base_n, r.base_pct)}`}>
        {r.enough ? (
          <>
            Present {pctText(r.pct)} · All days {pctText(r.base_pct)} · <span className="font-semibold text-foreground">{diffText(r.diff_pp)}</span>
          </>
        ) : (
          <>Fewer than 30 days</>
        )}
      </p>
    </li>
  );
}

function RowTable({ rows }: { rows: CommonRow[] }) {
  return (
    <div className="hidden sm:block">
      <table className="w-full text-left text-[13px]" data-testid="common-table">
        <thead>
          <tr className="border-b border-border text-[11px] font-semibold uppercase text-foreground-muted">
            <th className="py-2 pr-3">{COL_READING}</th>
            <th className="py-2 pr-3">{COL_SESSION}</th>
            <th className="py-2 pr-3">{COL_PRESENT}</th>
            <th className="py-2 pr-3">{COL_ALL}</th>
            <th className="py-2 pr-3">{COL_DIFF}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.key}${r.offset}`} className={`border-b border-border align-top ${r.stood_out ? "bg-accent/10" : ""}`} data-testid="common-row">
              <td className="py-2 pr-3 font-medium">{r.reading}</td>
              <td className="py-2 pr-3 tabular-nums">{offLabel(r.offset)}</td>
              <td className="py-2 pr-3 tabular-nums">{share(r.k, r.n, r.pct)}</td>
              <td className="py-2 pr-3 tabular-nums">{share(r.base_k, r.base_n, r.base_pct)}</td>
              <td className="py-2 pr-3 tabular-nums">{r.enough ? diffText(r.diff_pp) : "Fewer than 30 days"}</td>
              <td className="py-2">
                {r.stood_out && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent/15 px-2 py-0.5 text-[11px] font-semibold">
                    <Check className="h-3 w-3" aria-hidden /> {BADGE}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * "Chance Check": a button under the result summary. `body` is the request the result came from (kept opaque here), `days` the
 * number of days found with the chosen move, `moveAny` true when no move size was chosen.
 */
export function CommonReadings({ mode, body, days, moveAny }: { mode: "stockwise" | "pooled"; body: Record<string, unknown>; days: number; moveAny: boolean }) {
  const { user, getToken } = useAuth();
  const [res, setRes] = useState<CommonResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [how, setHow] = useState(false);
  const [open, setOpen] = useState(false);
  const key = JSON.stringify(body);

  useEffect(() => {
    setRes(null);
    setErr(null);
    setOpen(false);
  }, [key]);

  const blocked = moveAny ? COMMON_NEEDS_MOVE : days < MIN_DAYS ? COMMON_TOO_FEW : null;

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const token = user ? await getToken() : null;
      const env = await runCommonReadings(mode, body, { token });
      setRes(env.data);
      setOpen(true);
    } catch (e) {
      setRes(null);
      const m = historyErrorMessage(e);
      setErr(m === "Something went wrong. Please try again." ? COMMON_ERROR : m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-3 sm:p-4" aria-label={COMMON_BUTTON} data-testid="common-readings">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button type="button" className={blocked ? BTN : BTN_PRIMARY} onClick={() => (res ? setOpen((o) => !o) : load())} disabled={!!blocked || busy} aria-describedby="common-sub" aria-expanded={!!res && open} data-testid="common-button">
          {busy ? "Working…" : COMMON_BUTTON}
          {!busy && (open && res ? <ChevronUp className="ml-1.5 inline h-4 w-4 align-[-3px]" aria-hidden /> : <ChevronDown className="ml-1.5 inline h-4 w-4 align-[-3px]" aria-hidden />)}
        </button>
        <p id="common-sub" className="min-w-0 flex-1 text-sm text-foreground-muted sm:text-xs">
          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-foreground-faint">{COMMON_SUBLABEL}</span>
          {COMMON_SUB}
        </p>
      </div>
      {blocked && (
        <p className="text-sm text-foreground-muted" data-testid="common-blocked">
          {blocked}
        </p>
      )}
      {busy && <Skeleton lines={4} />}
      {err && <ErrorState message={err} onRetry={load} />}
      {open && res && res.status !== "ok" && <p className="text-sm text-foreground-muted">{res.message}</p>}
      {open && res && res.status === "ok" && res.rows && (
        <div className="space-y-4" data-testid="common-panel">
          <p className="text-base font-semibold" data-testid="common-headline">
            {res.headline}
          </p>
          <p className="text-xs text-foreground-muted" data-testid="common-stood-out-note">{res.fixed?.stood_out_note}</p>
          <p className="text-xs text-foreground-muted">{res.fixed?.before_only}</p>
          <p className="text-[11px] text-foreground-muted" data-testid="common-legend">{LEGEND}</p>
          <RowTable rows={res.rows} />
          <ul className="space-y-1.5 sm:hidden" data-testid="common-cards">
            {res.rows.map((r) => (
              <RowCard key={`${r.key}${r.offset}`} r={r} />
            ))}
          </ul>
          <div className={INNER} data-testid="common-counts">
            <h3 className={`${H2} mb-2`}>{COUNTS_TITLE}</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
              <dt className="text-foreground-muted">Days with an up move</dt>
              <dd className="text-right tabular-nums">{fmtInt(res.up_days ?? 0)}</dd>
              <dt className="text-foreground-muted">Days with a down move</dt>
              <dd className="text-right tabular-nums">{fmtInt(res.down_days ?? 0)}</dd>
              {res.market_wide && (
                <>
                  <dt className="text-foreground-muted">Market-wide days</dt>
                  <dd className="text-right tabular-nums">
                    {fmtInt(res.market_wide.days)} of {fmtInt(res.days)}
                  </dd>
                </>
              )}
            </dl>
            {res.market_wide && (
              <p className="mt-1 text-[11px] text-foreground-muted">
                A market-wide day is one on which at least {res.market_wide.share_pct}% of the ranked stocks moved by the same size.
              </p>
            )}
            {res.weekdays && (
              <dl className="mt-3 grid grid-cols-5 gap-1 text-center text-[12px]" aria-label="Days by weekday">
                {Object.entries(res.weekdays).map(([d, n]) => (
                  <div key={d}>
                    <dt className="text-foreground-muted">{d.slice(0, 3)}</dt>
                    <dd className="font-medium tabular-nums">{fmtInt(n)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {res.results_dates && <p className="mt-2 text-[11px] text-foreground-muted">{res.results_dates}</p>}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground-muted">{res.fixed?.caution}</p>
            <p className="text-xs text-foreground-muted">{res.fixed?.independence}</p>
          </div>
          <Fold title={COMMON_HOW_TITLE} open={how} onToggle={() => setHow((h) => !h)} testid="common-how">
            <ul className="list-disc space-y-1.5 pl-5 text-xs text-foreground-muted">
              {COMMON_HOW.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Fold>
        </div>
      )}
    </section>
  );
}
