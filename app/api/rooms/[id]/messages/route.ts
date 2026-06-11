import { NextRequest, NextResponse } from "next/server";
import { SendMessageRequestSchema, TranslationResultSchema } from "@/lib/schema";
import {
  chatStream,
  translateStream,
  generateSuggestions,
  updateConversationSummary,
  promptCacheKey,
  LLMError,
} from "@/lib/llm";
import {
  getSystemPrompt,
  getChatSystemPrompt,
  getSuggestionsSystemPrompt,
  getSummarizeSystemPrompt,
} from "@/lib/prompt";
import {
  buildChatHistory,
  formatMessagesForSummary,
  formatSuggestionsTranscript,
  getUnsummarizedOlderMessages,
  splitMessagesForContext,
  SUGGESTIONS_CONTEXT_MESSAGES,
} from "@/lib/chat/context";
import { checkRateLimit } from "@/lib/rateLimit";
import { getUserId } from "@/lib/api/auth";
import {
  addMessage,
  deleteMessage,
  getRoom,
  listMessages,
  touchRoom,
  updateRoomContextSummary,
} from "@/lib/db/repository";
import type { Locale } from "@/lib/i18n/translations";
import { translations } from "@/lib/i18n/translations";
import { startActiveObservation, propagateAttributes } from "@langfuse/tracing";
import { langfuseSpanProcessor } from "@/instrumentation";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function sse(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 401 });
  }

  const { id } = await params;
  const room = await getRoom(userId, id);
  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const messages = await listMessages(id);
  return NextResponse.json({ room, messages });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 401 });
  }

  const { id } = await params;
  const room = await getRoom(userId, id);
  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const messageId = req.nextUrl.searchParams.get("messageId");
  if (!messageId) {
    return NextResponse.json({ error: "Missing message id." }, { status: 400 });
  }

  const deleted = await deleteMessage(id, messageId);
  if (!deleted) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 401 });
  }

  const { id: roomId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawLang = (body as Record<string, unknown>)?.lang;
  const lang: Locale = rawLang === "id" ? "id" : "en";
  const t = translations[lang];

  const parsed = SendMessageRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    let message = t.errors.generic;
    if (issue?.code === "too_small") message = t.errors.emptyInput;
    else if (issue?.code === "too_big") message = t.errors.inputTooLong;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const room = await getRoom(userId, roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const { input, lang: parsedLang, provider, model, apiKey } = parsed.data;
  const llmConfig = { provider, model, apiKey };

  // First message in a room produces the structured decode; subsequent
  // messages are conversational free text.
  const priorMessages = await listMessages(roomId);
  const mode: "decode" | "text" = priorMessages.length === 0 ? "decode" : "text";

  // Persist the user's message before streaming the assistant reply.
  const userMessage = await addMessage(roomId, {
    role: "user",
    kind: "text",
    content: input,
  });
  await touchRoom(roomId);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(sse(payload)));

      await propagateAttributes(
        {
          userId,
          sessionId: roomId,
          metadata: {
            mode,
            lang: parsedLang,
            category: room.category,
            provider: parsed.data.provider ?? "default",
          },
        },
        async () => {
          await startActiveObservation("send-message", async (span) => {
            span.update({ input });

            try {
              send({ t: "meta", mode, roomId, userMessage });

              if (mode === "decode") {
                let accumulated = "";
                for await (const chunk of translateStream(
                  input,
                  getSystemPrompt(parsedLang, room.category),
                  llmConfig,
                  {
                    promptCacheKey: promptCacheKey(
                      "decode",
                      parsedLang,
                      room.category
                    ),
                  }
                )) {
                  accumulated += chunk;
                  send({ t: "chunk", v: chunk });
                }

                let rawParsed: unknown;
                try {
                  rawParsed = JSON.parse(accumulated);
                } catch {
                  send({ t: "error", code: "PARSE_ERROR", message: t.errors.generic });
                  controller.close();
                  return;
                }

                const validation = TranslationResultSchema.safeParse(rawParsed);
                if (!validation.success) {
                  send({ t: "error", code: "PARSE_ERROR", message: t.errors.generic });
                  controller.close();
                  return;
                }

                const assistantMessage = await addMessage(roomId, {
                  role: "assistant",
                  kind: "decode",
                  content: validation.data.translation,
                  decoded: validation.data,
                  suggestions: validation.data.follow_ups,
                });
                await touchRoom(roomId);
                span.update({ output: validation.data.translation });
                send({ t: "done", message: assistantMessage });
              } else {
                const unsummarizedOlder = getUnsummarizedOlderMessages(
                  priorMessages,
                  room.summaryThroughMessageId
                );

                let contextSummary = room.contextSummary ?? null;
                if (unsummarizedOlder.length > 0) {
                  const updatedSummary = await updateConversationSummary(
                    contextSummary,
                    formatMessagesForSummary(unsummarizedOlder),
                    getSummarizeSystemPrompt(parsedLang),
                    llmConfig,
                    { promptCacheKey: promptCacheKey("summarize", parsedLang) }
                  );

                  if (updatedSummary) {
                    contextSummary = updatedSummary;
                    const { older } = splitMessagesForContext(priorMessages);
                    const summaryThroughMessageId = older[older.length - 1]?.id;
                    if (summaryThroughMessageId) {
                      await updateRoomContextSummary(
                        roomId,
                        updatedSummary,
                        summaryThroughMessageId
                      );
                    }
                  }
                }

                const { recent } = splitMessagesForContext(priorMessages);
                const history = buildChatHistory(
                  [...recent, userMessage],
                  contextSummary
                );

                let accumulated = "";
                for await (const chunk of chatStream(
                  history,
                  getChatSystemPrompt(parsedLang, room.category),
                  llmConfig,
                  {
                    promptCacheKey: promptCacheKey(
                      "chat",
                      parsedLang,
                      room.category
                    ),
                  }
                )) {
                  accumulated += chunk;
                  send({ t: "delta", v: chunk });
                }

                const reply = accumulated.trim();

                // Best-effort follow-up suggestions via a second lightweight call.
                // Never blocks or breaks the reply — returns [] on any failure.
                const suggestionContext = [
                  ...history,
                  { role: "assistant" as const, content: reply },
                ].slice(-SUGGESTIONS_CONTEXT_MESSAGES);
                const transcript = formatSuggestionsTranscript(suggestionContext);
                const suggestions = await generateSuggestions(
                  transcript,
                  getSuggestionsSystemPrompt(parsedLang),
                  llmConfig,
                  { promptCacheKey: promptCacheKey("suggest", parsedLang) }
                );

                const assistantMessage = await addMessage(roomId, {
                  role: "assistant",
                  kind: "text",
                  content: reply,
                  suggestions,
                });
                await touchRoom(roomId);
                span.update({ output: reply });
                send({ t: "done", message: assistantMessage });
              }
            } catch (err) {
              console.error("[messages route] stream error:", err);
              const message =
                err instanceof LLMError && err.code === "MISSING_API_KEY"
                  ? "LLM API key is not configured."
                  : t.errors.generic;
              send({ t: "error", code: "API_ERROR", message });
            } finally {
              controller.close();
            }
          });
        }
      );

      await langfuseSpanProcessor.forceFlush();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
