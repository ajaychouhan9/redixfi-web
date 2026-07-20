/** Reads the exp claim only — never trust this client-side for authorization, the API re-verifies. */
export function decodeJwtExpiry(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isExpiringSoon(token: string, marginMs = 60_000): boolean {
  const exp = decodeJwtExpiry(token);
  if (exp === null) return true;
  return Date.now() + marginMs >= exp;
}
