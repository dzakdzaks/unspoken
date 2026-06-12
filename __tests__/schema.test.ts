import { describe, it, expect } from "vitest";
import { TranslationResultSchema } from "@/lib/schema";

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
});

describe("decode JSON parse guard", () => {
  it("throws on malformed JSON string", () => {
    expect(() => JSON.parse("{not json")).toThrow();
  });

  it("rejects schema-failing object via safeParse", () => {
    const result = TranslationResultSchema.safeParse({ translation: "incomplete" });
    expect(result.success).toBe(false);
  });
});
