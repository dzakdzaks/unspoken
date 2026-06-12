import { describe, it, expect, beforeEach } from "vitest";
import {
  RECENT_MESSAGE_LIMIT,
  splitMessagesForContext,
  getUnsummarizedOlderMessages,
  buildChatHistory,
  decodeToContext,
  messageToChatContent,
} from "@/lib/chat/context";
import {
  makeMessage,
  makeMessageList,
  makeDecodeMessage,
  validDecode,
  resetMessageCounter,
} from "./helpers/fixtures";

describe("splitMessagesForContext", () => {
  beforeEach(() => {
    resetMessageCounter();
  });

  it("returns empty arrays for 0 messages", () => {
    expect(splitMessagesForContext([])).toEqual({ older: [], recent: [] });
  });

  it("keeps all messages in recent when count equals RECENT_MESSAGE_LIMIT", () => {
    const messages = makeMessageList(RECENT_MESSAGE_LIMIT);
    const { older, recent } = splitMessagesForContext(messages);
    expect(older).toEqual([]);
    expect(recent).toEqual(messages);
    expect(recent.length).toBe(20);
  });

  it("splits 21 messages into 1 older and 20 recent", () => {
    const messages = makeMessageList(21);
    const { older, recent } = splitMessagesForContext(messages);
    expect(recent.length).toBe(20);
    expect(older.length).toBe(1);
    expect(recent[recent.length - 1]).toEqual(messages[20]);
    expect(older[0]).toEqual(messages[0]);
  });

  it("splits 25 messages into 5 older and 20 recent", () => {
    const messages = makeMessageList(25);
    const { older, recent } = splitMessagesForContext(messages);
    expect(recent.length).toBe(20);
    expect(older.length).toBe(5);
    expect(recent[recent.length - 1]).toEqual(messages[24]);
  });
});

describe("getUnsummarizedOlderMessages", () => {
  beforeEach(() => {
    resetMessageCounter();
  });

  it("returns empty when total messages fit in recent window", () => {
    const messages = makeMessageList(20);
    expect(getUnsummarizedOlderMessages(messages)).toEqual([]);
  });

  it("returns all older messages when no summary cursor is set", () => {
    const messages = makeMessageList(25);
    const unsummarized = getUnsummarizedOlderMessages(messages);
    expect(unsummarized.length).toBe(5);
    expect(unsummarized.map((m) => m.id)).toEqual([
      "msg-1",
      "msg-2",
      "msg-3",
      "msg-4",
      "msg-5",
    ]);
  });

  it("returns only messages after the summary cursor", () => {
    const messages = makeMessageList(25);
    const { older } = splitMessagesForContext(messages);
    const cursorId = older[2].id;
    const unsummarized = getUnsummarizedOlderMessages(messages, cursorId);
    expect(unsummarized.length).toBe(2);
    expect(unsummarized.map((m) => m.id)).toEqual(["msg-4", "msg-5"]);
  });

  it("returns all older messages when cursor id is not found (safe fallback)", () => {
    const messages = makeMessageList(25);
    const unsummarized = getUnsummarizedOlderMessages(
      messages,
      "nonexistent-id"
    );
    expect(unsummarized.length).toBe(5);
    expect(unsummarized.map((m) => m.id)).toEqual([
      "msg-1",
      "msg-2",
      "msg-3",
      "msg-4",
      "msg-5",
    ]);
  });
});

describe("buildChatHistory", () => {
  beforeEach(() => {
    resetMessageCounter();
  });

  it("preserves roles and length without contextSummary", () => {
    const messages = [
      makeMessage({ role: "user", content: "Hello" }),
      makeMessage({ role: "assistant", content: "Hi there", kind: "text" }),
    ];
    const history = buildChatHistory(messages);
    expect(history.length).toBe(2);
    expect(history[0]).toEqual({ role: "user", content: "Hello" });
    expect(history[1]).toEqual({ role: "assistant", content: "Hi there" });
  });

  it("prepends summary preamble when contextSummary is present", () => {
    const messages = [makeMessage({ content: "Follow-up question" })];
    const history = buildChatHistory(messages, "They discussed weekend plans.");
    expect(history.length).toBe(3);
    expect(history[0].content).toBe(
      "[Earlier conversation summary — for context only]\nThey discussed weekend plans."
    );
    expect(history[1].content).toBe(
      "Understood. I'll keep that earlier context in mind as we continue."
    );
    expect(history[2].content).toBe("Follow-up question");
  });

  it("flattens decode messages via decodeToContext", () => {
    const decodeMsg = makeDecodeMessage();
    const history = buildChatHistory([decodeMsg]);
    expect(history[0].content).toBe(decodeToContext(validDecode));
    expect(history[0].content).not.toContain('"action_plan"');
    expect(history[0].content).not.toContain('"follow_ups"');
  });
});

describe("decodeToContext / messageToChatContent", () => {
  it("formats decode payload as plain-text context", () => {
    const expected = [
      validDecode.translation,
      `Underlying need: ${validDecode.underlying_need}.`,
      `Urgency: ${validDecode.urgency_level}/5.`,
      `Suggested steps: ${validDecode.action_plan.join("; ")}.`,
    ].join("\n");
    expect(decodeToContext(validDecode)).toBe(expected);
  });

  it("uses raw content for non-decode messages", () => {
    const textMsg = makeMessage({ content: "Plain user text" });
    expect(messageToChatContent(textMsg)).toBe("Plain user text");
  });
});
