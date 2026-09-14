export function resolveVisibleChatSymbol({
  chatContextSymbol,
  selectedSymbol,
  pageSymbol,
  conversationId,
  pageContextSuppressed = false,
}: {
  chatContextSymbol: string | null;
  selectedSymbol: string | null;
  pageSymbol: string | null;
  conversationId: string | null;
  pageContextSuppressed?: boolean;
}): string | null {
  return chatContextSymbol ?? selectedSymbol ?? (conversationId || pageContextSuppressed ? null : pageSymbol);
}
