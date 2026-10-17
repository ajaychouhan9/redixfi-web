// Checks a live sitemap: every URL must be well formed, listed once, return 200
// without a redirect, and (for HTML pages) carry a canonical tag naming itself.
// Usage: node scripts/check-sitemap-live.mjs [base-url] [--sample N] [--delay ms]
// Exit code 1 if anything fails. Requests run two at a time with a pause between pairs.

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) ?? "https://www.redixfi.com").replace(/\/$/, "");
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : dflt; };
const sample = opt("--sample", 0);
const delay = opt("--delay", 300);
const HOST = new URL(base).host;

export function urlProblems(url, host = HOST) {
  const out = [];
  let u;
  try { u = new URL(url); } catch { return ["not a valid URL"]; }
  if (u.protocol !== "https:") out.push("not https");
  if (u.host !== host) out.push(`host is ${u.host}`);
  if (u.search || u.hash) out.push("has query or fragment");
  const path = u.pathname;
  if (path.includes("//")) out.push("double slash");
  if (/[$\s{}<>"'`\\]|%24|%7B|%7D|%20/i.test(path)) out.push("template or special character");
  if (/(^|\/)(undefined|null|NaN)(\/|$)|\[object/i.test(path)) out.push("placeholder value");
  if (/\/(account|admin|api|login)(\/|$)/.test(path)) out.push("private or non-content page");
  if (path.length > 1 && path.endsWith("/")) out.push("trailing slash");
  try { decodeURIComponent(path); } catch { out.push("bad percent-encoding"); }
  return out;
}

async function main() {
  const res = await fetch(`${base}/sitemap.xml`, { redirect: "manual" });
  if (res.status !== 200) { console.error(`sitemap.xml returned ${res.status}`); process.exit(1); }
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replaceAll("&amp;", "&"));
  const fails = [];
  const seen = new Map();
  for (const url of urls) {
    for (const p of urlProblems(url)) fails.push(`${url}: ${p}`);
    let key = url;
    try { key = decodeURIComponent(url).toLowerCase(); } catch { /* reported above */ }
    if (seen.has(key)) fails.push(`${url}: same page as ${seen.get(key)}`);
    else seen.set(key, url);
  }
  let todo = urls;
  if (sample > 0 && sample < urls.length) {
    todo = [...urls].sort(() => Math.random() - 0.5).slice(0, sample);
    todo = [...new Set([...urls.filter((u) => !u.includes("/stocks/")), ...todo])];   // core pages always
  }
  const counts = {};
  const one = async (url) => {
    try {
      const r = await fetch(url, { redirect: "manual", headers: { "User-Agent": "RedixFi-sitemap-check/1.0" }, signal: AbortSignal.timeout(60_000) });
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (r.status !== 200) { fails.push(`${url}: HTTP ${r.status}${r.headers.get("location") ? ` -> ${r.headers.get("location")}` : ""}`); return; }
      if (!(r.headers.get("content-type") ?? "").includes("text/html")) return;
      const html = await r.text();
      const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      if (!canon) fails.push(`${url}: no canonical tag`);
      else if (canon !== url) fails.push(`${url}: canonical is ${canon}`);
      if (/<meta name="robots" content="[^"]*noindex/.test(html)) fails.push(`${url}: noindex`);
    } catch (e) {
      counts.ERR = (counts.ERR ?? 0) + 1;
      fails.push(`${url}: ${e.name === "TimeoutError" ? "timeout" : e.message}`);
    }
  };
  for (let i = 0; i < todo.length; i += 2) {
    await Promise.all(todo.slice(i, i + 2).map(one));
    await new Promise((r) => setTimeout(r, delay));
  }
  console.log(`sitemap URLs: ${urls.length}, requested: ${todo.length}, status counts: ${JSON.stringify(counts)}`);
  if (fails.length) {
    console.error(`FAILED (${fails.length}):\n  ${fails.slice(0, 50).join("\n  ")}${fails.length > 50 ? `\n  ... ${fails.length - 50} more` : ""}`);
    process.exit(1);
  }
  console.log("OK: every URL is well formed, listed once, returns 200 and names itself as canonical.");
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/check-sitemap-live.mjs")) {
  await main();
}
