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
}

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
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail = json?.detail ?? json;
    const message = typeof detail === "string" ? detail : res.statusText;
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
