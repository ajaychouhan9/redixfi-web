"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { getPublicChannels } from "@/lib/api/mutations";
import type { PublicChannelLink, PublicChannelLinks } from "@/lib/api/types";
import { MORNING_BRIEF_CHANNELS_ANCHOR_ID } from "@/lib/publicChannels";

/**
 * Account → Alerts → Delivery channels: the PUBLIC Morning Brief channels
 * (2026-09-12 task).
 *
 * Deliberately a SEPARATE card from DeliveryChannelsCard: those are the
 * user's PERSONALIZED alert channels (email / personalized Telegram / browser
 * push), which stay tier-gated exactly as before. The public Morning Brief
 * channels are public distribution — available to every tier, no Ask AI
 * quota, and following them is not a subscription entitlement.
 *
 * This card is the ONLY place in the app that shows a channel link or the
 * configured follow URLs; the daily in-app discovery notification only points
 * here.
 */
export function MorningBriefChannelsCard() {
  const { user, getToken } = useAuth();
  const [channels, setChannels] = useState<PublicChannelLinks | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const token = await getToken();
      if (!token) return;
      try {
        const res = await getPublicChannels(token);
        if (!cancelled) setChannels(res.channels);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  return (
    <div id={MORNING_BRIEF_CHANNELS_ANCHOR_ID} className="scroll-mt-24">
      <Card title="Morning Brief channels">
        <p className="mb-3 text-xs text-foreground-muted">
          Public channels for the daily RedixFi Morning Brief — separate from your personalized alerts.
          Anyone can follow them, and they don&apos;t use your Ask AI questions.
        </p>
        {failed ? (
          <p className="text-sm text-foreground-muted">Channel details are temporarily unavailable. Please try again later.</p>
        ) : (
          <ul className="divide-y divide-border">
            <ChannelRow
              label="WhatsApp channel"
              help="Manual daily copy of the Morning Brief."
              link={channels?.whatsapp ?? null}
            />
            <ChannelRow
              label="Telegram channel"
              help="Published automatically from the same Morning Brief."
              link={channels?.telegram ?? null}
            />
          </ul>
        )}
      </Card>
    </div>
  );
}

function ChannelRow({ label, help, link }: { label: string; help: string; link: PublicChannelLink | null }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-foreground-muted">{help}</p>
      </div>
      {link?.configured && link.url ? (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-accent px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10"
        >
          Follow / Open
        </a>
      ) : (
        <span className="shrink-0 text-xs text-foreground-faint">Coming soon</span>
      )}
    </li>
  );
}
