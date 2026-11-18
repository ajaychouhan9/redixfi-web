// Copy for the stored Ask AI sample answers (19 Nov 2026). The answers themselves are in src/data/ask-samples.json.
export const ASK_PREVIEW = {
  title: "See what Ask AI can answer",
  sampleLine: (name: string) => `Three stored answers for ${name}, a sample company. Each was made once from the company's filings and data, then checked line by line. Nothing is asked when you read them.`,
  note: "Sample, not a suggestion. Not advice.",
  login: "Log in to ask your own question",
  csvLocked: "Log in to download CSV",
} as const;

/** "19 Nov 2026" from an ISO date. */
export function formatStored(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
