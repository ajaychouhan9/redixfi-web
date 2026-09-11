"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://redixfi.com";

export interface ShareCardProps {
  type: "brief" | "movers";
  title: string;
  subtitle?: string;
  stat?: string;
  statLabel?: string;
  direction?: "up" | "down";
}

/**
 * Watermarked shareable social card (2026-09-11 task, Part B) — reuses the
 * SAME /api/og edge image generator that produces OG previews for stock/
 * screener/concall pages (see src/app/api/og/route.tsx), just with
 * type=brief|movers instead of type=stock|screener|concall. One image
 * system serving both use cases, per the task's explicit "build it
 * generically enough" instruction — no second renderer.
 *
 * No backend persistence needed here (unlike ShareScreenButton): the
 * card's content is just today's already-rendered numbers passed in as
 * props, so the image URL is fully self-contained via query string.
 */
export function ShareCardPopover({ card }: { card: ShareCardProps }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const imageUrl = `${SITE_URL}/api/og?${new URLSearchParams({
    type: card.type,
    title: card.title,
    ...(card.subtitle ? { subtitle: card.subtitle } : {}),
    ...(card.stat ? { stat: card.stat } : {}),
    ...(card.statLabel ? { statLabel: card.statLabel } : {}),
    ...(card.direction ? { direction: card.direction } : {}),
  }).toString()}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the link is still visible/selectable below
    }
  }

  const shareText = encodeURIComponent(`${card.title}${card.subtitle ? ` — ${card.subtitle}` : ""} · via RedixFi`);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Share this card"
        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground-faint hover:text-foreground"
      >
        <Share2 size={12} />
        Share
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-surface-raised p-3 text-sm shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="mb-2 w-full rounded-md border border-border" />
          <div className="mb-2 flex items-center gap-1.5">
            <input readOnly value={imageUrl} className="w-full truncate rounded-lg border border-border bg-hover px-2 py-1.5 text-xs outline-none" />
            <button type="button" onClick={handleCopy} title="Copy image link" className="shrink-0 rounded-lg border border-border p-1.5 text-foreground-muted hover:text-foreground">
              {copied ? <Check size={13} className="text-up" /> : <Copy size={13} />}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <a
              href={`https://wa.me/?text=${shareText}%20${encodeURIComponent(SITE_URL)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border px-2 py-1 text-foreground-muted hover:text-foreground"
            >
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(SITE_URL)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border px-2 py-1 text-foreground-muted hover:text-foreground"
            >
              X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border px-2 py-1 text-foreground-muted hover:text-foreground"
            >
              LinkedIn
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
