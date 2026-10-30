"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileDown, Lock, Share2 } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  downloadReportPdf,
  downloadShareCard,
  getReportStatus,
  reportErrorMessage,
  type ReportStatus,
} from "@/lib/api/reports";
import { lockedText } from "@/lib/report-copy";
import { useReportQuotaConfig } from "@/lib/report-quota";

const BTN =
  "flex items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60";

/** Save a Blob as a file. Works on phones too: a temporary link with the download attribute (iOS 13+ and Android), else the file opens in a tab. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (!("download" in a)) window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * "Download report (PDF)" and "Share" for one stock, shown beside the Excel / Compare / Watchlist buttons.
 * Anonymous and Free visitors see a locked state that points at the free sample report; Basic and Pro see how many
 * of their reports are used; a stock without enough data shows a disabled button with the plain reason.
 * The share card carries measured facts only (no governance items, no summaries).
 */
export function ReportActions({ symbol }: { symbol: string }) {
  const { user, getToken } = useAuth();
  const quotaCfg = useReportQuotaConfig();
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [busy, setBusy] = useState<"pdf" | "share" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = user ? await getToken() : null;
      const env = await getReportStatus(symbol, { token });
      setStatus(env.data);
    } catch {
      setStatus(null);
    }
  }, [symbol, user, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDownload() {
    setMsg(null);
    setBusy("pdf");
    try {
      const token = await getToken();
      if (!token) {
        setMsg("Log in to download company reports. The free sample report is open to everyone.");
        return;
      }
      const { blob, filename } = await downloadReportPdf(symbol, token);
      saveBlob(blob, filename ?? `RedixFi-${symbol}-report.pdf`);
      await load();
    } catch (e) {
      setMsg(reportErrorMessage(e));
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function onShare() {
    setMsg(null);
    setBusy("share");
    try {
      const { blob } = await downloadShareCard(symbol);
      const file = new File([blob], `RedixFi-${symbol}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${symbol} measured facts`, text: "Measured data, not investment advice." });
      } else {
        saveBlob(blob, file.name);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setMsg(reportErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const unavailable = status ? !status.available : false;
  const locked = !!status && status.available && status.lock !== null;
  const disabled = !status || unavailable || locked || busy !== null;
  const title = unavailable
    ? `Report not available: ${status!.reason}`
    : locked
      ? lockedText(quotaCfg)
      : "Download the company report as a PDF";

  return (
    <>
      <button type="button" className={BTN} onClick={onDownload} disabled={disabled} title={title} data-testid="report-download">
        {locked ? <Lock size={13} /> : <FileDown size={13} />}
        {busy === "pdf" ? "Preparing report…" : "Download report (PDF)"}
      </button>
      <button type="button" className={BTN} onClick={onShare} disabled={busy !== null || unavailable} title="Share a card with measured facts only" data-testid="report-share">
        <Share2 size={13} />
        {busy === "share" ? "Preparing…" : "Share"}
      </button>
      <div className="w-full text-[11px] leading-snug text-foreground-faint" data-testid="report-note" aria-live="polite">
        {unavailable && <p>Report not available: {status!.reason}</p>}
        {locked && status!.lock === "quota_used" && (
          <p>
            {status!.quota.text}. Reports you already downloaded stay free to download again.{" "}
            <Link href="/pricing" className="underline">See plans</Link>
          </p>
        )}
        {locked && status!.lock !== "quota_used" && (
          <p>
            {lockedText(quotaCfg)}{" "}
            <Link href="/sample-report" className="underline">See the free sample report</Link>
            {" · "}
            <Link href="/pricing" className="underline">See plans</Link>
          </p>
        )}
        {!unavailable && !locked && status && status.quota.limit > 0 && <p>{status.quota.text}. Measured data, not investment advice.</p>}
        {msg && <p className="text-amber" role="alert">{msg}</p>}
      </div>
    </>
  );
}
