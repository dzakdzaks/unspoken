import type { Locale } from "@/lib/i18n/translations";
import type { Message, Room } from "./types";
import type { PublicUser } from "@/lib/auth/users";

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  return ((await res.json()) as { user: PublicUser }).user;
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<PublicUser> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ name, email, password }),
  });
  const data = (await res.json()) as { user?: PublicUser; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Sign up failed.");
  return data.user!;
}

export async function signIn(
  email: string,
  password: string,
): Promise<PublicUser> {
  const res = await fetch("/api/auth/signin", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { user?: PublicUser; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Sign in failed.");
  return data.user!;
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
}

// ---------------------------------------------------------------------------
// Room / message helpers (cookie sent automatically for same-origin requests)
// ---------------------------------------------------------------------------

export async function fetchRooms(): Promise<Room[]> {
  const res = await fetch("/api/rooms");
  if (!res.ok) throw new Error("Failed to load rooms.");
  const data = (await res.json()) as { rooms: Room[] };
  return data.rooms;
}

export async function createRoom(title: string, lang: Locale): Promise<Room> {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ title, lang }),
  });
  if (!res.ok) throw new Error("Failed to create room.");
  return ((await res.json()) as { room: Room }).room;
}

export async function deleteRoom(id: string): Promise<void> {
  const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete room.");
}

export async function fetchMessages(
  id: string,
): Promise<{ room: Room; messages: Message[] }> {
  const res = await fetch(`/api/rooms/${id}/messages`);
  if (!res.ok) throw new Error("Failed to load messages.");
  return (await res.json()) as { room: Room; messages: Message[] };
}

export async function deleteMessage(
  roomId: string,
  messageId: string,
): Promise<void> {
  const res = await fetch(
    `/api/rooms/${roomId}/messages?messageId=${encodeURIComponent(messageId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete message.");
}

export type StreamMode = "decode" | "text" | "clarify";

export interface SendBody {
  input: string;
  lang: Locale;
  skipClarify?: boolean;
  provider?: string;
  model?: string;
  apiKey?: string;
}

export interface StreamHandlers {
  onMeta?: (mode: StreamMode, userMessage?: Message) => void;
  onCrisis?: (message: Message) => void;
  onChunk?: (delta: string) => void;
  onDelta?: (delta: string) => void;
  onDone?: (message: Message) => void;
  onError?: (message: string) => void;
}

type SseEvent =
  | {
      t: "meta";
      mode: StreamMode;
      roomId: string;
      userMessage?: Message;
    }
  | { t: "crisis"; message: Message }
  | { t: "chunk"; v: string }
  | { t: "delta"; v: string }
  | { t: "done"; message: Message }
  | { t: "error"; code: string; message: string };

export async function streamMessage(
  roomId: string,
  body: SendBody,
  signal: AbortSignal,
  handlers: StreamHandlers,
): Promise<void> {
  const res = await fetch(`/api/rooms/${roomId}/messages`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let message = "Request failed.";
    try {
      message = ((await res.json()) as { error?: string }).error ?? message;
    } catch {
      // ignore
    }
    handlers.onError?.(message);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    handlers.onError?.("Stream unavailable.");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;

      let msg: SseEvent;
      try {
        msg = JSON.parse(payload) as SseEvent;
      } catch {
        continue;
      }

      switch (msg.t) {
        case "crisis":
          handlers.onCrisis?.(msg.message);
          break;
        case "meta":
          handlers.onMeta?.(msg.mode, msg.userMessage);
          break;
        case "chunk":
          handlers.onChunk?.(msg.v);
          break;
        case "delta":
          handlers.onDelta?.(msg.v);
          break;
        case "done":
          handlers.onDone?.(msg.message);
          break;
        case "error":
          handlers.onError?.(msg.message);
          break;
      }
    }
  }
}
