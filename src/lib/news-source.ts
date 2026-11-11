/** A news source as a reader would name it: "livemint.com" -> "Mint". Unknown domains show their main label capitalised. */
const NAMES: Record<string, string> = {
  "livemint.com": "Mint",
  "economictimes.indiatimes.com": "Economic Times",
  "retail.economictimes.indiatimes.com": "ET Retail",
  "business-standard.com": "Business Standard",
  "thehindubusinessline.com": "BusinessLine",
  "thehindu.com": "The Hindu",
  "timesofindia.indiatimes.com": "Times of India",
  "rediff.com": "Rediff",
  "fortune.com": "Fortune",
  "inc42.com": "Inc42",
  "moneycontrol.com": "Moneycontrol",
  "financialexpress.com": "Financial Express",
  "ndtvprofit.com": "NDTV Profit",
  "forbes.com": "Forbes",
  "seekingalpha.com": "Seeking Alpha",
  "prnewswire.com": "PR Newswire",
};

export function sourceName(source: string | null | undefined): string {
  const raw = String(source ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  if (!raw) return "";
  if (NAMES[raw]) return NAMES[raw];
  const parts = raw.split(".");
  const main = parts.length >= 3 && ["co", "com", "org", "net"].includes(parts[parts.length - 2]) ? parts[parts.length - 3] : parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return main.charAt(0).toUpperCase() + main.slice(1);
}
