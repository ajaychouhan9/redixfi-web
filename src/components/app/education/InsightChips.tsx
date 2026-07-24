"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { FaqPanel } from "@/components/app/education/FaqPanel";
import { logEducationEngagement } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import type { InsightChip } from "@/lib/api/types";

/**
 * Surface 1 (Task 12) — the discovery layer for the education system.
 * COMPUTED-FACT chips are code-computed comparisons against the stock's own
 * recent norms (server-side, core/insight_chips.py — never an LLM
 * observation). ENTRY-POINT chips open the metric's explainer or a specific
 * FAQ node. Tapping either logs engagement and opens a small inline panel
 * rather than navigating away, so a reader doesn't lose their place.
 */
export function InsightChips({ chips, symbol }: { chips: InsightChip[]; symbol: string }) {
  const { getToken } = useAuth();
  const [openChip, setOpenChip] = useState<InsightChip | null>(null);

  if (!chips || chips.length === 0) return null;

  async function handleTap(chip: InsightChip) {
    const next = openChip?.metric === chip.metric && openChip?.text === chip.text ? null : chip;
    setOpenChip(next);
    if (next) {
      const token = await getToken();
      logEducationEngagement(token, {
        type: "chip_tap",
        metric: chip.metric,
        question_id: chip.faq_id,
        symbol,
      });
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip, i) => (
          <button key={`${chip.metric}-${i}`} type="button" onClick={() => handleTap(chip)}>
            <Chip tone={chip.type === "entry_point" ? "accent" : "neutral"}>{chip.text}</Chip>
          </button>
        ))}
      </div>
      {openChip && (
        <div className="rounded-lg border border-border bg-surface-raised p-3">
          <FaqPanel metric={openChip.metric} initialQuestionId={openChip.faq_id} symbol={symbol} />
        </div>
      )}
    </div>
  );
}
