import type {
  AskConversationMessage,
  AskScreenResult,
  AskTableResult,
  CompareResult,
  ScoreHistoryPoint,
  SourceCitation,
} from "@/lib/api/types";

/** The single message shape consumed by the live Ask renderer. */
export interface AskRenderableMessage {
  role: "user" | "ai";
  text: string;
  sourceCitations?: SourceCitation[];
  createdAt?: string;
  compare?: CompareResult | null;
  screen?: AskScreenResult | null;
  table?: AskTableResult | null;
  webSourced?: boolean;
  webSourceLabel?: string | null;
  webSourceUrl?: string | null;
  scoreHistory?: ScoreHistoryPoint[] | null;
  resolvedSymbol?: string | null;
  followUps?: string[];
  quotaUnchanged?: boolean;
}

/**
 * Convert a persisted/API history message into the exact object consumed by
 * the live renderer. No query, provider, or business logic runs here: every
 * structured block is copied from the stored canonical Ask response.
 */
export function restoreAskMessage(
  message: AskConversationMessage,
  fallbackSymbol: string | null,
): AskRenderableMessage {
  const assistant = message.role === "assistant";
  return {
    role: assistant ? "ai" : "user",
    text: message.content,
    createdAt: message.created_at,
    sourceCitations: assistant ? message.source_citations : undefined,
    followUps: assistant ? message.follow_ups : undefined,
    resolvedSymbol: assistant ? message.resolved_symbol ?? fallbackSymbol : fallbackSymbol,
    quotaUnchanged: assistant ? message.quota_unchanged : undefined,
    compare: assistant ? message.compare ?? null : undefined,
    screen: assistant ? message.screen ?? null : undefined,
    table: assistant ? message.table ?? null : undefined,
    webSourced: assistant ? message.web_sourced : undefined,
    webSourceLabel: assistant ? message.web_source_label : undefined,
    webSourceUrl: assistant ? message.web_source_url : undefined,
    scoreHistory: assistant ? message.score_history ?? null : undefined,
  };
}

export function restoreAskMessages(
  messages: AskConversationMessage[],
  fallbackSymbol: string | null,
): AskRenderableMessage[] {
  return messages.map((message) => restoreAskMessage(message, fallbackSymbol));
}
