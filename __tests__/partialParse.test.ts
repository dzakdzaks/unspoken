import { describe, it, expect } from "vitest";
import { parsePartialTranslation } from "@/lib/partialParse";

const fullJson = `{
  "raw_input": "Fine, do whatever you want.",
  "translation": "She wants you to notice she's upset, not actually give permission.",
  "underlying_need": "Reassurance",
  "underlying_need_hue": 25,
  "urgency_level": 3,
  "urgency_label": "Needs attention today",
  "urgency_summary": "The tone suggests unresolved tension that will grow if ignored.",
  "action_plan": [
    "Ask what would help her feel heard.",
    "Acknowledge her feelings before deciding anything.",
    "Suggest a short walk together to talk it through."
  ]
}`;

describe("parsePartialTranslation", () => {
  it("parses a complete JSON result", () => {
    const result = parsePartialTranslation(fullJson);
    expect(result.raw_input).toBe("Fine, do whatever you want.");
    expect(result.translation).toBe(
      "She wants you to notice she's upset, not actually give permission."
    );
    expect(result.translationPartial).toBeUndefined();
    expect(result.underlying_need).toBe("Reassurance");
    expect(result.underlying_need_hue).toBe(25);
    expect(result.urgency_level).toBe(3);
    expect(result.urgency_label).toBe("Needs attention today");
    expect(result.urgency_summary).toBe(
      "The tone suggests unresolved tension that will grow if ignored."
    );
    expect(result.action_plan).toHaveLength(3);
    expect(result.action_plan![0]).toBe("Ask what would help her feel heard.");
  });

  it("extracts partial translation while field is being streamed", () => {
    const partial = `{ "raw_input": "Hello", "translation": "She wants you to know that y`;
    const result = parsePartialTranslation(partial);
    expect(result.raw_input).toBe("Hello");
    expect(result.translation).toBeUndefined();
    expect(result.translationPartial).toBe("She wants you to know that y");
  });

  it("handles empty string gracefully", () => {
    const result = parsePartialTranslation("");
    expect(result.raw_input).toBeUndefined();
    expect(result.translation).toBeUndefined();
    expect(result.translationPartial).toBeUndefined();
    expect(result.action_plan).toBeUndefined();
  });

  it("extracts no fields from opening brace only", () => {
    const result = parsePartialTranslation("{");
    expect(result.raw_input).toBeUndefined();
    expect(result.translation).toBeUndefined();
    expect(result.action_plan).toBeUndefined();
  });

  it("extracts only complete action_plan items during streaming", () => {
    const partial = `{
      "raw_input": "Test",
      "action_plan": ["Step one", "Step tw`;
    const result = parsePartialTranslation(partial);
    expect(result.raw_input).toBe("Test");
    // "Step tw" has no closing quote yet so only "Step one" is extracted
    expect(result.action_plan).toHaveLength(1);
    expect(result.action_plan![0]).toBe("Step one");
  });

  it("does not set action_plan for empty array (no items yet)", () => {
    const partial = `{ "raw_input": "Test", "action_plan": []`;
    const result = parsePartialTranslation(partial);
    // Parser only sets action_plan when at least one complete string is found
    expect(result.action_plan).toBeUndefined();
  });

  it("does not include action_plan when array not started", () => {
    const partial = `{ "raw_input": "Test"`;
    const result = parsePartialTranslation(partial);
    expect(result.action_plan).toBeUndefined();
  });

  it("extracts urgency_level partial", () => {
    const partial = `{ "urgency_level": `;
    const result = parsePartialTranslation(partial);
    expect(result.urgency_level).toBeUndefined();
  });

  it("extracts urgency_level when present", () => {
    const partial = `{ "urgency_level": 4`;
    const result = parsePartialTranslation(partial);
    expect(result.urgency_level).toBe(4);
  });

  it("extracts underlying_need_hue when present", () => {
    const partial = `{ "underlying_need_hue": 180`;
    const result = parsePartialTranslation(partial);
    expect(result.underlying_need_hue).toBe(180);
  });

  it("handles escaped quotes inside string values", () => {
    const json = `{ "translation": "She said \\"hello\\" to me." }`;
    const result = parsePartialTranslation(json);
    expect(result.translation).toBe('She said "hello" to me.');
  });

  it("handles escaped newlines inside string values", () => {
    const json = `{ "translation": "line1\\nline2" }`;
    const result = parsePartialTranslation(json);
    expect(result.translation).toBe("line1\nline2");
  });
});
