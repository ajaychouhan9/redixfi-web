"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { useRef } from "react";

/** Shared CSV-export button — previously the Signals list and Research
 * detail page each hand-rolled their own near-identical button markup +
 * loading state around a bespoke onClick (audit finding, 2026-08-08: not
 * actually a "reusable export component," two one-offs sharing only the
 * low-level downloadCsv() serializer). Pulled out so the button UI/
 * disabled-tooltip/loading-label behavior is genuinely shared. The split
 * Download control keeps CSV available while adding the shared XLSX format. */
export function ExportButton({
  onExport,
  onCsv,
  onXlsx,
  canExport,
  label = "CSV",
  disabledTitle = "Upgrade to export CSV",
  enabledTitle = "Export as CSV",
  className = "flex items-center gap-1 rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-foreground-muted disabled:opacity-40",
}: {
  onExport: () => void | Promise<void>;
  onCsv?: () => void | Promise<void>;
  onXlsx?: () => void | Promise<void>;
  canExport: boolean;
  label?: string;
  disabledTitle?: string;
  enabledTitle?: string;
  className?: string;
}) {
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function handleClick() {
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  }

  async function handleFormatClick(action: () => void | Promise<void>) {
    setOpen(false);
    setExporting(true);
    try {
      await action();
    } finally {
      setExporting(false);
    }
  }

  const hasFormats = Boolean(onCsv && onXlsx);
  if (hasFormats) {
    return (
      <div ref={menuRef} className="relative inline-flex">
        <button type="button" onClick={() => handleFormatClick(onCsv!)} disabled={!canExport || exporting} title={canExport ? "Download CSV" : disabledTitle} className={`${className} rounded-r-none`}>
          <Download size={11} /> {exporting ? "Exporting…" : "Download"}
        </button>
        <button type="button" onClick={() => setOpen((value) => !value)} disabled={!canExport || exporting} aria-label="Choose download format" title="Choose download format" className={`${className} rounded-l-none border-l-0 px-1.5`}>
          <ChevronDown size={12} />
        </button>
        {open && canExport && (
          <div className="absolute right-0 top-full z-30 mt-1 min-w-36 rounded-lg border border-border bg-surface-raised p-1 text-xs shadow-lg">
            <button type="button" className="block w-full rounded px-2 py-1.5 text-left hover:bg-hover" onClick={() => handleFormatClick(onXlsx!)}>Excel (.xlsx)</button>
            <button type="button" className="block w-full rounded px-2 py-1.5 text-left hover:bg-hover" onClick={() => handleFormatClick(onCsv!)}>CSV (.csv)</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button type="button" onClick={handleClick} disabled={!canExport || exporting} title={canExport ? enabledTitle : disabledTitle} className={className}>
      <Download size={11} /> {exporting ? "Exporting…" : label}
    </button>
  );
}
