import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { TranslationResultSchema, type TranslationResult } from "@/lib/schema";
import {
  LLMError,
  type ChatMessage,
  type LLMProvider,
  type LLMRequestOptions,
  type TokenUsage,
} from "./types";

function cachedSystemPrompt(systemPrompt: string, options?: LLMRequestOptions) {
  if (!options?.promptCacheKey) return systemPrompt;

  return [
    {
      type: "text" as const,
      text: systemPrompt,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

function zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
  const shape = schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    required.push(key);
    if (value instanceof z.ZodString) {
      properties[key] = { type: "string", description: value.description };
    } else if (value instanceof z.ZodNumber) {
      properties[key] = {
        type: "integer",
        minimum: (value as z.ZodNumber).minValue ?? undefined,
        maximum: (value as z.ZodNumber).maxValue ?? undefined,
        description: value.description,
      };
    } else if (value instanceof z.ZodArray) {
      properties[key] = {
        type: "array",
        items: { type: "string" },
        minItems: value._def.minLength?.value,
        maxItems: value._def.maxLength?.value,
        description: value.description,
      };
    } else {
      properties[key] = { type: "string" };
    }
  }

  return { type: "object", properties, required };
}

export function createAnthropicProvider(
  model = "claude-4.6-sonnet",
  runtimeApiKey?: string
): LLMProvider {
  return {
    name: "anthropic",

    async translate(input: string, systemPrompt: string): Promise<TranslationResult> {
      const apiKey = runtimeApiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new LLMError(
          "MISSING_API_KEY",
          "ANTHROPIC_API_KEY environment variable is not set."
        );
      }

      const client = new Anthropic({ apiKey });
      const toolInputSchema = zodToJsonSchema(TranslationResultSchema);

      let response;
      try {
        response = await client.messages.create({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: input }],
          tools: [
            {
              name: "translation_result",
              description: "Structured translation of the partner's communication.",
              input_schema: toolInputSchema as Anthropic.Tool["input_schema"],
            },
          ],
          tool_choice: { type: "tool", name: "translation_result" },
        });
      } catch (err) {
        throw new LLMError("API_ERROR", "Anthropic API request failed.", err);
      }

      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      if (!toolUse) {
        throw new LLMError("PARSE_ERROR", "Anthropic did not return a tool_use block.");
      }

      const result = TranslationResultSchema.safeParse(toolUse.input);
      if (!result.success) {
        throw new LLMError("PARSE_ERROR", "Anthropic tool output failed Zod validation.", result.error);
      }

      return result.data;
    },

    async *translateStream(
      input: string,
      systemPrompt: string,
      options?: LLMRequestOptions
    ): AsyncGenerator<string, TokenUsage | undefined> {
      const apiKey = runtimeApiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new LLMError(
          "MISSING_API_KEY",
          "ANTHROPIC_API_KEY environment variable is not set."
        );
      }

      const client = new Anthropic({ apiKey });
      const toolInputSchema = zodToJsonSchema(TranslationResultSchema);
      let inputTokens = 0;
      let outputTokens = 0;

      try {
        const stream = client.messages.stream({
          model,
          max_tokens: 1024,
          system: cachedSystemPrompt(systemPrompt, options),
          messages: [{ role: "user", content: input }],
          tools: [
            {
              name: "translation_result",
              description: "Structured translation of the partner's communication.",
              input_schema: toolInputSchema as Anthropic.Tool["input_schema"],
            },
          ],
          tool_choice: { type: "tool", name: "translation_result" },
        });

        for await (const event of stream) {
          if (event.type === "message_start") {
            inputTokens = event.message.usage.input_tokens;
          } else if (event.type === "message_delta") {
            outputTokens = event.usage.output_tokens;
          } else if (
            event.type === "content_block_delta" &&
            event.delta.type === "input_json_delta"
          ) {
            const text = event.delta.partial_json;
            if (text) yield text;
          }
        }
      } catch (err) {
        throw new LLMError("API_ERROR", "Anthropic streaming request failed.", err);
      }

      return inputTokens || outputTokens
        ? { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens }
        : undefined;
    },

    async *chatStream(
      messages: ChatMessage[],
      systemPrompt: string,
      options?: LLMRequestOptions
    ): AsyncGenerator<string, TokenUsage | undefined> {
      const apiKey = runtimeApiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new LLMError(
          "MISSING_API_KEY",
          "ANTHROPIC_API_KEY environment variable is not set."
        );
      }

      const client = new Anthropic({ apiKey });
      let inputTokens = 0;
      let outputTokens = 0;

      try {
        const stream = client.messages.stream({
          model,
          max_tokens: 1024,
          system: cachedSystemPrompt(systemPrompt, options),
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of stream) {
          if (event.type === "message_start") {
            inputTokens = event.message.usage.input_tokens;
          } else if (event.type === "message_delta") {
            outputTokens = event.usage.output_tokens;
          } else if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            if (text) yield text;
          }
        }
      } catch (err) {
        throw new LLMError("API_ERROR", "Anthropic streaming request failed.", err);
      }

      return inputTokens || outputTokens
        ? { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens }
        : undefined;
    },
  };
}
