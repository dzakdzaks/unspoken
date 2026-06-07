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

export function createOpenAIProvider(model = "gpt-5-mini", runtimeApiKey?: string): LLMProvider {
  return {
    name: "openai",

    async translate(input: string, systemPrompt: string): Promise<TranslationResult> {
      const apiKey = runtimeApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new LLMError(
          "MISSING_API_KEY",
          "OPENAI_API_KEY environment variable is not set."
        );
      }

      const client = new OpenAI({ apiKey });

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
        throw new LLMError("API_ERROR", "OpenAI API request failed.", err);
      }

      const parsed = completion.choices[0]?.message?.parsed;
      if (!parsed) {
        throw new LLMError(
          "PARSE_ERROR",
          "OpenAI returned an empty or unparseable structured output."
        );
      }

      return parsed;
    },

    async *translateStream(
      input: string,
      systemPrompt: string,
      options?: LLMRequestOptions
    ): AsyncGenerator<string, TokenUsage | undefined> {
      const apiKey = runtimeApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new LLMError(
          "MISSING_API_KEY",
          "OPENAI_API_KEY environment variable is not set."
        );
      }

      const client = new OpenAI({ apiKey });
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
          ...(options?.promptCacheKey
            ? { prompt_cache_key: options.promptCacheKey }
            : {}),
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
        throw new LLMError("API_ERROR", "OpenAI streaming request failed.", err);
      }

      return usage;
    },

    async *chatStream(
      messages: ChatMessage[],
      systemPrompt: string,
      options?: LLMRequestOptions
    ): AsyncGenerator<string, TokenUsage | undefined> {
      const apiKey = runtimeApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new LLMError(
          "MISSING_API_KEY",
          "OPENAI_API_KEY environment variable is not set."
        );
      }

      const client = new OpenAI({ apiKey });
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
          ...(options?.promptCacheKey
            ? { prompt_cache_key: options.promptCacheKey }
            : {}),
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
        throw new LLMError("API_ERROR", "OpenAI streaming request failed.", err);
      }

      return usage;
    },
  };
}
