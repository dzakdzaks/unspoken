import { describe, it, expect } from "vitest";
import {
  TranslationResultSchema,
  ClarifyDecisionSchema,
  GuardrailDecisionSchema,
  TranslateRequestSchema,
  CreateRoomRequestSchema,
  RenameRoomRequestSchema,
  SignUpRequestSchema,
  SignInRequestSchema,
  SendMessageRequestSchema,
} from "@/lib/schema";

const validDecode = {
  raw_input: "Fine, do whatever you want.",
  translation: "She wants you to notice she's upset, not actually give permission.",
  underlying_need: "Reassurance",
  underlying_need_hue: 25,
  urgency_level: 3,
  urgency_label: "Needs attention today",
  urgency_summary: "The tone suggests unresolved tension that will grow if ignored.",
  action_plan: [
    "Ask what would help her feel heard.",
    "Acknowledge her feelings before deciding anything.",
    "Suggest a short walk together to talk it through.",
  ],
  follow_ups: [
    "What's bothering you?",
    "I want to understand.",
    "Can we talk?",
  ],
};

describe("TranslationResultSchema", () => {
  it("accepts a valid decode payload", () => {
    const result = TranslationResultSchema.safeParse(validDecode);
    expect(result.success).toBe(true);
  });

  it("rejects wrong action_plan length", () => {
    const result = TranslationResultSchema.safeParse({
      ...validDecode,
      action_plan: ["Only one step"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects action_plan with more than 3 items", () => {
    const result = TranslationResultSchema.safeParse({
      ...validDecode,
      action_plan: [
        "Step one",
        "Step two",
        "Step three",
        "Step four",
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects urgency_level outside 1-5", () => {
    const result = TranslationResultSchema.safeParse({
      ...validDecode,
      urgency_level: 6,
    });
    expect(result.success).toBe(false);
  });

  it("rejects urgency_level below range", () => {
    const result = TranslationResultSchema.safeParse({
      ...validDecode,
      urgency_level: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects underlying_need_hue outside 0-360", () => {
    const result = TranslationResultSchema.safeParse({
      ...validDecode,
      underlying_need_hue: 400,
    });
    expect(result.success).toBe(false);
  });

  it("rejects underlying_need_hue below range", () => {
    const result = TranslationResultSchema.safeParse({
      ...validDecode,
      underlying_need_hue: -1,
    });
    expect(result.success).toBe(false);
  });

  it("requires exactly 3 follow_ups", () => {
    const result = TranslationResultSchema.safeParse({
      ...validDecode,
      follow_ups: ["One", "Two"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects follow_ups with more than 3 items", () => {
    const result = TranslationResultSchema.safeParse({
      ...validDecode,
      follow_ups: ["A", "B", "C", "D"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects payload missing required fields", () => {
    const { translation, ...withoutTranslation } = validDecode;
    const result = TranslationResultSchema.safeParse(withoutTranslation);
    expect(result.success).toBe(false);
  });

  it("rejects payload with all fields missing", () => {
    const result = TranslationResultSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-integer urgency_level", () => {
    const result = TranslationResultSchema.safeParse({
      ...validDecode,
      urgency_level: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts boundary values for urgency_level", () => {
    const r1 = TranslationResultSchema.safeParse({ ...validDecode, urgency_level: 1 });
    const r5 = TranslationResultSchema.safeParse({ ...validDecode, urgency_level: 5 });
    expect(r1.success).toBe(true);
    expect(r5.success).toBe(true);
  });

  it("accepts boundary values for underlying_need_hue", () => {
    const r0 = TranslationResultSchema.safeParse({ ...validDecode, underlying_need_hue: 0 });
    const r360 = TranslationResultSchema.safeParse({ ...validDecode, underlying_need_hue: 360 });
    expect(r0.success).toBe(true);
    expect(r360.success).toBe(true);
  });
});

describe("ClarifyDecisionSchema", () => {
  it("accepts ready: true", () => {
    const result = ClarifyDecisionSchema.safeParse({ ready: true });
    expect(result.success).toBe(true);
  });

  it("accepts ready: false with question and quick_replies", () => {
    const result = ClarifyDecisionSchema.safeParse({
      ready: false,
      question: "What did she say exactly?",
      quick_replies: ["She said nothing", "She raised her voice"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts ready: false with 3 quick_replies", () => {
    const result = ClarifyDecisionSchema.safeParse({
      ready: false,
      question: "How did she react?",
      quick_replies: ["She smiled", "She walked away", "She started crying"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects ready: false without question", () => {
    const result = ClarifyDecisionSchema.safeParse({
      ready: false,
      quick_replies: ["Yes", "No"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects ready: false with empty question", () => {
    const result = ClarifyDecisionSchema.safeParse({
      ready: false,
      question: "",
      quick_replies: ["Yes", "No"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects ready: false with too few quick_replies", () => {
    const result = ClarifyDecisionSchema.safeParse({
      ready: false,
      question: "What happened?",
      quick_replies: ["Only one"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects ready: false with too many quick_replies", () => {
    const result = ClarifyDecisionSchema.safeParse({
      ready: false,
      question: "What happened?",
      quick_replies: ["A", "B", "C", "D"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed payload with ready as string", () => {
    const result = ClarifyDecisionSchema.safeParse({
      ready: "true",
    });
    expect(result.success).toBe(false);
  });
});

describe("GuardrailDecisionSchema", () => {
  it("accepts on_topic: true", () => {
    const result = GuardrailDecisionSchema.safeParse({ on_topic: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.refusal).toBe("");
  });

  it("accepts on_topic: false with refusal", () => {
    const result = GuardrailDecisionSchema.safeParse({
      on_topic: false,
      refusal: "This is not about a relationship.",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.refusal).toBe("This is not about a relationship.");
  });

  it("accepts on_topic: false without refusal (defaults to empty)", () => {
    const result = GuardrailDecisionSchema.safeParse({ on_topic: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.refusal).toBe("");
  });

  it("rejects missing on_topic", () => {
    const result = GuardrailDecisionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean on_topic", () => {
    const result = GuardrailDecisionSchema.safeParse({ on_topic: "maybe" });
    expect(result.success).toBe(false);
  });
});

describe("TranslateRequestSchema", () => {
  it("accepts minimal valid request", () => {
    const result = TranslateRequestSchema.safeParse({ input: "She said hi" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lang).toBe("en");
    }
  });

  it("accepts request with all optional fields", () => {
    const result = TranslateRequestSchema.safeParse({
      input: "She said hi",
      lang: "id",
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      apiKey: "sk-test",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty input", () => {
    const result = TranslateRequestSchema.safeParse({ input: "" });
    expect(result.success).toBe(false);
  });

  it("rejects input exceeding 500 characters", () => {
    const result = TranslateRequestSchema.safeParse({ input: "x".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid lang", () => {
    const result = TranslateRequestSchema.safeParse({ input: "Hello", lang: "fr" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid provider", () => {
    const result = TranslateRequestSchema.safeParse({
      input: "Hello",
      provider: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts input at exactly 500 characters", () => {
    const result = TranslateRequestSchema.safeParse({ input: "x".repeat(500) });
    expect(result.success).toBe(true);
  });
});

describe("SendMessageRequestSchema", () => {
  it("accepts valid message input", () => {
    const result = SendMessageRequestSchema.safeParse({
      input: "She seems upset",
      lang: "en",
    });
    expect(result.success).toBe(true);
  });

  it("accepts message with skipClarify", () => {
    const result = SendMessageRequestSchema.safeParse({
      input: "She seems upset",
      skipClarify: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty input when skipClarify is true", () => {
    const result = SendMessageRequestSchema.safeParse({
      input: "",
      skipClarify: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty input when skipClarify is false", () => {
    const result = SendMessageRequestSchema.safeParse({
      input: "",
      skipClarify: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects input exceeding 500 characters", () => {
    const result = SendMessageRequestSchema.safeParse({
      input: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts request with all optional fields", () => {
    const result = SendMessageRequestSchema.safeParse({
      input: "She seems upset",
      lang: "id",
      skipClarify: false,
      provider: "gemini",
      model: "gemini-2.0-flash",
      apiKey: "test-key",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid lang", () => {
    const result = SendMessageRequestSchema.safeParse({
      input: "Hi",
      lang: "de",
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateRoomRequestSchema", () => {
  it("accepts minimal valid payload", () => {
    const result = CreateRoomRequestSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.lang).toBe("en");
  });

  it("accepts with title and lang", () => {
    const result = CreateRoomRequestSchema.safeParse({
      title: "My Room",
      lang: "id",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("My Room");
  });

  it("rejects title exceeding 80 characters", () => {
    const result = CreateRoomRequestSchema.safeParse({
      title: "x".repeat(81),
    });
    expect(result.success).toBe(false);
  });
});

describe("RenameRoomRequestSchema", () => {
  it("accepts valid title", () => {
    const result = RenameRoomRequestSchema.safeParse({ title: "Updated Room" });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = RenameRoomRequestSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding 80 characters", () => {
    const result = RenameRoomRequestSchema.safeParse({
      title: "x".repeat(81),
    });
    expect(result.success).toBe(false);
  });
});

describe("SignUpRequestSchema", () => {
  it("accepts valid signup", () => {
    const result = SignUpRequestSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = SignUpRequestSchema.safeParse({
      name: "John",
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = SignUpRequestSchema.safeParse({
      name: "John",
      email: "john@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = SignUpRequestSchema.safeParse({
      name: "",
      email: "john@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("SignInRequestSchema", () => {
  it("accepts valid signin", () => {
    const result = SignInRequestSchema.safeParse({
      email: "john@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = SignInRequestSchema.safeParse({
      email: "bad",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = SignInRequestSchema.safeParse({
      email: "john@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
