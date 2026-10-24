/**
 * Company display names (display only). The exchange master list stores upper-case, cut-off names such as
 * "TATA CONSULTANCY SERV LT" or "AADHAR HOUSING FINANCE L"; the page shows "Tata Consultancy Services Ltd" and
 * "Aadhar Housing Finance Ltd". A small, safe mapping plus title case: nothing stored, no symbol and no search
 * matching is touched, and a name that already has lower-case letters is left as it is.
 */

// whole-word expansions that are unambiguous
const WORDS: Record<string, string> = {
  SERV: "Services", SERVS: "Services", SVCS: "Services", SRVCS: "Services",
  MGMT: "Management", MNGT: "Management", MNGMT: "Management",
  INDS: "Industries", INDUS: "Industries",
  ENGG: "Engineering", CORP: "Corporation", CORPN: "Corporation",
  INTL: "International", MFG: "Manufacturing", PVT: "Pvt", FINL: "Financial", MKTS: "Markets",
  CO: "Co", AND: "and", OF: "of", THE: "the",
};

// "Limited" in every form it is stored becomes "Ltd"; a cut-off ending (the column is 24 characters) only counts at the
// very end of the name
const LTD_FULL = new Set(["LTD", "LTD.", "LIMITED", "LIMITED."]);
const LTD_CUT = new Set(["L", "LT", "LI", "LIM", "LIMI", "LIMIT", "LIMITE"]);

// Acronyms that must stay upper case (words without vowels are kept automatically)
const KEEP = new Set([
  "ICICI", "IDFC", "ITC", "UPL", "TCS", "SBI", "LIC", "IIFL", "NIIT", "BEML", "BHEL", "GAIL", "SAIL", "ONGC", "IRCTC",
  "IRFC", "IRCON", "RITES", "TV", "AMC", "EID", "EIH", "IFB", "GIC", "ACC", "ABB", "AIA", "AWL", "SKF", "MRF", "DLF",
  "HDFC", "HCL", "NTPC", "NHPC", "PNB", "BSE", "NSE", "IEX", "CDSL", "MCX", "KEC", "KPIT", "PVR", "INOX", "NCC", "GE",
  "LG", "BF", "HP", "UTI", "IDBI", "CESC", "CEAT", "GMR", "GVK", "ZF", "SBFC", "WAM", "TTK", "TVS", "JSW", "JK", "SJVN",
  "NMDC", "MMTC", "STL", "AU", "VST", "NRB", "DCM", "GHCL", "HFCL", "NBCC", "NDTV", "RPG", "RBL", "CSB", "DCB", "HSBC",
]);

// short real words that start company names (not acronyms)
const WORDS_NOT_ACRONYMS = new Set(["ZEE", "ONE", "NEW", "SUN", "SKY", "BAY", "RAM", "SAI", "JAI", "SRI", "OIL", "GOA", "KEY", "MAX", "TEA", "ICE", "WEB", "AIR", "ASK", "ART", "SEA", "SKM"]);

function titleToken(tok: string): string {
  const i = tok.search(/[A-Za-z]/); // "(MADRAS)" -> "(Madras)"
  return i < 0 ? tok : tok.slice(0, i) + tok.charAt(i).toUpperCase() + tok.slice(i + 1).toLowerCase();
}

function cleanToken(tok: string, isLast: boolean, isFirst: boolean): string {
  if (/[a-z]/.test(tok)) return tok; // already mixed case
  const bare = tok.replace(/[(),]/g, "");
  if (!isFirst && (LTD_FULL.has(bare) || (isLast && LTD_CUT.has(bare)))) return "Ltd";
  if (WORDS[bare]) {
    const w = WORDS[bare];
    return isFirst ? titleToken(w) : w;
  }
  if (/\d/.test(bare) || bare.includes("&")) return tok; // 3M, 360, L&T, M&M
  if (KEEP.has(bare)) return tok;
  if (isFirst && /^[A-Z]{2,3}$/.test(bare) && !WORDS_NOT_ACRONYMS.has(bare)) return tok; // a leading 2-3 letter word is an acronym (IRB, UFO, KCP)
  if (/^[A-Z]{1,5}$/.test(bare) && !/[AEIOU]/.test(bare)) return tok; // HDFC-like words without vowels
  // dotted or hyphenated pieces keep their separators
  if (/[.\-/]/.test(tok)) return tok.split(/([.\-/])/).map((p) => (/[.\-/]/.test(p) || p === "" ? p : titleToken(p))).join("");
  return titleToken(tok);
}

/** The name as shown on the page. Empty or missing input is returned as an empty string. */
export function displayName(raw: string | null | undefined): string {
  const name = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!name) return "";
  const toks = name.split(" ");
  if (toks.length === 1) return name; // a single word is usually the symbol itself (MLKFOOD): leave it
  return toks.map((t, i) => cleanToken(t, i === toks.length - 1, i === 0)).join(" ");
}

/** A short form for narrow table headers: the cleaned name without the trailing "Ltd". */
export function shortName(raw: string | null | undefined): string {
  return displayName(raw).replace(/\s+(Ltd|Pvt Ltd)$/i, "");
}
