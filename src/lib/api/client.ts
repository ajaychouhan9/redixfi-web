import type { ApiEnvelope, PagedEnvelope } from "./types";

// Usable from both Server and Client Components: the API is public-CORS
// (nginx allows Vercel origins) and takes a bearer JWT, not a cookie
// secret, so there's nothing here that needs hiding behind a BFF proxy.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.redixfi.com/api/v1";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export interface FetchOpts {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>;
  token?: string | null;
  /** seconds; omit for always-fresh (live data), pass a number for SEO/ISR pages */
  revalidate?: number;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** ms; overrides DEFAULT_TIMEOUT_MS for one call (e.g. a deliberately long export/report fetch). */
  timeoutMs?: number;
}

// 2026-09-11 fix — no request here EVER had a timeout before this. A slow/
// hanging backend response (confirmed live: /research/{symbol} and
// /market/overview intermittently taking 30-60s+ without erroring) doesn't
// just degrade one page — a server-side fetch that never resolves blocks
// Next's build-time static generation for that page indefinitely, and
// (app)/layout.tsx's own market-overview fetch runs on EVERY page under
// it. Three consecutive Vercel deployments failed this way: every
// /account/*, /admin/promo-codes attempt hit Next's own 60s-per-attempt
// external ceiling and got killed from OUTSIDE this file's try/catch
// blocks — those blocks only ever handled a fast rejection, never a hang,
// so they never had a chance to fire. 20s is short enough to resolve
// safely inside Next's 60s ceiling (with headroom for connection+parse)
// while staying generous enough not to false-fail a legitimately slow-but-
// working call.
const DEFAULT_TIMEOUT_MS = 20_000;

function buildUrl(path: string, params?: FetchOpts["params"]) {
  const url = new URL(BASE_URL.replace(/\/$/, "") + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function rawFetch(path: string, opts: FetchOpts = {}): Promise<Response> {
  const url = buildUrl(path, opts.params);
  const headers: Record<string, string> = {};
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const fetchInit: RequestInit & { next?: { revalidate?: number } } = {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  };
  if (typeof opts.revalidate === "number") {
    fetchInit.next = { revalidate: opts.revalidate };
  } else {
    fetchInit.cache = "no-store";
  }

  return fetch(url, fetchInit);
}

async function parseOrThrow(res: Response) {
  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any = null;
  let parsed = text.length === 0; // an empty body is a valid "no content" case
  if (text) {
    try {
      json = JSON.parse(text);
      parsed = true;
    } catch {
      parsed = false;
    }
  }

  // A response that is not JSON (typically an nginx/Cloudflare/Vercel HTML
  // error page, e.g. a 502 Bad Gateway while the API is briefly down)
  // must NEVER escape as a raw `SyntaxError: Unexpected token '<'`. That
  // exact crash failed a Vercel prerender of /track-record on 2026-09-11
  // (upstream returned nginx's `<html>...502...</html>` and this function
  // blindly JSON.parse'd it). Surface a structured ApiError instead, on
  // both a non-2xx status AND a 2xx-status non-JSON body.
  if (!res.ok || !parsed) {
    // Prefer a JSON body's own `detail` string (unchanged behavior); for a
    // non-JSON body keep the readable HTTP status text as the message and
    // stash only a bounded snippet of the body in `detail` for diagnostics.
    const jsonDetail =
      json && typeof json === "object" && typeof json.detail === "string"
        ? json.detail
        : typeof json === "string"
          ? json
          : undefined;
    const message = jsonDetail || (res.ok ? "Expected JSON but received a non-JSON response" : res.statusText || `Request failed with status ${res.status}`);
    const detail = json ?? (text ? text.slice(0, 500) : undefined);
    throw new ApiError(res.status, message, detail);
  }
  return json;
}

/** Single-object endpoints: { meta, data } */
export async function apiGet<T>(path: string, opts?: FetchOpts): Promise<ApiEnvelope<T>> {
  const res = await rawFetch(path, opts);
  return parseOrThrow(res);
}

/** Paginated list endpoints: { meta, data: T[], page_info } */
export async function apiGetPaged<T>(path: string, opts?: FetchOpts): Promise<PagedEnvelope<T>> {
  const res = await rawFetch(path, opts);
  return parseOrThrow(res);
}

/** All mutation endpoints use the same envelope() wrapper as GETs — verified live. */
export async function apiMutate<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  opts?: Omit<FetchOpts, "method" | "body">
): Promise<ApiEnvelope<T>> {
  const res = await rawFetch(path, { ...opts, method, body });
  return parseOrThrow(res);
}

/** Returns null instead of throwing on 404 — for "not generated yet" resources like /brief/latest. */
export async function apiGetOptional<T>(path: string, opts?: FetchOpts): Promise<T | null> {
  try {
    const env = await apiGet<T>(path, opts);
    return env.data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
