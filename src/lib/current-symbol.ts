"use client";

// Lets pages with one obvious current stock (Signal detail, Research
// detail) preset the persistent "RedixFi AI" button's conversation instead
// of making the user go through AskRedixFi's symbol-search step first —
// see AskRedixFi.tsx and CurrentSymbolSync.tsx. Home/Signals list have no
// single current stock, so they never call setCurrentSymbol and the search
// step still runs there, unchanged.

const EVENT = "redixfi:current-symbol-changed";
let current: string | null = null;

export function getCurrentSymbol(): string | null {
  return current;
}

export function setCurrentSymbol(symbol: string | null) {
  current = symbol;
  window.dispatchEvent(new Event(EVENT));
}

export function onCurrentSymbolChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
