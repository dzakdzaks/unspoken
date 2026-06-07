import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { TranslationResultSchema, type TranslationResult } from "@/lib/schema";
import {
  LLMError,
  type ChatMessage,
  type LLMProvider,
  type LLMRequestOptions,
  type TokenUsage,
} from "./types";
import { resolveGeminiCachedContent } from "./gemini-cache";

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    raw_input: {
      type: Type.STRING,
      description: TranslationResultSchema.shape.raw_input.description,
      nullable: false,
    },
    translation: {
      type: Type.STRING,
      description: TranslationResultSchema.shape.translation.description,
      nullable: false,
    },
    underlying_need: {
      type: Type.STRING,
      description: TranslationResultSchema.shape.underlying_need.description,
      nullable: false,
    },
    underlying_need_hue: {
      type: Type.INTEGER,
      description: TranslationResultSchema.shape.underlying_need_hue.description,
      minimum: 0,
      maximum: 360,
      nullable: false,
    },
    urgency_level: {
      type: Type.INTEGER,
      description: TranslationResultSchema.shape.urgency_level.description,
      minimum: 1,
      maximum: 5,
      nullable: false,
    },
    urgency_label: {
      type: Type.STRING,
      description: TranslationResultSchema.shape.urgency_label.description,
      nullable: false,
    },
    urgency_summary: {
      type: Type.STRING,
      description: TranslationResultSchema.shape.urgency_summary.description,
      nullable: false,
    },
    action_plan: {
      type: Type.ARRAY,
      description: TranslationResultSchema.shape.action_plan.description,
      items: { type: Type.STRING },
      minItems: "3",
      maxItems: "3",
      nullable: false,
    },
    follow_ups: {
      type: Type.ARRAY,
      description: TranslationResultSchema.shape.follow_ups.description,
      items: { type: Type.STRING },
      minItems: "3",
      maxItems: "3",
      nullable: false,
    },
  },
  required: [
    "raw_input",
    "translation",
    "underlying_need",
    "underlying_need_hue",
    "urgency_level",
    "urgency_label",
    "urgency_summary",
    "action_plan",
    "follow_ups",
  ],
};

export function createGeminiProvider(
  model = "gemini-2.5-flash",
  runtimeApiKey?: string
): LLMProvider {
  return {
    name: "gemini",

    async translate(input: string, systemPrompt: string): Promise<TranslationResult> {
      const apiKey = runtimeApiKey || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new LLMError(
          "MISSING_API_KEY",
          "GOOGLE_API_KEY environment variable is not set."
        );
      }

      const client = new GoogleGenAI({ apiKey });

      let raw: string | undefined;
      try {
        const response = await client.models.generateContent({
          model,
          contents: input,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.3,
          },
        });
        raw = response.text;
      } catch (err) {
        throw new LLMError("API_ERROR", "Gemini API request failed.", err);
      }

      if (!raw) {
        throw new LLMError("PARSE_ERROR", "Gemini returned an empty response.");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        throw new LLMError("PARSE_ERROR", "Gemini response was not valid JSON.", err);
      }

      const result = TranslationResultSchema.safeParse(parsed);
      if (!result.success) {
        throw new LLMError("PARSE_ERROR", "Gemini response failed Zod validation.", result.error);
      }

      return result.data;
    },

    async *translateStream(
      input: string,
      systemPrompt: string,
      options?: LLMRequestOptions
    ): AsyncGenerator<string, TokenUsage | undefined> {
      const apiKey = runtimeApiKey || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new LLMError(
          "MISSING_API_KEY",
          "GOOGLE_API_KEY environment variable is not set."
        );
      }

      const client = new GoogleGenAI({ apiKey });
      let usage: TokenUsage | undefined;

      try {
        const cachedContent = options?.promptCacheKey
          ? await resolveGeminiCachedContent(
              client,
              model,
              systemPrompt,
              options.promptCacheKey
            )
          : undefined;

        const stream = await client.models.generateContentStream({
          model,
          contents: input,
          config: {
            ...(cachedContent
              ? { cachedContent }
              : { systemInstruction: systemPrompt }),
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.3,
          },
        });

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) yield text;
          if (chunk.usageMetadata) {
            usage = {
              input: chunk.usageMetadata.promptTokenCount,
              output: chunk.usageMetadata.candidatesTokenCount,
              total: chunk.usageMetadata.totalTokenCount,
            };
          }
        }
      } catch (err) {
        throw new LLMError("API_ERROR", "Gemini streaming request failed.", err);
      }

      return usage;
    },

    async *chatStream(
      messages: ChatMessage[],
      systemPrompt: string,
      options?: LLMRequestOptions
    ): AsyncGenerator<string, TokenUsage | undefined> {
      const apiKey = runtimeApiKey || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new LLMError(
          "MISSING_API_KEY",
          "GOOGLE_API_KEY environment variable is not set."
        );
      }

      const client = new GoogleGenAI({ apiKey });

      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      let usage: TokenUsage | undefined;

      try {
        const cachedContent = options?.promptCacheKey
          ? await resolveGeminiCachedContent(
              client,
              model,
              systemPrompt,
              options.promptCacheKey
            )
          : undefined;

        const stream = await client.models.generateContentStream({
          model,
          contents,
          config: {
            ...(cachedContent
              ? { cachedContent }
              : { systemInstruction: systemPrompt }),
            temperature: 0.3,
          },
        });

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) yield text;
          if (chunk.usageMetadata) {
            usage = {
              input: chunk.usageMetadata.promptTokenCount,
              output: chunk.usageMetadata.candidatesTokenCount,
              total: chunk.usageMetadata.totalTokenCount,
            };
          }
        }
      } catch (err) {
        throw new LLMError("API_ERROR", "Gemini streaming request failed.", err);
      }

      return usage;
    },
  };
}
