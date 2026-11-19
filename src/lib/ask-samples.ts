// Copy for the stored Ask AI sample answers (19 Nov 2026). The answers themselves are in src/data/ask-samples.json.
export const ASK_PREVIEW = {
  title: "See what Ask AI can answer",
  sampleLine: (name: string) => `Three stored answers for ${name}, a sample company. Each was made once from the company's filings and data, then checked line by line. Nothing is asked when you read them.`,
  note: "Sample, not a suggestion. Not advice.",
  login: "Log in to ask your own question",
  csvLocked: "Log in to download CSV",
} as const;


const norm = (q: string) => q.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
/** The id of the stored sample answer for a question typed or clicked, or null when it is not one of the sample questions. */
export function sampleIdFor(question: string, answers: { id: string; question: string }[], aliases: Record<string, string> = {}): string | null {
  const q = norm(question);
  const extra: Record<string, string> = Object.fromEntries(Object.entries(aliases).map(([text, id]) => [norm(text), id]));
  const own = answers.find((a) => norm(a.question) === q);
  return own ? own.id : extra[q] ?? null;
}
export const LOGIN_FOR_OWN = "Log in to ask your own question or any other company. The sample answers below are open to everyone.";

/** "19 Nov 2026" from an ISO date. */
export function formatStored(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
