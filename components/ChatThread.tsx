"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/chat/types";
import { parsePartialTranslation } from "@/lib/partialParse";
import ResultsDashboard from "./ResultsDashboard";
import StreamingResults from "./StreamingResults";
import Markdown from "./Markdown";
import CopyButton from "./CopyButton";
import SuggestionChips from "./SuggestionChips";
import DecodeQuickActions from "./DecodeQuickActions";

export interface StreamingState {
  mode: "decode" | "text";
  raw: string;
}

interface ChatThreadProps {
  messages: Message[];
  streaming: StreamingState | null;
  error: string | null;
  onSuggestionSelect: (text: string) => void;
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="group flex flex-col items-end">
      <div className="mt-7 max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-br-sm bg-primary px-4 py-2.5 text-sm font-medium leading-relaxed text-on-primary">
        {content}
      </div>
      <div className="mt-1 flex justify-end opacity-100 transition-opacity focus-within:opacity-100 hover-device:opacity-0 hover-device:group-hover:opacity-100">
        <CopyButton value={content} />
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-lg rounded-bl-sm border border-hairline-strong/50 bg-surface-elevated/60 px-4 py-3.5">
        <span className="inline-block h-2 w-2 animate-thinking-bounce rounded-full bg-primary" />
        <span className="inline-block h-2 w-2 animate-thinking-bounce-delay-1 rounded-full bg-primary" />
        <span className="inline-block h-2 w-2 animate-thinking-bounce-delay-2 rounded-full bg-primary" />
      </div>
    </div>
  );
}

function AssistantBubble({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  return (
    <div className="group flex justify-start">
      <div className="max-w-[85%] break-words rounded-lg rounded-bl-sm border border-hairline-strong/50 bg-surface-elevated/60 px-4 py-2.5">
        <Markdown content={content} />
        {streaming ? (
          <span className="-mt-1 inline-block h-[1.1em] w-0.5 animate-blink bg-primary align-middle" />
        ) : (
          <div className="mt-1.5 flex justify-end border-t border-hairline/60 pt-1.5 opacity-100 transition-opacity focus-within:opacity-100 hover-device:opacity-0 hover-device:group-hover:opacity-100">
            <CopyButton value={content} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatThread({
  messages,
  streaming,
  error,
  onSuggestionSelect,
}: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming?.raw, error]);

  // Interactive actions are only offered under the most recent assistant
  // reply, and only while nothing is currently streaming.
  let lastAssistantId: string | null = null;
  for (const m of messages) {
    if (m.role === "assistant") lastAssistantId = m.id;
  }
  const interactive = streaming === null;

  return (
    <div className="flex flex-col gap-4">
      {messages.map((m) => {
        if (m.role === "user") {
          return <UserBubble key={m.id} content={m.content} />;
        }

        const isLatest = m.id === lastAssistantId && interactive;
        const chips =
          isLatest && m.kind !== "decode" && m.suggestions?.length ? (
            <SuggestionChips
              suggestions={m.suggestions}
              onSelect={onSuggestionSelect}
              disabled={!interactive}
            />
          ) : null;

        if (m.kind === "decode" && m.decoded) {
          return (
            <div key={m.id} className="flex flex-col gap-3">
              <ResultsDashboard
                result={m.decoded}
                showInputEcho={false}
              />
              {isLatest && (
                <DecodeQuickActions
                  suggestions={m.decoded.follow_ups}
                  onSelect={onSuggestionSelect}
                  disabled={!interactive}
                />
              )}
            </div>
          );
        }

        return (
          <div key={m.id} className="flex flex-col">
            <AssistantBubble content={m.content} />
            {chips}
          </div>
        );
      })}

      {streaming &&
        (streaming.mode === "decode" ? (
          <StreamingResults partial={parsePartialTranslation(streaming.raw)} />
        ) : streaming.raw ? (
          <AssistantBubble content={streaming.raw} streaming />
        ) : (
          <TypingIndicator />
        ))}

      {error && (
        <div className="rounded-lg border border-accent-rose/30 bg-accent-rose/10 p-3">
          <p className="text-sm font-semibold text-accent-rose">{error}</p>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
