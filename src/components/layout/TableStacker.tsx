"use client";

import { useEffect } from "react";

/**
 * Phone tables (21 Nov 2026). Under 640 px every table is drawn as stacked cards by the CSS in globals.css (label on top, full text below, no
 * sideways scroll); the normal table stays on wider screens. The CSS needs each cell to carry its column name, so this component copies the
 * header text into a data-label on every cell, for tables that exist now and for any added later (Ask AI answers, lists that load). Nothing
 * is fetched and no wording changes. A table with data-no-stack is left alone.
 */
export function labelTable(table: HTMLTableElement): void {
  if (table.hasAttribute("data-no-stack") || table.closest("[data-no-stack]")) return;
  const headRow = table.tHead?.rows[table.tHead.rows.length - 1] ?? null;
  const labels: string[] = [];
  if (headRow) {
    for (const c of Array.from(headRow.cells)) {
      const text = (c.textContent ?? "").replace(/\s+/g, " ").trim();
      for (let i = 0; i < Math.max(1, c.colSpan); i++) labels.push(text);
    }
  }
  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      let col = 0;
      for (const cell of Array.from(row.cells)) {
        const label = labels[col] ?? "";
        if (label && cell.getAttribute("data-label") !== label) cell.setAttribute("data-label", label);
        col += Math.max(1, cell.colSpan);
      }
    }
  }
  if (table.getAttribute("data-stack") !== "1") table.setAttribute("data-stack", "1");
}

export function TableStacker() {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      frame = 0;
      document.querySelectorAll("table").forEach((t) => labelTable(t as HTMLTableElement));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(run);
    };
    run();
    const obs = new MutationObserver(schedule);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
