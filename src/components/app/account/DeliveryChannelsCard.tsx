"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { isProEntitled } from "@/lib/entitlements";
import { enableWebPush, disableWebPush, webPushSupported } from "@/lib/push/webPush";
import { getTelegramLinkCode, getTelegramStatus, unlinkTelegram } from "@/lib/api/mutations";
import { telegramBotUsername, telegramStartCommand, telegramWebLink } from "@/lib/telegram";
import type { MeProfile } from "@/lib/api/types";

/** "Enable browser notifications" + "Connect Telegram" (2026-09-11 task).
 * Pro-only — mirrors plan_limits.py's alert_delivery_channels (only Pro
 * has "push"/"telegram"); showing these toggles to a tier that can never
 * actually receive anything through them would be misleading, same
 * reasoning ExportButton/SignalsExplorer's own Pro gates already use. */
export function DeliveryChannelsCard({ profile, onProfileChange }: { profile: MeProfile; onProfileChange: (next: MeProfile) => void }) {
  const { user, getToken } = useAuth();
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [tgCode, setTgCode] = useState<{ code: string; deep_link: string | null } | null>(null);
  const [tgBusy, setTgBusy] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);
  const [tgCopied, setTgCopied] = useState(false);

  if (!isProEntitled(user)) {
    return (
      <Card title="Delivery channels">
        <p className="text-sm text-foreground-muted">
          Browser push notifications and Telegram alerts are available on Pro.{" "}
          <a href="/pricing" className="font-medium text-accent hover:underline">
            See pricing
          </a>
          .
        </p>
      </Card>
    );
  }

  async function togglePush() {
    setPushError(null);
    setPushBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please log in again.");
      if (profile.web_push_enabled) {
        await disableWebPush(token);
        onProfileChange({ ...profile, web_push_enabled: false });
      } else {
        await enableWebPush(token);
        onProfileChange({ ...profile, web_push_enabled: true });
      }
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPushBusy(false);
    }
  }

  // Polls GET /telegram/status every 3s while a code is shown and not yet
  // linked — the actual linking happens server-side (the founder's bot
  // webhook, entirely outside this tab), so the ONLY way this page can
  // reflect it without a manual refresh is asking again itself.
  useEffect(() => {
    if (!tgCode || profile.telegram_linked) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      const status = await getTelegramStatus(token).catch(() => null);
      if (status?.linked && !cancelled) {
        onProfileChange({ ...profile, telegram_linked: true });
        setTgCode(null);
      }
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [tgCode, profile, getToken, onProfileChange]);

  async function requestTelegramCode() {
    setTgError(null);
    setTgBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please log in again.");
      const result = await getTelegramLinkCode(token);
      setTgCode(result);
    } catch (e) {
      setTgError(e instanceof Error ? e.message : "Could not generate a linking code.");
    } finally {
      setTgBusy(false);
    }
  }

  async function disconnectTelegram() {
    setTgBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please log in again.");
      await unlinkTelegram(token);
      onProfileChange({ ...profile, telegram_linked: false });
      setTgCode(null);
    } catch (e) {
      setTgError(e instanceof Error ? e.message : "Could not disconnect Telegram.");
    } finally {
      setTgBusy(false);
    }
  }

  // The linking code must survive even when neither the app nor Telegram Web
  // can carry the deep link (e.g. Telegram Web drops `tgaddr` when the user
  // isn't logged in yet) — so the plain `/start <code>` command is always
  // shown and copyable.
  async function copyStartCommand() {
    if (!tgCode) return;
    try {
      await navigator.clipboard.writeText(telegramStartCommand(tgCode.code));
      setTgCopied(true);
      window.setTimeout(() => setTgCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (permissions / insecure context) — the
      // command stays visible and selectable, so nothing is surfaced.
    }
  }

  const tgBot = telegramBotUsername(tgCode?.deep_link);
  const tgWebLink = tgCode ? telegramWebLink(tgCode.deep_link, tgCode.code) : null;

  return (
    <Card title="Delivery channels">
      <div className="divide-y divide-border">
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-medium">Browser notifications</p>
            <p className="text-xs text-foreground-muted">
              {webPushSupported()
                ? "Push alerts to this browser, even when RedixFi isn't open."
                : "Not available — this browser or connection isn't configured for push yet."}
            </p>
            {pushError && <p className="mt-1 text-xs text-down">{pushError}</p>}
          </div>
          <button
            onClick={togglePush}
            disabled={pushBusy || !webPushSupported()}
            role="switch"
            aria-checked={profile.web_push_enabled}
            className={`h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${profile.web_push_enabled ? "bg-accent" : "bg-neutral-bg"}`}
          >
            <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${profile.web_push_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        <div className="py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Telegram</p>
              <p className="text-xs text-foreground-muted">
                {profile.telegram_linked ? "Connected — alerts are delivered to your linked chat." : "Get alerts in Telegram — free, no app install needed."}
              </p>
            </div>
            {profile.telegram_linked ? (
              <button
                onClick={disconnectTelegram}
                disabled={tgBusy}
                className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground disabled:opacity-40"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={requestTelegramCode}
                disabled={tgBusy}
                className="shrink-0 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground disabled:opacity-40"
              >
                Connect Telegram
              </button>
            )}
          </div>
          {tgError && <p className="mt-2 text-xs text-down">{tgError}</p>}
          {tgCode && !profile.telegram_linked && (
            <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs">
              {/* Two ways in, same payload: the normal t.me deep link (mobile
                  / Telegram Desktop installed) and Telegram Web (no install).
                  Without the web option, a desktop browser whose START button
                  fires an unregistered tg:// URL dead-ends the link. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {tgCode.deep_link && (
                  <a href={tgCode.deep_link} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
                    Open in the Telegram app →
                  </a>
                )}
                {tgWebLink && (
                  <a href={tgWebLink} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
                    Use Telegram Web (no app needed) →
                  </a>
                )}
              </div>
              {/* The plain command is the always-works fallback (any Telegram
                  client, and it survives Telegram Web's login redirect) — so
                  the linking code is never lost. */}
              <p className="text-foreground-muted">
                {tgBot ? (
                  <>
                    Or open <span className="font-semibold text-foreground">@{tgBot}</span> in Telegram and send:
                  </>
                ) : (
                  <>Open our Telegram bot and send:</>
                )}{" "}
                <span className="font-mono font-semibold text-foreground">{telegramStartCommand(tgCode.code)}</span>{" "}
                <button
                  type="button"
                  onClick={copyStartCommand}
                  className="rounded border border-border px-1.5 py-0.5 font-medium text-foreground-muted hover:text-foreground"
                >
                  {tgCopied ? "Copied" : "Copy code"}
                </button>
              </p>
              <p className="text-foreground-faint">Code expires in 15 minutes. This page updates automatically once linked.</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
