import { describe, it, expect, vi, afterEach } from "vitest";

const { mockChatStream } = vi.hoisted(() => ({
  mockChatStream: vi.fn(),
}));

vi.mock("@/lib/llm/openai", () => ({
  createOpenAIProvider: vi.fn(() => ({
    name: "openai",
    translate: vi.fn(),
    translateStream: vi.fn(),
    chatStream: mockChatStream,
  })),
}));

vi.mock("@langfuse/tracing", () => ({
  startObservation: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    end: vi.fn(),
  })),
}));

import { updateConversationSummary } from "@/lib/llm";

const SYSTEM_PROMPT = "Summarize the conversation.";

describe("updateConversationSummary", () => {
  afterEach(() => {
    mockChatStream.mockReset();
  });

  it("returns existing summary without calling LLM when newMessagesText is whitespace", async () => {
    const result = await updateConversationSummary(
      "existing summary",
      "   ",
      SYSTEM_PROMPT
    );
    expect(result).toBe("existing summary");
    expect(mockChatStream).not.toHaveBeenCalled();
  });

  it("returns existing summary when chatStream throws", async () => {
    mockChatStream.mockImplementation(async function* () {
      throw new Error("LLM down");
    });
    const result = await updateConversationSummary(
      "existing summary",
      "User: hello",
      SYSTEM_PROMPT
    );
    expect(result).toBe("existing summary");
  });

  it("returns existing summary when LLM yields only whitespace", async () => {
    mockChatStream.mockImplementation(async function* () {
      yield "   ";
      return undefined;
    });
    const result = await updateConversationSummary(
      "existing summary",
      "User: hello",
      SYSTEM_PROMPT
    );
    expect(result).toBe("existing summary");
  });

  it("returns updated summary when LLM yields text", async () => {
    mockChatStream.mockImplementation(async function* () {
      yield "Updated summary";
      return undefined;
    });
    const result = await updateConversationSummary(
      "existing summary",
      "User: hello",
      SYSTEM_PROMPT
    );
    expect(result).toBe("Updated summary");
  });
});
