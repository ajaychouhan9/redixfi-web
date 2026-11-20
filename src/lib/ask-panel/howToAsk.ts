// "How to ask" copy and example chips for the Ask AI empty state (Part B, stage 1).
//
// Cost line: the backend charges exactly ONE question for a delivered answer and nothing when it cannot answer
// (api/app/core/metering.py, locked metering rule). The chips say so; they never promise a higher price.

export const HOW_TO_ASK_LINE = "Name the companies, the numbers and the days.";

// Most stocks one number lookup ("ROE and ROCE for TCS, INFY, WIPRO") can name. Backend: ASK_LOOKUP_MAX_STOCKS = 8 (api/app/core/config.py).
export const LOOKUP_MAX_STOCKS = 8;
export const LOOKUP_LIMIT_NOTE = `Name up to ${LOOKUP_MAX_STOCKS} stocks in one question.`;

/** What a Free account gets (21 Nov 2026): one shared count for the day, on any stock. */
export const FREE_ASK_LINE = "Free accounts get 3 live questions a day on any stock.";
export const CHIP_COST_LINE = "Each answer uses 1 question. If we cannot answer, nothing is used.";

export interface HowToAskGroup {
  id: "company" | "documents" | "numbers" | "compare";
  title: string;
  /** Shown under the group title. */
  hint: string;
  chips: string[];
}

/** The sample company for chips when no stock is open. */
export const HOW_TO_ASK_SAMPLE_SYMBOL = "HINDUNILVR";

export function howToAskGroups(symbol: string | null): HowToAskGroup[] {
  const s = symbol || HOW_TO_ASK_SAMPLE_SYMBOL;
  return [
    {
      id: "company",
      title: "One company's facts",
      hint: "Points to watch and insider trades, with dates and sources.",
      chips: [`List the points to watch for ${s}.`, `Show insider trades in ${s} in the last 90 days.`],
    },
    {
      id: "documents",
      title: "Documents",
      hint: "Read from the latest concall or annual report on file.",
      chips: [
        `What did ${s} management say in the latest concall? List guidance and risks.`,
        `Summarise the key points and risks in the latest ${s} annual report.`,
      ],
    },
    {
      id: "numbers",
      title: "Numbers across companies",
      hint: "ROE, ROCE and debt from stored statements. Name the numbers you want.",
      chips: [
        "Which stocks have ROE above 20 and debt to equity below 0.5?",
        "Which stocks have ROCE above 25 and ROE above 20?",
      ],
    },
    {
      id: "compare",
      title: "Compare",
      hint: "Two or three companies side by side.",
      chips: ["Compare TCS and INFY.", "Compare HINDUNILVR and ITC."],
    },
  ];
}

/** "5 days asked, 4 available" when a table has fewer days than the question asked for; null otherwise. */
export function daysAvailableNote(
  question: string | null | undefined,
  table: { rows: unknown[]; row_count?: number; requested_days?: number | null } | null | undefined,
): string | null {
  if (!table || !Array.isArray(table.rows)) return null;
  const available = table.row_count ?? table.rows.length;
  let asked: number | null = typeof table.requested_days === "number" ? table.requested_days : null;
  if (asked === null && question) {
    const m = /\b(?:last|past|previous)\s+(\d{1,3})\s+(?:trading\s+)?(?:days?|sessions?)\b/i.exec(question);
    if (m) asked = Number(m[1]);
  }
  if (asked === null || !Number.isFinite(asked) || asked <= 0) return null;
  if (available >= asked) return null;
  return `${asked} day${asked === 1 ? "" : "s"} asked, ${available} available`;
}
