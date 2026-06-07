"use client";

import { useI18n } from "@/lib/i18n/context";
import type { Room } from "@/lib/chat/types";

interface ChatSidebarProps {
  rooms: Room[];
  activeRoomId: string | null;
  streamingRoomIds?: Set<string>;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

export default function ChatSidebar({
  rooms,
  activeRoomId,
  streamingRoomIds,
  onSelect,
  onNewChat,
  onDelete,
}: ChatSidebarProps) {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 active:scale-95"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          {t.chat.newChat}
        </button>
      </div>

      <p className="px-4 pb-2 pt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {t.chat.roomsTitle}
      </p>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {rooms.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-slate-600">
            {t.chat.noRooms}
          </p>
        ) : (
          rooms.map((room) => {
            const isActive = room.id === activeRoomId;
            const isStreaming = streamingRoomIds?.has(room.id) ?? false;
            return (
              <div
                key={room.id}
                className={`group flex items-center gap-1 rounded-lg pr-1 transition-colors ${
                  isActive ? "bg-slate-700/70" : "hover:bg-slate-800/80"
                }`}
              >
                <button
                  onClick={() => onSelect(room.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-300"
                  title={room.title}
                >
                  {isStreaming && !isActive && (
                    <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />
                  )}
                  <span className="truncate">{room.title}</span>
                </button>
                <button
                  onClick={() => onDelete(room.id)}
                  aria-label={t.chat.delete}
                  className="rounded-md p-1.5 text-slate-600 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </nav>
    </div>
  );
}
