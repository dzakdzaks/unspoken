import { startObservation } from "@langfuse/tracing";
import {
  LLMError,
  type ChatMessage,
  type LLMProvider,
  type LLMRequestOptions,
  type TokenUsage,
} from "./types";
import { createOpenAIProvider } from "./openai";
import { createAnthropicProvider } from "./anthropic";
import { createGeminiProvider } from "./gemini";
import { createGroqProvider } from "./groq";

export const PROVIDER_DEFAULTS: Record<string, string> = {
  openai: "gpt-4.1",
  anthropic: "claude-sonnet-4-5",
  gemini: "gemini-2.5-flash",
  groq: "openai/gpt-oss-120b",
};

export const CHEAP_MODEL_DEFAULTS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5",
  gemini: "gemini-2.5-flash",
  groq: "openai/gpt-oss-20b",
};

export interface LLMConfig {
  provider?: string;
  model?: string;
  apiKey?: string;
}

interface ResolvedLLM {
  providerName: string;
  model: string;
  provider: LLMProvider;
}

function buildProvider(
  providerName: string,
  model: string,
  apiKey?: string,
): LLMProvider {
  switch (providerName) {
    case "openai":
      return createOpenAIProvider(model, apiKey);
    case "anthropic":
      return createAnthropicProvider(model, apiKey);
    case "gemini":
      return createGeminiProvider(model, apiKey);
    case "groq":
      return createGroqProvider(model, apiKey);
    default:
      throw new LLMError(
        "UNKNOWN_PROVIDER",
        `Unknown LLM provider: "${providerName}". Supported values: openai, anthropic, gemini, groq.`,
      );
  }
}

function envProvider(): string {
  return (process.env.LLM_PROVIDER || "openai").toLowerCase();
}

/**
 * Env model overrides (LLM_MODEL / LLM_CHEAP_MODEL) are tied to the env-configured
 * provider. When a request overrides the provider, those model names belong to a
 * different provider and must be ignored in favor of provider-specific defaults.
 */
function envModelFor(providerName: string): string | undefined {
  return providerName === envProvider() ? process.env.LLM_MODEL : undefined;
}

function envCheapModelFor(providerName: string): string | undefined {
  return providerName === envProvider()
    ? process.env.LLM_CHEAP_MODEL
    : undefined;
}

function resolveLLM(config?: LLMConfig): ResolvedLLM {
  const providerName = (
    config?.provider ||
    process.env.LLM_PROVIDER ||
    "openai"
  ).toLowerCase();
  const model =
    config?.model ||
    envModelFor(providerName) ||
    PROVIDER_DEFAULTS[providerName];
  const apiKey = config?.apiKey || undefined;
  return {
    providerName,
    model,
    provider: buildProvider(providerName, model, apiKey),
  };
}

function toLangfuseUsageDetails(usage: TokenUsage) {
  return {
    ...(usage.input !== undefined && { input: usage.input }),
    ...(usage.output !== undefined && { output: usage.output }),
    ...(usage.total !== undefined && { total: usage.total }),
  };
}

function resolveCheapLLM(config?: LLMConfig): ResolvedLLM {
  const providerName = (
    config?.provider ||
    process.env.LLM_PROVIDER ||
    "openai"
  ).toLowerCase();
  const model =
    envCheapModelFor(providerName) ||
    CHEAP_MODEL_DEFAULTS[providerName] ||
    PROVIDER_DEFAULTS[providerName];
  const apiKey = config?.apiKey || undefined;
  return {
    providerName,
    model,
    provider: buildProvider(providerName, model, apiKey),
  };
}

export function getProvider(): LLMProvider {
  const providerName = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  const model = process.env.LLM_MODEL ?? PROVIDER_DEFAULTS[providerName];
  return buildProvider(providerName, model);
}

export function getProviderWithConfig(config: LLMConfig): LLMProvider {
  const providerName = (
    config.provider ||
    process.env.LLM_PROVIDER ||
    "openai"
  ).toLowerCase();
  const model =
    config.model ||
    envModelFor(providerName) ||
    PROVIDER_DEFAULTS[providerName];
  const apiKey = config.apiKey || undefined;
  return buildProvider(providerName, model, apiKey);
}

export async function* translateStream(
  input: string,
  systemPrompt: string,
  config?: LLMConfig,
  options?: LLMRequestOptions,
): AsyncGenerator<string, TokenUsage | undefined> {
  const { model, provider } = resolveLLM(config);

  const gen = startObservation(
    "decode",
    {
      model,
        modelParameters: {
          temperature: 0.3,
          ...(options?.reasoningEffort && {
            reasoningEffort: options.reasoningEffort,
          }),
        },
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
    },
    { asType: "generation" },
  );

  let output = "";
  try {
    const it = provider.translateStream(input, systemPrompt, options);
    let r = await it.next();
    while (!r.done) {
      output += r.value;
      yield r.value;
      r = await it.next();
    }
    const usage = r.value;
    gen
      .update({
        output,
        ...(usage && { usageDetails: toLangfuseUsageDetails(usage) }),
      })
      .end();
    return usage;
  } catch (err) {
    gen.update({ output, level: "ERROR" }).end();
    throw err;
  }
}

