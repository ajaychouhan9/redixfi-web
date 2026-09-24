// Next route params can retain percent escapes (for example M%26M). Decode
// once before the API client encodes the symbol for its own URL.
export function stockSymbolFromParam(param: string): string | null {
  try {
    const symbol = decodeURIComponent(param).toUpperCase();
    return /^[A-Z0-9][A-Z0-9&._-]*$/.test(symbol) && /[A-Z]/.test(symbol) ? symbol : null;
  } catch {
    return null;
  }
}
