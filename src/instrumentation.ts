// Server-side pacing of calls to the RedixFi API (14 Nov 2026, self-hosting on one VM).
//
// The API limits each caller IP to 120 requests a minute (60 a minute for /history/stockwise). On Vercel the server calls came from many
// IPs; on one VM they all share one IP, so a burst of uncached page renders got HTTP 429. This wraps the real network fetch, which Next's
// own fetch cache sits in front of, so only real calls (cache misses) take a slot: about 100 a minute overall and about 50 a minute for
// stockwise. A call that would wait longer than MAX_WAIT_MS fails fast with a 503 (pages treat that as a transient error and never cache it).
// Browser calls come from user IPs and are not touched. Set API_PACING=off to disable, for example if the API exempts the web host.
const PACE_GENERAL_MS = 600;
const PACE_STOCKWISE_MS = 1200;
const MAX_WAIT_MS = 25_000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.API_PACING === "off") return;
  const apiHost = new URL(process.env.NEXT_PUBLIC_API_URL ?? "https://api.redixfi.com/api/v1").host;
  const realFetch = globalThis.fetch;
  let nextGeneral = 0;
  let nextStockwise = 0;

  globalThis.fetch = async function pacedFetch(input: RequestInfo | URL, init?: RequestInit) {
    let url: URL | null = null;
    try {
      url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    } catch {
      url = null;
    }
    if (!url || url.host !== apiHost) return realFetch(input, init);
    const now = Date.now();
    const stockwise = url.pathname.includes("/history/stockwise");
    const slot = Math.max(now, nextGeneral, stockwise ? nextStockwise : 0);
    if (slot - now > MAX_WAIT_MS) {
      return new Response(JSON.stringify({ detail: "Upstream pacing queue is full; try again shortly" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    nextGeneral = slot + PACE_GENERAL_MS;
    if (stockwise) nextStockwise = slot + PACE_STOCKWISE_MS;
    if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
    return realFetch(input, init);
  } as typeof fetch;
}
