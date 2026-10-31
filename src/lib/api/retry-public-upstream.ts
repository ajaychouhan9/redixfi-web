import { ApiError } from "./client";

// A brief gateway outage, an API restart or a slow upstream should get uncached retries before a public page fails. 31 Oct 2026: a
// crawler at 5 requests per second got 17 of 2,370 /signals pages as 500 while the API was restarting (500, 502, 503, 504 and
// timeouts), and the old rule retried only 502/503/504 once. A real 404 (or any other 4xx) is never retried or turned into a success.
const TRANSIENT = new Set([429, 500, 502, 503, 504]);
const WAITS_MS = [400, 1500];

function transient(error: unknown): boolean {
  if (error instanceof ApiError) return TRANSIENT.has(error.status);
  return true; // timeout / connection refused / reset: the request never produced an answer
}

export async function retryTransientPublicGet<T>(
  first: () => Promise<T>,
  retry: () => Promise<T>,
): Promise<T> {
  try {
    return await first();
  } catch (error) {
    if (!transient(error)) throw error;
    let last: unknown = error;
    for (const wait of WAITS_MS) {
      await new Promise((r) => setTimeout(r, wait));
      try {
        return await retry();
      } catch (e) {
        if (!transient(e)) throw e;
        last = e;
      }
    }
    throw last;
  }
}
