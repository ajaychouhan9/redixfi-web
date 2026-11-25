"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { getHomeBrief } from "@/lib/api/endpoints";
import type { HomeBrief as HomeBriefData } from "@/lib/api/types";
import { BRIEF_NOT_ADVICE, shownBullets, updatedLine } from "@/lib/home-brief";

/**
 * The AI brief on Home: five short bullets, written from real numbers by the scheduler four times a day (08:45, 12:30, 15:45, 20:00 IST) and
 * stored; this box only reads the stored copy, so a visitor never triggers any writing. Loaded in the browser, so the Home page stays static.
 * With nothing stored yet the box says so instead of showing an empty frame.
 */
export function HomeBrief() {
  const [brief, setBrief] = useState<HomeBriefData | null | undefined>(undefined);
  const [more, setMore] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getHomeBrief({ revalidate: 300 })
      .then((data) => !cancelled && setBrief(data ?? null))
      .catch(() => !cancelled && setBrief(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const bullets = shownBullets(brief?.bullets);
  const updated = updatedLine(brief?.updated_label, brief?.updated_at);
  // 26 Nov 2026: with no brief stored (or the read failed) the card is hidden; no empty box and no stuck placeholder.
  if (brief !== undefined && bullets.length === 0) return null;
  return (
    <section className="min-w-0 max-w-full rounded-2xl border border-border bg-surface-raised p-4 sm:p-5" aria-labelledby="home-brief-title" data-testid="home-brief">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15">
            <Sparkles size={14} className="text-accent" aria-hidden />
          </span>
          <h2 id="home-brief-title" className="font-mono text-[12px] uppercase tracking-widest text-accent">AI brief</h2>
        </div>
        {updated && <span className="font-mono text-[12px] text-foreground-faint" data-testid="home-brief-updated">{updated}</span>}
      </div>
      {brief === undefined && (
        <div className="space-y-2" aria-hidden data-testid="home-brief-loading">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-hover" style={{ width: `${92 - i * 7}%` }} />
          ))}
        </div>
      )}
      {bullets.length > 0 && (
        <ul className="list-disc space-y-1.5 break-words pl-5 text-[15px] leading-[1.6] marker:text-accent-dim [overflow-wrap:anywhere]" data-testid="home-brief-bullets">
          {(more ? bullets : bullets.slice(0, 3)).map((b, i) => (
            <li key={i} className={more ? "" : "line-clamp-2"}>{b}</li>
          ))}
        </ul>
      )}
      {bullets.length > 0 && (
        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="mt-1 flex min-h-[44px] items-center text-[13px] font-medium text-accent" data-testid="home-brief-more">
          {more ? "Show less" : "Read more"}
        </button>
      )}
      <p className="mt-3 text-xs text-foreground-muted">{BRIEF_NOT_ADVICE}</p>
    </section>
  );
}
