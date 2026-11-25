// Three themes (21 Nov 2026): Light (default, was Premium), Dark, Slate. Text pairs must reach 4.5:1; Slate uses the owner's palette.
import { readFileSync } from "node:fs";
import { THEMES, DEFAULT_THEME, readTheme } from "../src/lib/theme/ThemeContext";

let bad = 0;
const ok = (c: boolean, m: string) => { if (!c) { bad++; console.log("FAIL", m); } else console.log("ok  ", m); };
const css = readFileSync("src/app/globals.css", "utf8");
const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0); };
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function block(sel: string): Record<string, string> {
  const m = css.split(`:root[data-theme="${sel}"],`).slice(1).map((p) => p.slice(0, p.indexOf("\n}\n") + 3)).pop() ?? "";
  const out: Record<string, string> = {};
  for (const r of m.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) out[r[1]] = r[2].toLowerCase();
  return out;
}
ok(THEMES.map((t) => t.id).join() === "light,dark,slate" && THEMES.map((t) => t.label).join() === "Light,Dark,Slate", "switcher lists Light, Dark, Slate");
ok(DEFAULT_THEME === "light" && readTheme(null) === "light" && readTheme("premium") === "light" && readTheme("slate") === "slate" && readTheme("dark") === "dark", "Light is the default; an old saved Premium becomes Light");
const s = block("slate");
const want: Record<string, string> = { background: "#f2f5f8", surface: "#ffffff", border: "#d9e0e8", foreground: "#17212b", "foreground-muted": "#526270", accent: "#0f766e", "accent-dim": "#115e59", hover: "#d5eeea" };
for (const [k, v] of Object.entries(want)) ok(s[k] === v, `slate ${k} ${v}`);
for (const th of ["light", "dark", "slate"]) {
  const b = th === "dark" ? { ...block("dark") } : block(th);
  for (const [fg, bg] of [["foreground", "background"], ["foreground", "surface"], ["foreground-muted", "surface"], ["foreground-muted", "background"], ["foreground-faint", "surface"], ["accent", "surface"], ["up", "surface"], ["down", "surface"]] as const) {
    if (!b[fg] || !b[bg]) { ok(false, `${th} has ${fg}/${bg}`); continue; }
    const r = ratio(b[fg], b[bg]);
    ok(r >= (fg === "accent" && th === "dark" ? 3 : 4.5), `${th} ${fg} on ${bg} ${r.toFixed(2)}:1`);
  }
}
// 26 Nov 2026: Light now uses #008555 / #d63a40 (4.6:1 on white); on the grey Slate page those fall under 4.5:1, so Slate keeps its own darker pair
ok(["up", "down"].every((k) => ratio(block("slate")[k], block("slate").background) >= 4.5), "slate gain and loss colours pass 4.5:1 on the Slate page");
console.log(bad ? `${bad} FAILED` : "ALL OK");
process.exit(bad ? 1 : 0);
