"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Shared building blocks of the History Explorer (both tabs): one card style, one heading style, one chip style, one button
 * style, and one set of number formats. Tap targets are at least 44px; colour is never the only carrier of meaning.
 */

export const NA = "Not available";

// ---- number formats: Indian grouping for counts, 2 decimals for percentages, "x" for multiples
export const fmtInt = (n: number) => n.toLocaleString("en-IN");
export const pct2 = (v?: number | null) => (v == null ? NA : `${v.toFixed(2)}%`);
export const sgn2 = (v?: number | null) => (v == null ? NA : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
export const x2 = (v?: number | null) => (v == null ? NA : `${v.toFixed(2)}x`);
export const rsi1 = (v?: number | null) => (v == null ? NA : v.toFixed(1));
export const offLabel = (k: number) => (k > 0 ? `+${k}` : `${k}`);

export function fmtDate(iso?: string | null): string {
  if (!iso) return "Date not available";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "Date not available" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
export function fmtShort(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" });
}
export function fmtDM(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}
/** green only for a positive and red only for a negative number */
export const signTone = (v?: number | null) => (v == null || v === 0 ? "" : v > 0 ? "text-[var(--hx-up)]" : "text-[var(--hx-down)]");

// ---- class recipes (one of each)
export const CARD = "rounded-2xl border border-border bg-surface-raised p-4 sm:p-5";
export const INNER = "rounded-xl border border-border bg-surface p-3";
export const H2 = "text-sm font-semibold text-foreground";
export const LABEL = "text-xs font-medium text-foreground-muted";
export const FIELD = "min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const BTN_BASE = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;
export const BTN = `${BTN_BASE} border border-border bg-surface text-foreground hover:bg-hover`;
export const BTN_PRIMARY = `${BTN_BASE} bg-accent-dim text-accent-foreground hover:opacity-90`;
export const CHIP_BASE = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 py-2 text-sm font-medium ${FOCUS}`;
export const chipTone = (on: boolean) => (on ? "border-accent bg-accent/15 text-foreground" : "border-border bg-surface text-foreground-muted hover:text-foreground");
/** a state shown on a day (small, not a control) */
export const STATE_CHIP = "inline-flex items-center rounded-full border border-border bg-neutral-bg px-2 py-0.5 text-[11px] font-medium text-foreground";
export const STATE_CHIP_NA = "inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] font-medium text-foreground-muted";
export const NOTE_CHIP = "inline-flex items-center rounded-full border border-accent/60 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-foreground";

export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`${CARD} ${className}`} {...rest}>
      {children}
    </section>
  );
}

/** A toggle button group (Cards / Table, Group by stock / Date wise, Newest / Largest move). */
export function Segmented<T extends string>({ value, onChange, options, label, testid }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; label: string; testid?: string }) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label={label} data-testid={testid}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-11 rounded-md px-3 text-sm font-medium ${FOCUS} ${value === o.id ? "bg-accent/15 text-foreground ring-1 ring-accent" : "text-foreground-muted hover:text-foreground"}`}
          data-testid={testid ? `${testid}-${o.id}` : undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A collapsible panel with a real button header. */
export function Fold({ title, open, onToggle, children, testid }: { title: string; open: boolean; onToggle: () => void; children: ReactNode; testid?: string }) {
  return (
    <div data-testid={testid}>
      <button type="button" onClick={onToggle} aria-expanded={open} className={`flex min-h-11 w-full items-center justify-between gap-2 text-left ${H2} ${FOCUS} rounded-lg`}>
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-foreground-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function Skeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`animate-pulse space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 rounded bg-neutral-bg" style={{ width: `${92 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <Card aria-busy="true" aria-live="polite" data-testid="history-skeleton">
      <p className="sr-only">Loading the past days</p>
      <Skeleton lines={2} className="mb-4" />
      {[0, 1].map((i) => (
        <div key={i} className={`${INNER} mb-3`}>
          <Skeleton lines={1} className="mb-3" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-20 animate-pulse rounded-lg bg-neutral-bg" />
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card role="alert" data-testid="history-error">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${BTN} mt-3`} data-testid="history-retry">
          Try again
        </button>
      )}
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className={`${INNER} text-sm text-foreground-muted`} data-testid="history-empty">
      {children}
    </div>
  );
}

/** The single bar that stands in for the filter card once a result is showing; sticky on phones. */
export function SummaryBar({ text, onEdit }: { text: string; onEdit: () => void }) {
  return (
    <div
      className="sticky top-[env(safe-area-inset-top,0px)] z-20 -mx-4 border-b border-border bg-surface-raised px-4 py-2 shadow-sm md:static md:mx-0 md:rounded-2xl md:border md:shadow-none"
      data-testid="history-summarybar"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 break-words text-sm font-medium text-foreground">{text}</p>
        <button type="button" onClick={onEdit} className={`${BTN} shrink-0`} data-testid="history-edit-filters">
          Edit filters
        </button>
      </div>
    </div>
  );
}

export function StateChips({ states }: { states?: { key: string; label: string; on: boolean | null }[] }) {
  if (!states) return null;
  const on = states.filter((s) => s.on === true);
  const na = states.filter((s) => s.on === null);
  if (!on.length && !na.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {on.map((s) => (
        <span key={s.key} className={STATE_CHIP}>
          {s.label}
        </span>
      ))}
      {na.map((s) => (
        <span key={s.key} className={STATE_CHIP_NA} aria-label={`${s.label}: n/a`}>
          {s.label}: n/a
        </span>
      ))}
    </div>
  );
}
