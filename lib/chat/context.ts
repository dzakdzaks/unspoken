import type { TranslationResult } from "@/lib/schema";
import type { ChatMessage } from "@/lib/llm/types";
import type { Message } from "@/lib/chat/types";

export const RECENT_MESSAGE_LIMIT = 20;
export const SUGGESTIONS_CONTEXT_MESSAGES = 5;

/** Flatten a stored decode message into plain text so it can serve as chat context. */
export function decodeToContext(d: TranslationResult): string {
  return [
    d.translation,
    `Underlying need: ${d.underlying_need}.`,
    `Urgency: ${d.urgency_level}/5.`,
    `Suggested steps: ${d.action_plan.join("; ")}.`,
  ].join("\n");
}

export function messageToChatContent(message: Message): string {
  return message.role === "assistant" && message.kind === "decode" && message.decoded
    ? decodeToContext(message.decoded)
    : message.content;
}

export function buildChatHistory(
  messages: Message[],
  contextSummary?: string | null
): ChatMessage[] {
  const history: ChatMessage[] = [];

  if (contextSummary?.trim()) {
    history.push(
      {
        role: "user",
        content: `[Earlier conversation summary — for context only]\n${contextSummary.trim()}`,
      },
      {
        role: "assistant",
        content: "Understood. I'll keep that earlier context in mind as we continue.",
      }
    );
  }

  for (const message of messages) {
    history.push({
      role: message.role,
      content: messageToChatContent(message),
    });
  }

  return history;
}

export function splitMessagesForContext(messages: Message[]): {
  older: Message[];
  recent: Message[];
} {
  if (messages.length <= RECENT_MESSAGE_LIMIT) {
    return { older: [], recent: messages };
  }

  const splitAt = messages.length - RECENT_MESSAGE_LIMIT;
  return {
    older: messages.slice(0, splitAt),
    recent: messages.slice(splitAt),
  };
}

/** Messages beyond the recent window that are not yet captured in the room summary. */
export function getUnsummarizedOlderMessages(
  messages: Message[],
  summaryThroughMessageId?: string | null
): Message[] {
  const { older } = splitMessagesForContext(messages);
  if (older.length === 0) return [];

  if (!summaryThroughMessageId) return older;

  const lastSummarizedIndex = older.findIndex((m) => m.id === summaryThroughMessageId);
  if (lastSummarizedIndex === -1) return older;

  return older.slice(lastSummarizedIndex + 1);
}

export function formatMessageForTranscript(message: ChatMessage): string {
  const speaker = message.role === "user" ? "User" : "Unspoken";
  return `${speaker}: ${message.content}`;
}

export function formatSuggestionsTranscript(messages: ChatMessage[]): string {
  return messages.map(formatMessageForTranscript).join("\n\n");
}

export function formatMessagesForSummary(messages: Message[]): string {
  return messages
    .map((message) => {
      const speaker = message.role === "user" ? "User" : "Unspoken";
      return `${speaker}: ${messageToChatContent(message)}`;
    })
    .join("\n\n");
}
