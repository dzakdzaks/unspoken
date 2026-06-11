import { NextRequest, NextResponse } from "next/server";
import { TranslateRequestSchema, TranslationResultSchema } from "@/lib/schema";
import { translateStream, LLMError, promptCacheKey } from "@/lib/llm";
import { getSystemPrompt } from "@/lib/prompt";
import { checkRateLimit } from "@/lib/rateLimit";
import type { TranslationResult } from "@/lib/schema";
import type { Locale } from "@/lib/i18n/translations";
import { translations } from "@/lib/i18n/translations";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// SSE helpers
function sseChunk(text: string): string {
  return `data: ${JSON.stringify({ t: "chunk", v: text })}\n\n`;
}

function sseDone(result: TranslationResult): string {
  return `data: ${JSON.stringify({ t: "done", result })}\n\n`;
}

function sseError(code: string, message: string): string {
  return `data: ${JSON.stringify({ t: "error", code, message })}\n\n`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Extract locale early so validation errors can be returned in the right language.
  const rawLang = (body as Record<string, unknown>)?.lang;
  const lang: Locale = rawLang === "id" ? "id" : "en";
  const t = translations[lang];

  const parsed = TranslateRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    let message = t.errors.generic;
    if (issue?.code === "too_small") message = t.errors.emptyInput;
    else if (issue?.code === "too_big") message = t.errors.inputTooLong;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { input, lang: parsedLang, provider, model, apiKey } = parsed.data;
  const systemPrompt = getSystemPrompt(parsedLang);
  const llmConfig = { provider, model, apiKey };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let accumulated = "";

        for await (const chunk of translateStream(
          input,
          systemPrompt,
          llmConfig,
          { promptCacheKey: promptCacheKey("decode", parsedLang) }
        )) {
          accumulated += chunk;
          controller.enqueue(encoder.encode(sseChunk(chunk)));
        }

        // Parse and validate the complete JSON
        let rawParsed: unknown;
        try {
          rawParsed = JSON.parse(accumulated);
        } catch {
          controller.enqueue(
            encoder.encode(sseError("PARSE_ERROR", "Response was not valid JSON."))
          );
          controller.close();
          return;
        }

        const validation = TranslationResultSchema.safeParse(rawParsed);
        if (!validation.success) {
          controller.enqueue(
            encoder.encode(sseError("PARSE_ERROR", "Response failed validation."))
          );
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(sseDone(validation.data)));
      } catch (err) {
        if (err instanceof LLMError) {
          if (err.code === "MISSING_API_KEY") {
            controller.enqueue(
              encoder.encode(sseError("MISSING_API_KEY", "LLM API key is not configured."))
            );
          } else if (err.code === "UNKNOWN_PROVIDER") {
            controller.enqueue(
              encoder.encode(sseError("UNKNOWN_PROVIDER", "LLM provider is misconfigured."))
            );
          } else {
            controller.enqueue(
              encoder.encode(sseError("API_ERROR", "The AI service encountered an error."))
            );
          }
        } else {
          controller.enqueue(
            encoder.encode(sseError("UNKNOWN", "An unexpected error occurred."))
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-RateLimit-Remaining": String(rl.remaining),
    },
  });
}
