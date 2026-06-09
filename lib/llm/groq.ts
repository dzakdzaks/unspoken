import OpenAI from "openai";
import { TranslationResultSchema, type TranslationResult } from "@/lib/schema";
import {
  LLMError,
  type ChatMessage,
  type LLMProvider,
  type LLMRequestOptions,
  type TokenUsage,
} from "./types";

// Groq exposes an OpenAI-compatible API, so we drive it with the OpenAI SDK
// pointed at Groq's base URL instead of pulling in a separate dependency.
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// Default sampling temperature for all Groq calls.
const TEMPERATURE = 0.3;

// gpt-oss reasoning controls. `reasoning_format: "parsed"` keeps the model's
// reasoning in a separate field instead of the content stream, so it never
// pollutes the structured JSON or chat reply. `reasoning_format` is a Groq
// extension absent from the OpenAI SDK types, so it's attached via a cast.
function reasoningParams(options?: LLMRequestOptions) {
  return {
    reasoning_effort: options?.reasoningEffort ?? "high",
    reasoning_format: "parsed",
  } as Record<string, unknown>;
}

const DEFAULT_REASONING = {
  reasoning_effort: "high",
  reasoning_format: "parsed",
} as Record<string, unknown>;

function parseTranslationResult(raw: string | null): TranslationResult {
  if (!raw) {
    throw new LLMError(
      "PARSE_ERROR",
      "Groq returned an empty structured output."
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new LLMError("PARSE_ERROR", "Groq response was not valid JSON.", err);
  }

  const result = TranslationResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new LLMError(
      "PARSE_ERROR",
      "Groq response failed Zod validation.",
      result.error
    );
  }

  return result.data;
}

export function createGroqProvider(
  model = "openai/gpt-oss-120b",
  runtimeApiKey?: string
): LLMProvider {
  function getClient(): OpenAI {
    const apiKey = runtimeApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new LLMError(
        "MISSING_API_KEY",
        "GROQ_API_KEY environment variable is not set."
      );
    }
    return new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
  }

  return {
    name: "groq",

    async translate(input: string, systemPrompt: string): Promise<TranslationResult> {
      const client = getClient();

      let completion;
      try {
        completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input },
          ],
          response_format: { type: "json_object" },
          temperature: TEMPERATURE,
          ...DEFAULT_REASONING,
        });
      } catch (err) {
        throw new LLMError("API_ERROR", "Groq API request failed.", err);
      }

      return parseTranslationResult(completion.choices[0]?.message?.content ?? null);
    },

    async *translateStream(
      input: string,
      systemPrompt: string,
      options?: LLMRequestOptions
    ): AsyncGenerator<string, TokenUsage | undefined> {
      const client = getClient();
      let usage: TokenUsage | undefined;

      try {
        const stream = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input },
          ],
          response_format: { type: "json_object" },
          temperature: TEMPERATURE,
          ...reasoningParams(options),
          stream: true,
          stream_options: { include_usage: true },
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) yield text;
          if (chunk.usage) {
            usage = {
              input: chunk.usage.prompt_tokens,
              output: chunk.usage.completion_tokens,
              total: chunk.usage.total_tokens,
            };
          }
        }
      } catch (err) {
        throw new LLMError("API_ERROR", "Groq streaming request failed.", err);
      }

      return usage;
    },

    async *chatStream(
      messages: ChatMessage[],
      systemPrompt: string,
      options?: LLMRequestOptions
    ): AsyncGenerator<string, TokenUsage | undefined> {
      const client = getClient();
      let usage: TokenUsage | undefined;

      try {
        const stream = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          temperature: TEMPERATURE,
          ...reasoningParams(options),
          stream: true,
          stream_options: { include_usage: true },
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) yield text;
          if (chunk.usage) {
            usage = {
              input: chunk.usage.prompt_tokens,
              output: chunk.usage.completion_tokens,
              total: chunk.usage.total_tokens,
            };
          }
        }
      } catch (err) {
        throw new LLMError("API_ERROR", "Groq streaming request failed.", err);
      }

      return usage;
    },
  };
}