export async function* chatStream(
  messages: ChatMessage[],
  systemPrompt: string,
  config?: LLMConfig,
  options?: LLMRequestOptions,
): AsyncGenerator<string, TokenUsage | undefined> {
  const { model, provider } = resolveLLM(config);

  const gen = startObservation(
    "chat",
    {
      model,
        modelParameters: {
          temperature: 0.3,
          ...(options?.reasoningEffort && {
            reasoningEffort: options.reasoningEffort,
          }),
        },
      input: [{ role: "system", content: systemPrompt }, ...messages],
    },
    { asType: "generation" },
  );

  let output = "";
  try {
    const it = provider.chatStream(messages, systemPrompt, options);
    let r = await it.next();
    while (!r.done) {
      output += r.value;
      yield r.value;
      r = await it.next();
    }
    const usage = r.value;
    gen
      .update({
        output,
        ...(usage && { usageDetails: toLangfuseUsageDetails(usage) }),
      })
      .end();
    return usage;
  } catch (err) {
    gen.update({ output, level: "ERROR" }).end();
    throw err;
  }
}

async function completeText(
  messages: ChatMessage[],
  systemPrompt: string,
  config?: LLMConfig,
  options?: LLMRequestOptions,
): Promise<string> {
  let accumulated = "";
  for await (const chunk of chatStream(
    messages,
    systemPrompt,
    config,
    options,
  )) {
    accumulated += chunk;
  }
  return accumulated.trim();
}

/** Extract a JSON string array from a model response, tolerating code fences / stray prose. */
function parseSuggestions(raw: string): string[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr: unknown = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Best-effort follow-up suggestions for a conversation. Uses a cheaper model and
 * never throws — on any failure it returns an empty list.
 */
export async function generateSuggestions(
  transcript: string,
  systemPrompt: string,
  config?: LLMConfig,
  options?: LLMRequestOptions,
): Promise<string[]> {
  let gen: ReturnType<typeof startObservation> | undefined;
  let accumulated = "";

  try {
    const { model, provider } = resolveCheapLLM(config);

    gen = startObservation(
      "suggestions",
      {
        model,
        modelParameters: { temperature: 0.3, reasoningEffort: "low" },
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
      },
      { asType: "generation" },
    );

    const it = provider.chatStream(
      [{ role: "user", content: transcript }],
      systemPrompt,
      { ...options, reasoningEffort: "low" },
    );
    let r = await it.next();
    while (!r.done) {
      accumulated += r.value;
      r = await it.next();
    }
    const usage = r.value;
    gen
      .update({
        output: accumulated,
        ...(usage && { usageDetails: toLangfuseUsageDetails(usage) }),
      })
      .end();

    return parseSuggestions(accumulated);
  } catch (err) {
    // Best-effort feature: never throw. But surface the cause so the failure is
    // visible in logs, and end the observation so it isn't left dangling — a
    // dangling generation is exactly what renders as `output: undefined`.
    console.error("[generateSuggestions] failed:", err);
    gen
      ?.update({
        output: accumulated,
        level: "ERROR",
        statusMessage: err instanceof Error ? err.message : String(err),
      })
      .end();
    return [];
  }
}

/**
 * Merge older conversation turns into a rolling room summary. Uses a cheaper model
 * and never throws — on failure it returns the existing summary unchanged.
 */
export async function updateConversationSummary(
  existingSummary: string | null | undefined,
  newMessagesText: string,
  systemPrompt: string,
  config?: LLMConfig,
  options?: LLMRequestOptions,
): Promise<string> {
  if (!newMessagesText.trim()) {
    return existingSummary?.trim() ?? "";
  }

  try {
    const cheapConfig = {
      ...config,
      model: undefined,
      provider: config?.provider,
      apiKey: config?.apiKey,
    };

    const userContent = existingSummary?.trim()
      ? `Existing summary:\n${existingSummary.trim()}\n\nNew conversation turns:\n${newMessagesText.trim()}`
      : `New conversation turns:\n${newMessagesText.trim()}`;

    const summary = await completeText(
      [{ role: "user", content: userContent }],
      systemPrompt,
      cheapConfig,
      { ...options, reasoningEffort: "low" },
    );

    return summary || existingSummary?.trim() || "";
  } catch {
    return existingSummary?.trim() ?? "";
  }
}

export { LLMError } from "./types";
export type {
  LLMProvider,
  ChatMessage,
  TokenUsage,
  LLMRequestOptions,
} from "./types";
export { promptCacheKey } from "./cache";
