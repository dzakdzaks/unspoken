import { describe, it, expect } from "vitest";
import type { Message } from "@/lib/chat/types";
import type { TranslationResult } from "@/lib/schema";
import {
  decodeToContext,
  messageToChatContent,
  buildChatHistory,
  splitMessagesForContext,
  getUnsummarizedOlderMessages,
  formatMessageForTranscript,
  formatMessagesForSummary,
  formatSuggestionsTranscript,
  formatClarifyTranscriptForDecode,
  RECENT_MESSAGE_LIMIT,
} from "@/lib/chat/context";

const makeDecodeResult = (overrides?: Partial<TranslationResult>): TranslationResult => ({
  raw_input: "Fine, do whatever you want.",
  translation: "She wants you to notice she's upset.",
  underlying_need: "Reassurance",
  underlying_need_hue: 25,
  urgency_level: 3,
  urgency_label: "Needs attention today",
  urgency_summary: "Tension will grow if ignored.",
  action_plan: ["Ask what helps", "Acknowledge feelings", "Suggest a walk"],
  follow_ups: ["What's wrong?", "I'm listening", "Can we talk?"],
  ...overrides,
});

const makeMessage = (overrides: Partial<Message>): Message => ({
  id: "msg-1",
  roomId: "room-1",
  role: "user",
  kind: "text",
  content: "Hello",
  createdAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("decodeToContext", () => {
  it("flattens decode result into plain text", () => {
    const d = makeDecodeResult();
    const result = decodeToContext(d);
    expect(result).toContain(d.translation);
    expect(result).toContain("Underlying need: Reassurance");
    expect(result).toContain("Urgency: 3/5");
    expect(result).toContain("Ask what helps; Acknowledge feelings; Suggest a walk");
  });
});

describe("messageToChatContent", () => {
  it("returns raw content for user messages", () => {
    const msg = makeMessage({ role: "user", content: "Hello" });
    expect(messageToChatContent(msg)).toBe("Hello");
  });

  it("returns raw content for assistant text messages", () => {
    const msg = makeMessage({ role: "assistant", kind: "text", content: "I see" });
    expect(messageToChatContent(msg)).toBe("I see");
  });

  it("returns decoded context for assistant decode messages", () => {
    const decoded = makeDecodeResult();
    const msg = makeMessage({
      role: "assistant",
      kind: "decode",
      decoded,
    });
    const result = messageToChatContent(msg);
    expect(result).toContain(decoded.translation);
    expect(result).toContain("Underlying need: Reassurance");
  });

  it("returns raw content for assistant decode without decoded data", () => {
    const msg = makeMessage({
      role: "assistant",
      kind: "decode",
      decoded: undefined,
      content: "fallback",
    });
    expect(messageToChatContent(msg)).toBe("fallback");
  });

  it("returns content for clarify messages", () => {
    const msg = makeMessage({
      role: "assistant",
      kind: "clarify",
      content: "Can you elaborate?",
    });
    expect(messageToChatContent(msg)).toBe("Can you elaborate?");
  });
});

describe("buildChatHistory", () => {
  it("builds history without summary", () => {
    const messages = [
      makeMessage({ id: "1", role: "user", content: "Hello" }),
      makeMessage({ id: "2", role: "assistant", kind: "text", content: "Hi there" }),
    ];
    const history = buildChatHistory(messages);
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ role: "user", content: "Hello" });
    expect(history[1]).toEqual({ role: "assistant", content: "Hi there" });
  });

  it("prepends summary context when provided", () => {
    const messages = [
      makeMessage({ id: "1", role: "user", content: "What's next?" }),
    ];
    const history = buildChatHistory(messages, "Previous convo about trust issues.");
    expect(history).toHaveLength(3);
    expect(history[0].content).toContain("Previous convo about trust issues");
    expect(history[0].role).toBe("user");
    expect(history[1].role).toBe("assistant");
    expect(history[1].content).toContain("Understood");
    expect(history[2].role).toBe("user");
  });

  it("ignores empty summary", () => {
    const messages = [
      makeMessage({ id: "1", role: "user", content: "Hello" }),
    ];
    const history = buildChatHistory(messages, "");
    expect(history).toHaveLength(1);
  });

  it("ignores whitespace-only summary", () => {
    const messages = [
      makeMessage({ id: "1", role: "user", content: "Hello" }),
    ];
    const history = buildChatHistory(messages, "   ");
    expect(history).toHaveLength(1);
  });

  it("converts assistant decode messages to context format", () => {
    const decoded = makeDecodeResult();
    const messages = [
      makeMessage({ id: "1", role: "user", content: "She said fine" }),
      makeMessage({
        id: "2",
        role: "assistant",
        kind: "decode",
        decoded,
      }),
    ];
    const history = buildChatHistory(messages);
    expect(history).toHaveLength(2);
    expect(history[1].content).toContain(decoded.translation);
    expect(history[1].content).toContain("Underlying need:");
  });
});

