/**
 * Telegram linking deep-link helpers (2026-09-12 task).
 *
 * WHY THIS EXISTS — the desktop bug: `https://t.me/<bot>?start=<code>` is the
 * normal link and works on mobile / when Telegram Desktop is installed. But on
 * a desktop browser WITHOUT Telegram Desktop, the t.me page's "START" button
 * fires a `tg://` URL that the browser has no registered handler for, so the
 * flow dead-ends and the user can't finish linking. Telegram Web accepts the
 * SAME `/start` payload through its `tgaddr` parameter, which is the app-less
 * fallback this module builds.
 *
 * Format: `https://web.telegram.org/a/#?tgaddr=<url-encoded tg:// URL>` where
 * the inner URL is `tg://resolve?domain=<bot>&start=<code>`. The inner URL
 * MUST be URL-encoded — left raw, Telegram Web treats `&start=…` as a separate
 * hash parameter and DROPS the linking code.
 *
 * The generated `/start <code>` command is also exposed as a plain string so
 * the UI can show/copy it: that single string works in ANY Telegram client
 * (app or web), so the linking code survives even if the user isn't logged
 * into Telegram Web yet (Telegram Web can lose `tgaddr` across a login).
 */

/** Extracts the bot username (without `@`) from a `https://t.me/<bot>?…` link. */
export function telegramBotUsername(deepLink: string | null | undefined): string | null {
  if (!deepLink) return null;
  const match = /^https?:\/\/t\.me\/([^/?#]+)/i.exec(deepLink.trim());
  return match ? match[1] : null;
}

/** The exact command the user must send to the bot — preserves the payload. */
export function telegramStartCommand(code: string): string {
  return `/start ${code}`;
}

/**
 * App-less Telegram Web link that opens the bot with the SAME start payload.
 * Returns null when there is no bot username to build it from (the caller
 * then falls back to the plain `/start <code>` instruction).
 */
export function telegramWebLink(deepLink: string | null | undefined, code: string): string | null {
  const bot = telegramBotUsername(deepLink);
  if (!bot) return null;
  const inner = `tg://resolve?domain=${bot}&start=${code}`;
  return `https://web.telegram.org/a/#?tgaddr=${encodeURIComponent(inner)}`;
}
