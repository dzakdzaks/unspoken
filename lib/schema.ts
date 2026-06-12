import { z } from "zod";

export const TranslationResultSchema = z.object({
  raw_input: z
    .string()
    .describe("The original phrase or behavior described by the user."),
  translation: z
    .string()
    .describe(
      "What the partner actually means or wants, expressed in plain, direct English."
    ),
  underlying_need: z
    .string()
    .describe(
      "The single core emotional need driving this, named freely in a few words. Decide the wording yourself based on the situation — do not pick from a fixed list."
    ),
  underlying_need_hue: z
    .number()
    .int()
    .min(0)
    .max(360)
    .describe(
      "A color hue (0-360 on the HSL color wheel) you choose to represent the underlying_need's emotional tone. Pick whatever feels right: e.g. warm reds/oranges (0-40) for anger or urgency, yellows/greens (50-150) for warmth or growth, teals/blues (160-260) for calm, space, or security, purples/pinks (270-340) for affection or intimacy."
    ),
  urgency_level: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe(
      "Your own read of how urgent this is, from 1 (calm, no real tension) to 5 (critical, act immediately). Judge it yourself — there is no fixed rubric. Integer only."
    ),
  urgency_label: z
    .string()
    .describe(
      "A short label (a few words) you write in your own words to capture how serious this is and what posture to take. Vary it to the situation — do not pick from a fixed list."
    ),
  urgency_summary: z
    .string()
    .describe(
      "One plain, direct sentence explaining why you rated the urgency this way and what it means for the user. Specific to this situation, not a canned line."
    ),
  action_plan: z
    .array(z.string())
    .min(3)
    .max(3)
    .describe(
      "Exactly 3 specific, immediately actionable steps the user should take right now."
    ),
  follow_ups: z
    .array(z.string())
    .min(3)
    .max(3)
    .describe(
      "Exactly 3 short follow-up messages the user might want to send next, written in first person as if the user is typing them. Each under ~8 words."
    ),
});

export type TranslationResult = z.infer<typeof TranslationResultSchema>;

export const ClarifyDecisionSchema = z.discriminatedUnion("ready", [
  z.object({
    ready: z.literal(false),
    question: z.string().min(1),
    quick_replies: z.array(z.string()).min(2).max(3),
  }),
  z.object({
    ready: z.literal(true),
  }),
]);

export type ClarifyDecision = z.infer<typeof ClarifyDecisionSchema>;

export const GuardrailDecisionSchema = z.object({
  on_topic: z.boolean(),
  refusal: z.string().optional().default(""),
});

export type GuardrailDecision = z.infer<typeof GuardrailDecisionSchema>;

export const TranslateRequestSchema = z.object({
  input: z
    .string()
    .min(1, "Please describe what she said or did.")
    .max(500, "Input must be 500 characters or fewer."),
  lang: z.enum(["en", "id"]).optional().default("en"),
  provider: z.enum(["openai", "anthropic", "gemini", "groq"]).optional(),
  model: z.string().max(100).optional(),
  apiKey: z.string().max(200).optional(),
});

export type TranslateRequest = z.infer<typeof TranslateRequestSchema>;

export const CreateRoomRequestSchema = z.object({
  title: z.string().max(80).optional(),
  lang: z.enum(["en", "id"]).optional().default("en"),
});

export const RenameRoomRequestSchema = z.object({
  title: z.string().min(1).max(80),
});

export const SignUpRequestSchema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;

export const SignInRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export type SignInRequest = z.infer<typeof SignInRequestSchema>;

export const SendMessageRequestSchema = z
  .object({
    input: z
      .string()
      .max(500, "Message must be 500 characters or fewer.")
      .default(""),
    lang: z.enum(["en", "id"]).optional().default("en"),
    skipClarify: z.boolean().optional().default(false),
    provider: z.enum(["openai", "anthropic", "gemini", "groq"]).optional(),
    model: z.string().max(100).optional(),
    apiKey: z.string().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.skipClarify) return;
    if (data.input.trim().length === 0) {
      ctx.addIssue({
        code: "too_small",
        minimum: 1,
        type: "string",
        inclusive: true,
        message: "Please type a message.",
        path: ["input"],
      });
    }
  });
