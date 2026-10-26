// Free stock lookups, browser side. A logged-out visitor is told apart by a random id this browser keeps; each stock the
// API lets the visitor open today comes with a signed grant that is sent with that stock's Signals requests so the API
// shows the page at the Free plan limits. Everything here is wrapped in try/catch: storage can be blocked.

const VID_KEY = "redixfi:vid";
const GRANT_KEY = "redixfi:lookup-grants";

function istDay(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function randomId(): string {
  const bytes = new Uint8Array(18);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return "v" + Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 31);
}

export function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(VID_KEY);
    if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
      id = randomId();
      window.localStorage.setItem(VID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

type GrantStore = { day: string; grants: Record<string, string> };

function readStore(): GrantStore {
  try {
    const raw = window.localStorage.getItem(GRANT_KEY);
    const parsed = raw ? (JSON.parse(raw) as GrantStore) : null;
    if (parsed && parsed.day === istDay() && parsed.grants) return parsed;
  } catch {
    /* ignore */
  }
  return { day: istDay(), grants: {} };
}

export function setLookupGrant(symbol: string, grant: string): void {
  if (typeof window === "undefined") return;
  try {
    const s = readStore();
    s.grants[symbol.toUpperCase()] = grant;
    window.localStorage.setItem(GRANT_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** The "X-Lookup-Grant" header value (today's grants, at most six), or null. */
export function lookupGrantHeader(): string | null {
  if (typeof window === "undefined") return null;
  const tokens = Object.values(readStore().grants).slice(-6);
  return tokens.length ? tokens.join(",") : null;
}

/** Paths that need the visitor id and grants (kept narrow so other requests stay simple, header-free GETs). */
export function needsLookupHeaders(path: string): boolean {
  return /^\/lookups(\/|$)/.test(path) || (/^\/signals\/[^/?]+/.test(path) && !/^\/signals\/(movers|industries)(\/|$)/.test(path));
}