describe("splitMessagesForContext", () => {
  it("returns all as recent when under the limit", () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      makeMessage({ id: String(i) })
    );
    const result = splitMessagesForContext(messages);
    expect(result.older).toHaveLength(0);
    expect(result.recent).toHaveLength(5);
  });

  it("returns all as recent when exactly at the limit", () => {
    const messages = Array.from({ length: RECENT_MESSAGE_LIMIT }, (_, i) =>
      makeMessage({ id: String(i) })
    );
    const result = splitMessagesForContext(messages);
    expect(result.older).toHaveLength(0);
    expect(result.recent).toHaveLength(RECENT_MESSAGE_LIMIT);
  });

  it("splits when over the limit", () => {
    const total = RECENT_MESSAGE_LIMIT + 3;
    const messages = Array.from({ length: total }, (_, i) =>
      makeMessage({ id: String(i) })
    );
    const result = splitMessagesForContext(messages);
    expect(result.older).toHaveLength(3);
    expect(result.recent).toHaveLength(RECENT_MESSAGE_LIMIT);
  });

  it("preserves order in older and recent slices", () => {
    const total = RECENT_MESSAGE_LIMIT + 2;
    const messages = Array.from({ length: total }, (_, i) =>
      makeMessage({ id: String(i) })
    );
    const result = splitMessagesForContext(messages);
    expect(result.older[0].id).toBe("0");
    expect(result.older[1].id).toBe("1");
    expect(result.recent[0].id).toBe(String(total - RECENT_MESSAGE_LIMIT));
  });
});

describe("getUnsummarizedOlderMessages", () => {
  it("returns empty when no older messages", () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      makeMessage({ id: String(i) })
    );
    expect(getUnsummarizedOlderMessages(messages)).toHaveLength(0);
  });

  it("returns all older messages when no summary exists", () => {
    const total = RECENT_MESSAGE_LIMIT + 3;
    const messages = Array.from({ length: total }, (_, i) =>
      makeMessage({ id: String(i) })
    );
    const result = getUnsummarizedOlderMessages(messages, null);
    expect(result).toHaveLength(3);
  });

  it("returns only unsummarized older messages after summaryThroughMessageId", () => {
    const total = RECENT_MESSAGE_LIMIT + 5;
    const messages = Array.from({ length: total }, (_, i) =>
      makeMessage({ id: String(i) })
    );
    // First 3 older messages (0,1,2) have been summarized through id "2"
    const result = getUnsummarizedOlderMessages(messages, "2");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("3");
    expect(result[1].id).toBe("4");
  });

  it("returns all older when summaryThroughMessageId not found", () => {
    const total = RECENT_MESSAGE_LIMIT + 3;
    const messages = Array.from({ length: total }, (_, i) =>
      makeMessage({ id: String(i) })
    );
    const result = getUnsummarizedOlderMessages(messages, "nonexistent");
    expect(result).toHaveLength(3);
  });

  it("returns empty when all older messages are summarized", () => {
    const total = RECENT_MESSAGE_LIMIT + 3;
    const messages = Array.from({ length: total }, (_, i) =>
      makeMessage({ id: String(i) })
    );
    // Last older message is index 2 (0,1,2), so summarizing through "2" means none left
    const result = getUnsummarizedOlderMessages(messages, "2");
    expect(result).toHaveLength(0);
  });
});

describe("formatMessageForTranscript", () => {
  it("formats user message", () => {
    const result = formatMessageForTranscript({ role: "user", content: "Hello" });
    expect(result).toBe("User: Hello");
  });

  it("formats assistant message", () => {
    const result = formatMessageForTranscript({ role: "assistant", content: "Hi" });
    expect(result).toBe("Unspoken: Hi");
  });
});

describe("formatSuggestionsTranscript", () => {
  it("joins messages with double newlines", () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi" },
    ];
    const result = formatSuggestionsTranscript(messages);
    expect(result).toBe("User: Hello\n\nUnspoken: Hi");
  });
});

describe("formatMessagesForSummary", () => {
  it("formats user and assistant messages", () => {
    const messages = [
      makeMessage({ id: "1", role: "user", content: "She said hi" }),
      makeMessage({
        id: "2",
        role: "assistant",
        kind: "text",
        content: "I understand",
      }),
    ];
    const result = formatMessagesForSummary(messages);
    expect(result).toBe("User: She said hi\n\nUnspoken: I understand");
  });

  it("formats assistant decode messages using decoded context", () => {
    const decoded = makeDecodeResult();
    const messages = [
      makeMessage({ id: "1", role: "user", content: "She sighed" }),
      makeMessage({
        id: "2",
        role: "assistant",
        kind: "decode",
        decoded,
      }),
    ];
    const result = formatMessagesForSummary(messages);
    expect(result).toContain("Unspoken: ");
    expect(result).toContain(decoded.translation);
  });
});

describe("formatClarifyTranscriptForDecode", () => {
  it("builds transcript from user and clarify messages", () => {
    const messages = [
      makeMessage({ id: "1", role: "user", content: "She seemed quiet" }),
      makeMessage({
        id: "2",
        role: "assistant",
        kind: "clarify",
        content: "What did she say?",
      }),
      makeMessage({ id: "3", role: "user", content: "She said nothing" }),
    ];
    const result = formatClarifyTranscriptForDecode(messages);
    expect(result).toContain("User: She seemed quiet");
    expect(result).toContain("Unspoken (clarifying): What did she say?");
    expect(result).toContain("User: She said nothing");
  });

  it("appends latestInput when provided", () => {
    const messages = [
      makeMessage({ id: "1", role: "user", content: "She said okay" }),
    ];
    const result = formatClarifyTranscriptForDecode(messages, "She said okay but looked away");
    expect(result).toContain("She said okay but looked away");
    expect(result).toContain("User: She said okay");
  });

  it("ignores non-user, non-clarify messages", () => {
    const messages = [
      makeMessage({ id: "1", role: "user", content: "Hi" }),
      makeMessage({
        id: "2",
        role: "assistant",
        kind: "decode",
        content: "decode result",
      }),
    ];
    const result = formatClarifyTranscriptForDecode(messages);
    expect(result).not.toContain("decode result");
    expect(result).toBe("User: Hi");
  });

  it("handles empty message list", () => {
    const result = formatClarifyTranscriptForDecode([]);
    expect(result).toBe("");
  });
});
