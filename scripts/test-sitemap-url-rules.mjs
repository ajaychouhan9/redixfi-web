import assert from "node:assert/strict";
process.argv = [process.argv[0], "test-sitemap-url-rules.mjs"];
const { urlProblems } = await import("./check-sitemap-live.mjs");
const H = "www.redixfi.com";
for (const ok of ["https://www.redixfi.com/", "https://www.redixfi.com/stocks/M%26M", "https://www.redixfi.com/stocks/BAJAJ-AUTO", "https://www.redixfi.com/more/about-us"])
  assert.deepEqual(urlProblems(ok, H), [], ok);
for (const bad of ["https://www.redixfi.com/stocks/$%7Bsymbol%7D", "https://www.redixfi.com/stocks/undefined", "https://www.redixfi.com/signals//TCS",
  "https://redixfi.com/stocks/TCS", "http://www.redixfi.com/", "https://www.redixfi.com/account", "https://www.redixfi.com/stocks/[object%20Object]",
  "https://www.redixfi.com/stocks/TCS/", "https://www.redixfi.com/stocks/%E0%A4"])
  assert.ok(urlProblems(bad, H).length > 0, bad);
console.log("sitemap URL rules: ok");
