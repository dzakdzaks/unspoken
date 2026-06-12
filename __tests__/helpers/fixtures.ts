import type { Message } from "@/lib/chat/types";
import type { TranslationResult } from "@/lib/schema";

export const validDecode: TranslationResult = {
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

let messageCounter = 0;

export function resetMessageCounter(): void {
  messageCounter = 0;
}

export function makeMessage(overrides?: Partial<Message>): Message {
  messageCounter += 1;
  return {
    id: `msg-${messageCounter}`,
    roomId: "room-1",
    role: "user",
    kind: "text",
    content: `Message content ${messageCounter}`,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeDecodeMessage(decoded?: Partial<TranslationResult>): Message {
  const fullDecoded = { ...validDecode, ...decoded };
  return makeMessage({
    role: "assistant",
    kind: "decode",
    content: fullDecoded.translation,
    decoded: fullDecoded,
  });
}

export function makeMessageList(count: number): Message[] {
  resetMessageCounter();
  return Array.from({ length: count }, () => makeMessage());
}
