// Sentence splitting for filed summaries (26 Nov 2026). The old splitter cut at every full stop, so "1.56 percent", "Rs. 5,000" and "INR 50,000." broke
// into pieces such as "43." or "56 percent of their holding". A stop ends a sentence only when it is followed by a space and a capital letter, a digit,
// a quote or a bracket, and the word before it is not an abbreviation or an initial. A fragment (no subject, cut off) is never shown as a bullet.

const ABBREVIATIONS = new Set([
  "rs", "inr", "no", "nos", "mr", "mrs", "ms", "dr", "prof", "ltd", "pvt", "inc", "co", "corp", "vs", "approx", "st", "fy", "qtr", "cr", "dept", "govt", "ref", "sr", "jr", "est", "etc", "viz",
  "i.e", "e.g", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec", "mt", "mw", "kv", "sq", "ft",
]);

export function splitSentences(text: string | null | undefined): string[] {
  const raw = (text ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return [];
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    let end = i;
    while (end + 1 < raw.length && /[.!?]/.test(raw[end + 1])) end++;
    const after = raw[end + 1];
    if (after !== undefined && after !== " ") { i = end; continue; } // decimal point, "INR50,000.5", a stop inside a token
    if (ch === "." && end === i) {
      const word = (raw.slice(start, i).match(/([A-Za-z][A-Za-z.]*)$/) ?? [])[1]?.toLowerCase() ?? "";
      if (ABBREVIATIONS.has(word) || /^[A-Za-z]$/.test(word)) { i = end; continue; }
      const next = raw.slice(end + 2).trimStart()[0];
      if (next !== undefined && /[a-z]/.test(next)) { i = end; continue; } // "approx. the" / "e.g. the": the sentence goes on
    }
    out.push(raw.slice(start, end + 1).trim());
    start = end + 2;
    i = end;
  }
  const tail = raw.slice(start).trim();
  if (tail) out.push(tail);
  return out.filter(Boolean);
}

const DANGLING = new Set([
  "the", "a", "an", "of", "to", "for", "during", "regarding", "in", "on", "at", "by", "with", "and", "or", "as", "from", "that", "which", "who", "is", "are", "was", "were", "under", "over", "per",
  "than", "between", "including", "related", "due", "such", "its", "their", "his", "her", "this", "these", "those", "has", "have", "had", "will", "would", "be", "been", "about", "against", "into", "upto",
]);

/** A cut-off or subject-less piece: a bare number, too short, starting in lower case or with an ellipsis, or ending on a joining word ("during.", "regarding the."). */
export function isFragment(sentence: string): boolean {
  const s = sentence.trim();
  if (!s) return true;
  const words = s.replace(/[.!?]+$/, "").split(" ").filter(Boolean);
  if (words.length < 4) return true;
  if (/^[….\-–—,;:)]/.test(s)) return true;
  if (/^[a-z]/.test(s)) return true;
  const last = (words[words.length - 1] ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return DANGLING.has(last);
}

/** Cut a long sentence to `max` words without leaving a dangling end: prefer a clause break, then back off from joining words. A sentence that cannot be cut cleanly is kept whole. */
export function clipSentence(s: string, max: number): string {
  const w = s.split(" ");
  if (w.length <= max) return s;
  const head = w.slice(0, max).join(" ");
  const cut = Math.max(head.lastIndexOf(", "), head.lastIndexOf(";"), head.lastIndexOf(" – "), head.lastIndexOf(" — "));
  let words = (cut > head.length * 0.5 ? head.slice(0, cut) : head).split(" ").filter(Boolean);
  while (words.length > 4 && DANGLING.has((words[words.length - 1] ?? "").toLowerCase().replace(/[^a-z]/g, ""))) words = words.slice(0, -1);
  if (words.length < 5 || DANGLING.has((words[words.length - 1] ?? "").toLowerCase().replace(/[^a-z]/g, ""))) return s;
  return `${words.join(" ").replace(/[,;:–—\s]+$/, "")}.`;
}

/** A bullet that already starts with its own number or dash ("1. Revenue grew") loses that marker: the list draws its own, so it is never shown twice ("1. 1."). */
export function stripListMarker(text: string): string {
  return text.replace(/^\s*(?:\(?\d{1,2}[.)]|[-•*])\s+/, "");
}
