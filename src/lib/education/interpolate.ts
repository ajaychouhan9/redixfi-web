// Fills {placeholder} tokens in pre-authored content strings with live
// values, mirroring api/docs/metric_explainers.json's own
// `_meta.placeholder_note`: a null/missing value drops silently rather than
// printing "null" or "undefined" — the content is written so the sentence
// still reads cleanly with the token simply removed.
export function interpolate(template: string, ctx: Record<string, string | number | undefined | null>): string {
  return template
    .replace(/\{(\w+)\}/g, (_, key: string) => {
      const v = ctx[key];
      return v === undefined || v === null || v === "" ? "" : String(v);
    })
    // Collapse artifacts left behind by a dropped token: doubled spaces,
    // a space before punctuation, or an empty parenthetical.
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([.,;)])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
