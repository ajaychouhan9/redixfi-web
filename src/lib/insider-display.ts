/**
 * How insider trades are shown (2026-11-11): the category of the person, never the name; the side as the
 * disclosed direction ("Bought" / "Sold", with "(as disclosed)"), not as capital BUY / SELL.
 * The stored name stays in the data; it is only not displayed.
 */

export const NO_CATEGORY = "Category not disclosed";

const CATEGORY_MAP: [RegExp, string][] = [
  [/promoter\s*(&|and)?\s*(promoter\s*)?group|promoter\s*group/i, "Promoter Group"],
  [/promoter/i, "Promoter"],
  [/key\s*managerial|\bkmp\b/i, "KMP"],
  [/director/i, "Director"],
  [/employee|designated/i, "Employee"],
];

/** Category as written in the filing, mapped to the short names; empty / "-" gives "Category not disclosed". */
export function personCategory(t: { person_category?: string | null; raw_data?: Record<string, unknown> | null; relation?: string | null }): string {
  const raw = String(t.person_category ?? (t.raw_data?.personCategory as string | undefined) ?? t.relation ?? "").trim();
  if (!raw || /^[-–—\s]*$/.test(raw) || /^(na|n\/a|nil|none)$/i.test(raw)) return NO_CATEGORY;
  for (const [re, label] of CATEGORY_MAP) if (re.test(raw)) return label;
  return raw;
}

/** "Bought (as disclosed)" / "Sold (as disclosed)"; other disclosed kinds (pledge, revoke ...) keep their own wording. */
export function sideLabel(type: string | null | undefined): string {
  const k = String(type ?? "").trim().toUpperCase();
  if (!k) return "n/a";
  if (k === "BUY" || k === "ACQUISITION" || k === "ACQUIRED") return "Bought (as disclosed)";
  if (k === "SELL" || k === "DISPOSAL" || k === "DISPOSED") return "Sold (as disclosed)";
  const s = String(type).trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
