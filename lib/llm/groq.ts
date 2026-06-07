import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
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
        completion = await client.chat.completions.parse({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input },
          ],
          response_format: zodResponseFormat(
            TranslationResultSchema,
            "translation_result"
          ),
          temperature: 0.4,
        });
      } catch (err) {
        throw new LLMError("API_ERROR", "Groq API request failed.", err);
      }

      const parsed = completion.choices[0]?.message?.parsed;
      if (!parsed) {
        throw new LLMError(
          "PARSE_ERROR",
          "Groq returned an empty or unparseable structured output."
        );
      }

      return parsed;
    },

    async *translateStream(
      input: string,
      systemPrompt: string,
      _options?: LLMRequestOptions
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
          response_format: zodResponseFormat(
            TranslationResultSchema,
            "translation_result"
          ),
          temperature: 0.4,
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
      _options?: LLMRequestOptions
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
          temperature: 0.6,
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
