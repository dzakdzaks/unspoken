"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import type { Message, Room } from "@/lib/chat/types";
import {
  fetchRooms,
  createRoom,
  deleteRoom,
  fetchMessages,
  streamMessage,
} from "@/lib/chat/client";
import SettingsPanel, {
  type LLMSettings,
  DEFAULT_SETTINGS,
} from "@/components/SettingsPanel";
import ChatSidebar from "@/components/ChatSidebar";
import ChatThread, { type StreamingState } from "@/components/ChatThread";
import ChatComposer from "@/components/ChatComposer";
import AuthScreen from "@/components/AuthScreen";

function moveToFront(rooms: Room[], id: string): Room[] {
  const idx = rooms.findIndex((r) => r.id === id);
  if (idx <= 0) return rooms;
  const copy = [...rooms];
  const [r] = copy.splice(idx, 1);
  return [r, ...copy];
}

interface RoomState {
  messages: Message[];
  streaming: StreamingState | null;
  error: string | null;
}

const EMPTY_ROOM_STATE: RoomState = { messages: [], streaming: null, error: null };

export default function Home() {
  const { t, locale } = useI18n();
  const { user, loading } = useAuth();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Per-room state: messages, streaming progress, and error — all keyed by roomId
  const [roomStates, setRoomStates] = useState<Map<string, RoomState>>(new Map());

  // Error shown only in the null (new-chat) state
  const [nullError, setNullError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [llmSettings, setLLMSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);
  const handleSettingsChange = useCallback((s: LLMSettings) => setLLMSettings(s), []);

  // One AbortController per room — streams survive room switches
  const abortRefs = useRef<Map<string, AbortController>>(new Map());
  // Tracks which rooms have had their messages fetched so we don't re-fetch on every switch
  const loadedRooms = useRef<Set<string>>(new Set());

  function setRoom(roomId: string, updater: (prev: RoomState) => RoomState) {
    setRoomStates((prev) => {
      const next = new Map(prev);
      next.set(roomId, updater(next.get(roomId) ?? EMPTY_ROOM_STATE));
      return next;
    });
  }

  useEffect(() => {
    if (!user) return;
    fetchRooms().then(setRooms).catch(() => {});
  }, [user]);

  const startNewChat = useCallback(() => {
    setActiveRoomId(null);
    setNullError(null);
    setSidebarOpen(false);
  }, []);

  const selectRoom = useCallback(
    async (id: string) => {
      setActiveRoomId(id);
      setSidebarOpen(false);

      // Already loaded (or actively streaming) — just switch the view
      if (loadedRooms.current.has(id)) return;
      loadedRooms.current.add(id);

      // Seed an empty state so the thread renders immediately
      setRoomStates((prev) => {
        if (prev.has(id)) return prev;
        const next = new Map(prev);
        next.set(id, { ...EMPTY_ROOM_STATE });
        return next;
      });

      try {
        const { messages: msgs } = await fetchMessages(id);
        setRoom(id, (s) => ({ ...s, messages: msgs }));
      } catch {
        setRoom(id, (s) => ({ ...s, error: t.chat.loadError }));
      }
    },
    [t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t.chat.deleteConfirm)) return;
      try {
        await deleteRoom(id);
      } catch {
        return;
      }
      abortRefs.current.get(id)?.abort();
      abortRefs.current.delete(id);
      loadedRooms.current.delete(id);
      setRooms((prev) => prev.filter((r) => r.id !== id));
      setRoomStates((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      if (activeRoomId === id) startNewChat();
    },
    [activeRoomId, startNewChat, t],
  );

  async function handleSend(input: string) {
    setNullError(null);

    let roomId = activeRoomId;
    const currentMessages = roomId ? (roomStates.get(roomId)?.messages ?? []) : [];
    const willDecode = roomId === null || currentMessages.length === 0;

    if (!roomId) {
      try {
        const room = await createRoom(input.slice(0, 60), locale);
        setRooms((prev) => [room, ...prev]);
        setActiveRoomId(room.id);
        loadedRooms.current.add(room.id);
        setRoomStates((prev) => {
          const next = new Map(prev);
          next.set(room.id, { ...EMPTY_ROOM_STATE });
          return next;
        });
        roomId = room.id;
      } catch {
        setNullError(t.chat.loadError);
        return;
      }
    }

    const targetRoomId = roomId;

    // Abort only the previous stream for THIS room — other rooms keep running
    abortRefs.current.get(targetRoomId)?.abort();
    const controller = new AbortController();
    abortRefs.current.set(targetRoomId, controller);

    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      roomId: targetRoomId,
      role: "user",
      kind: "text",
      content: input,
      createdAt: new Date().toISOString(),
    };

    setRoom(targetRoomId, (s) => ({
      ...s,
      messages: [...s.messages, optimistic],
      streaming: { mode: willDecode ? "decode" : "text", raw: "" },
      error: null,
    }));

    const body = {
      input,
      lang: locale,
      ...(llmSettings.provider ? { provider: llmSettings.provider } : {}),
      ...(llmSettings.model ? { model: llmSettings.model } : {}),
      ...(llmSettings.apiKey ? { apiKey: llmSettings.apiKey } : {}),
    };

    try {
      await streamMessage(targetRoomId, body, controller.signal, {
        onMeta: (mode, userMessage) => {
          setRoom(targetRoomId, (s) => ({
            ...s,
            streaming: s.streaming ? { ...s.streaming, mode } : { mode, raw: "" },
            messages: s.messages.map((m) => (m.id === tempId ? userMessage : m)),
          }));
        },
        onChunk: (v) =>
          setRoom(targetRoomId, (s) => ({
            ...s,
            streaming: s.streaming ? { ...s.streaming, raw: s.streaming.raw + v } : s.streaming,
          })),
        onDelta: (v) =>
          setRoom(targetRoomId, (s) => ({
            ...s,
            streaming: s.streaming ? { ...s.streaming, raw: s.streaming.raw + v } : s.streaming,
          })),
        onDone: (message) => {
          setRoom(targetRoomId, (s) => ({
            ...s,
            messages: [...s.messages, message],
            streaming: null,
          }));
          abortRefs.current.delete(targetRoomId);
          setRooms((prev) => moveToFront(prev, targetRoomId));
        },
        onError: (msg) => {
          setRoom(targetRoomId, (s) => ({ ...s, streaming: null, error: msg }));
          abortRefs.current.delete(targetRoomId);
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setRoom(targetRoomId, (s) => ({ ...s, streaming: null, error: t.errors.generic }));
      abortRefs.current.delete(targetRoomId);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-canvas">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const activeState = activeRoomId ? (roomStates.get(activeRoomId) ?? EMPTY_ROOM_STATE) : null;
  const messages = activeState?.messages ?? [];
  const streaming = activeState?.streaming ?? null;
  const error = activeState?.error ?? nullError;

  // IDs of rooms that have an active background stream (used to show sidebar indicator)
  const streamingRoomIds = new Set<string>();
  for (const [id, state] of roomStates.entries()) {
    if (state.streaming !== null) streamingRoomIds.add(id);
  }

  const hasAssistant = messages.some((m) => m.role === "assistant");
  const composerPlaceholder = hasAssistant ? t.chat.replyPlaceholder : t.input.placeholder;
  const showEmpty = activeRoomId === null;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-canvas text-body-strong">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-hairline bg-surface-card transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ChatSidebar
          rooms={rooms}
          activeRoomId={activeRoomId}
          streamingRoomIds={streamingRoomIds}
          onSelect={selectRoom}
          onNewChat={startNewChat}
          onDelete={handleDelete}
        />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          aria-hidden
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={t.chat.menu}
            className="rounded-md border border-hairline-strong p-2 text-muted hover:text-body-strong md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <h1 className="flex-1 truncate text-lg font-bold tracking-tight">
            Unspoken<span className="text-primary">AI</span>
          </h1>

          <SettingsPanel onSettingsChange={handleSettingsChange} />
        </header>

        <div className="flex-1 overflow-y-auto">
          {showEmpty ? (
            <div className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {t.header.badge}
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-ink">
                {t.chat.emptyTitle}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted">
                {t.chat.emptySubtitle}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {t.input.examples.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => handleSend(ex.replace(/^["']|["']$/g, ""))}
                    className="rounded-full border border-hairline-strong bg-surface-elevated/60 px-3 py-1.5 text-xs text-muted transition-colors hover:border-muted-soft hover:text-body"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              {error && (
                <div className="mt-5 w-full rounded-lg border border-accent-rose/30 bg-accent-rose/10 p-3">
                  <p className="text-sm font-semibold text-accent-rose">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-2xl px-4 py-6">
              <ChatThread
                messages={messages}
                streaming={streaming}
                error={error}
                onSuggestionSelect={handleSend}
              />
            </div>
          )}
        </div>

        <ChatComposer
          onSend={handleSend}
          disabled={streaming !== null}
          placeholder={composerPlaceholder}
        />

        <footer className="border-t border-hairline px-4 py-2 text-center text-xs text-muted-soft">
          {t.footer.privacy}
        </footer>
      </div>
    </div>
  );
}
