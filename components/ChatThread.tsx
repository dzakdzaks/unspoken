"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/chat/types";
import { useI18n } from "@/lib/i18n/context";
import { parsePartialTranslation } from "@/lib/partialParse";
import ResultsDashboard from "./ResultsDashboard";
import StreamingResults from "./StreamingResults";
import Markdown from "./Markdown";
import CopyButton from "./CopyButton";
import SuggestionChips from "./SuggestionChips";
import DecodeQuickActions from "./DecodeQuickActions";

export interface StreamingState {
  mode: "decode" | "text" | "clarify";
  raw: string;
}

interface ChatThreadProps {
  messages: Message[];
  streaming: StreamingState | null;
  error: string | null;
  onSuggestionSelect: (text: string) => void;
  onSkipClarify?: () => void;
  onRetry?: () => void;
}

export function ErrorBubble({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-accent-rose/30 bg-accent-rose/10 p-3">
      <p className="text-sm font-semibold text-accent-rose">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-accent-rose/40 px-3 py-1.5 text-xs font-semibold text-accent-rose transition-colors hover:bg-accent-rose/15"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path
              fillRule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
              clipRule="evenodd"
            />
          </svg>
          {t.actions.tryAgain}
        </button>
      )}
    </div>
  );
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
  onSkipClarify,
  onRetry,
}: ChatThreadProps) {
  const { t } = useI18n();
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
  const hasDecode = messages.some((m) => m.kind === "decode");

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
              <ResultsDashboard result={m.decoded} showInputEcho={false} />
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

        if (m.kind === "clarify") {
          return (
            <div key={m.id} className="flex flex-col gap-2">
              <AssistantBubble content={m.content} />
              {chips}
              {isLatest && !hasDecode && onSkipClarify && (
                <button
                  type="button"
                  onClick={onSkipClarify}
                  className="self-start text-xs font-semibold text-muted transition-colors hover:text-body"
                >
                  {t.chat.skipClarify}
                </button>
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

      {error && <ErrorBubble message={error} onRetry={onRetry} />}

      <div ref={bottomRef} />
    </div>
  );
}
