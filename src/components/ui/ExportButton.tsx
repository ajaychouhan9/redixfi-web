"use client";

import { useState } from "react";
import { Download } from "lucide-react";

/** Shared CSV-export button — previously the Signals list and Research
 * detail page each hand-rolled their own near-identical button markup +
 * loading state around a bespoke onClick (audit finding, 2026-08-08: not
 * actually a "reusable export component," two one-offs sharing only the
 * low-level downloadCsv() serializer). Pulled out so the button UI/
 * disabled-tooltip/loading-label behavior is genuinely shared; callers
 * still own their own CSV-building logic since Signals' row shape and
 * Research's fundamentals/peers shape have nothing in common. */
export function ExportButton({
  onExport,
  canExport,
  label = "CSV",
  disabledTitle = "Upgrade to export CSV",
  enabledTitle = "Export as CSV",
  className = "flex items-center gap-1 rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-foreground-muted disabled:opacity-40",
}: {
  onExport: () => void | Promise<void>;
  canExport: boolean;
  label?: string;
  disabledTitle?: string;
  enabledTitle?: string;
  className?: string;
}) {
  const [exporting, setExporting] = useState(false);

  async function handleClick() {
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={!canExport || exporting} title={canExport ? enabledTitle : disabledTitle} className={className}>
      <Download size={11} /> {exporting ? "Exporting…" : label}
    </button>
  );
}
