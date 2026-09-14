/** Whether automatic page-context history lookup may run.
 * An explicitly selected conversation (including a generic one whose chat
 * context is null) is authoritative until New Chat or another intentional
 * selection clears it.
 */
export function mayLoadPageConversation(params: {
  activeConversationId: string | null;
  explicitlySelectedConversationId: string | null;
  freshChat: boolean;
}): boolean {
  return !params.activeConversationId && !params.explicitlySelectedConversationId && !params.freshChat;
}
