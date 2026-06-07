# Unspoken

A context-aware relationship communication decoder with persistent multi-turn chat rooms. Tell Unspoken what your partner said or did — get the real meaning, the emotional need behind it, an urgency rating, and a concrete action plan. Then keep talking: ask follow-ups, share more context, and get warm conversational advice across multiple saved rooms — all powered by a structured-output LLM pipeline backed by MongoDB.

Built as a portfolio project demonstrating production-grade Generative AI workflows, multi-turn chat architecture, Zod-enforced structured JSON from LLMs, and mobile-first Next.js engineering.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                               │
│                                                                     │
│   Anonymous ID generated and stored in localStorage                 │
│   (scopes all rooms and messages to this device)                    │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  Sidebar: room list │  Chat thread  │  Composer (Enter=send) │  │
│   └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
   POST /api/rooms              POST /api/rooms/[id]/messages
   (create room)                (send message — SSE stream back)
              │                         │
              └────────────┬────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS ROUTE HANDLERS                           │
│                                                                     │
│   GET  /api/rooms              — list rooms for userId             │
│   POST /api/rooms              — create room                        │
│   PATCH /api/rooms/[id]        — rename room                        │
│   DELETE /api/rooms/[id]       — delete room + all messages         │
│   GET  /api/rooms/[id]/messages — load room + message history       │
│   POST /api/rooms/[id]/messages — send message (SSE response)       │
│                                                                     │
│   Message mode auto-detection:                                      │
│     priorMessages.length === 0  →  "decode" mode (structured JSON) │
│     priorMessages.length  >  0  →  "text" mode (free conversation) │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
               ┌───────────┴───────────┐
               │                       │
               ▼                       ▼
┌──────────────────────┐   ┌───────────────────────────┐
│   DECODE MODE        │   │   TEXT (CHAT) MODE        │
│   (first message)    │   │   (follow-ups)            │
│                      │   │                           │
│   translateStream()  │   │   chatStream()            │
│   → forced JSON via  │   │   → free-text streaming   │
│     LLM registry     │   │     with full history     │
│   → Zod validation   │   │     (all prior turns)     │
│   → SSE chunks       │   │   → SSE deltas            │
└──────────┬───────────┘   └────────────┬──────────────┘
           │                            │
           └───────────┬────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LLM REGISTRY  (lib/llm/)                         │
│                                                                     │
│   LLM_PROVIDER env                                                  │
│        │                                                            │
│        ├── "openai"    → gpt-4.1                                    │
│        │                translateStream: zodResponseFormat          │
│        │                chatStream: plain chat.completions          │
│        │                                                            │
│        ├── "anthropic" → claude-sonnet-4-5                          │
│        │                translateStream: forced tool_use            │
│        │                chatStream: plain messages.stream           │
│        │                                                            │
│        └── "gemini"    → gemini-2.5-flash                           │
│                         translateStream: responseMimeType+schema    │
│                         chatStream: multi-turn contents[]           │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MONGODB  (Atlas)                                  │
│                                                                     │
│   Collection: rooms                                                 │
│     { _id, userId, title, lang, createdAt, updatedAt }              │
│                                                                     │
│   Collection: messages                                              │
│     { _id, roomId, role, kind, content, decoded?, createdAt }       │
│                                                                     │
│   All reads/writes scoped by userId (anonymous browser ID)          │
│   Decode messages store the full structured JSON in decoded{}        │
│   so the UI can re-render the dashboard card from history           │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** v3 (mobile-first)
- **MongoDB** v7 — Atlas cloud database for rooms and messages
- **OpenAI** `gpt-4.1` via Structured Outputs (`zodResponseFormat`) + plain chat
- **Anthropic** `claude-sonnet-4-5` via forced tool-use JSON + plain streaming
- **Google Gemini** `gemini-2.5-flash` via `responseMimeType` + multi-turn `contents[]`
- **Zod** v3 — shared schema for LLM output enforcement and API validation
- **Langfuse** — OpenTelemetry-based LLM observability (traces, token usage, cost)
- **Bun** as package manager and runtime

## Observability (Langfuse)

Every `POST /api/rooms/[id]/messages` request produces a `send-message` trace in [Langfuse](https://langfuse.com) with nested generation observations for each LLM call:

| Observation   | Description                                              |
| ------------- | -------------------------------------------------------- |
| `decode`      | First-message structured-output call (translate to JSON) |
| `chat`        | Follow-up conversational reply                           |
| `suggestions` | Lightweight follow-up suggestion generation              |

Each generation records the model name, input messages, full output, and token usage (input / output / total) so Langfuse can compute cost. Traces are grouped by `userId` (the anonymous browser ID) and `sessionId` (the room ID).

To enable, add to `.env.local`:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com   # change for EU/JP/HIPAA regions
```

Keys are read automatically by `LangfuseSpanProcessor`. When absent, observations are created in-process but not exported — no errors, no performance impact.

## Setup

```bash
# 1. Clone and install
git clone <repo>
cd Unspoken
bun install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — set your LLM API key and MONGODB_URI
```

### Environment Variables

| Variable               | Required           | Default                      | Description                                          |
| ---------------------- | ------------------ | ---------------------------- | ---------------------------------------------------- |
| `LLM_PROVIDER`         | No                 | `openai`                     | Active provider: `openai`, `anthropic`, or `gemini`  |
| `LLM_MODEL`            | No                 | Per-provider default         | Override model name                                  |
| `OPENAI_API_KEY`       | If using OpenAI    | —                            | OpenAI API key                                       |
| `ANTHROPIC_API_KEY`    | If using Anthropic | —                            | Anthropic API key                                    |
| `GOOGLE_API_KEY`       | If using Gemini    | —                            | Google AI Studio API key                             |
| `MONGODB_URI`          | Yes                | —                            | MongoDB connection string (Atlas or local)           |
| `MONGODB_DB`           | No                 | `unspoken`                   | Database name                                        |
| `AUTH_SECRET`          | Yes                | —                            | Random 32+ char string used to sign session JWTs     |
| `RATE_LIMIT_MAX`       | No                 | `10`                         | Max requests per window per IP                       |
| `RATE_LIMIT_WINDOW_MS` | No                 | `60000`                      | Rate limit window in milliseconds                    |
| `LANGFUSE_PUBLIC_KEY`  | No                 | —                            | Langfuse public key — traces are skipped when absent |
| `LANGFUSE_SECRET_KEY`  | No                 | —                            | Langfuse secret key                                  |
| `LANGFUSE_BASE_URL`    | No                 | `https://cloud.langfuse.com` | Langfuse region URL (EU / US / JP / HIPAA)           |

> **Atlas note:** If your password contains special characters (e.g. `@`), URL-encode them in `MONGODB_URI` — `@` becomes `%40`.
> In Atlas → Network Access, add your IP (or `0.0.0.0/0` for development).

```bash
# 3. Run development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
app/
├── page.tsx                         ← chat shell (sidebar + thread + composer)
├── globals.css                      ← custom keyframes (blink, bounce-dot)
├── layout.tsx
└── api/
    ├── health/route.ts
    ├── translate/route.ts           ← legacy single-shot endpoint (kept)
    └── rooms/
        ├── route.ts                 ← GET list / POST create room
        └── [id]/
            ├── route.ts             ← PATCH rename / DELETE room
            └── messages/route.ts   ← GET history / POST send (SSE)

lib/
├── schema.ts                        ← Zod schemas (TranslationResult, rooms, messages)
├── prompt.ts                        ← system prompts: decode (en/id) + chat (en/id)
├── rateLimit.ts                     ← in-memory sliding window
├── api/auth.ts                      ← anonymous userId from x-user-id header
├── chat/
│   ├── types.ts                     ← Room + Message types (client-safe, no MongoDB)
│   └── client.ts                    ← browser fetch/SSE helpers + getUserId()
├── db/
│   ├── mongo.ts                     ← cached MongoClient connection
│   └── repository.ts                ← listRooms, createRoom, addMessage, etc.
├── i18n/
│   ├── translations.ts              ← en + id strings (incl. chat.* keys)
│   └── context.tsx                  ← LanguageProvider + useI18n hook
└── llm/
    ├── types.ts                     ← LLMProvider interface (translate + chat)
    ├── openai.ts                    ← zodResponseFormat + plain chat completions
    ├── anthropic.ts                 ← forced tool_use + plain messages.stream
    ├── gemini.ts                    ← responseMimeType + multi-turn contents[]
    └── index.ts                     ← registry + translateStream + chatStream

components/
├── ChatSidebar.tsx                  ← room list + new chat + delete
├── ChatThread.tsx                   ← message bubbles, decode dashboard, streaming
├── ChatComposer.tsx                 ← auto-grow textarea, Enter to send
├── ResultsDashboard.tsx             ← decode result cards (reused in thread)
├── StreamingResults.tsx             ← skeleton cards during decode streaming
├── LiteralTranslation.tsx
├── UnderlyingNeedBadge.tsx
├── UrgencyMeter.tsx
├── ActionPlan.tsx
├── TranslatorInput.tsx              ← kept (used on empty state)
├── LanguageSwitcher.tsx
└── SettingsPanel.tsx                ← per-request provider/model/apiKey override
```

## Chat Flow

1. **New chat:** user sends first message → room created in MongoDB → `translateStream` produces structured decode → stored as `kind: "decode"` message with full `decoded` object → rendered as dashboard cards in the thread.

2. **Follow-up:** every subsequent message → full history loaded from MongoDB → `chatStream` sends all turns to the LLM (decode results are flattened to readable text for context) → plain text reply streams back token by token with a blinking cursor indicator.

3. **Identity:** an anonymous UUID is generated in `localStorage` on first visit. All rooms are scoped to it. No login required. Switching browsers or clearing storage starts fresh.

## Adding a New LLM Provider

1. Create `lib/llm/myprovider.ts` implementing the `LLMProvider` interface — all three methods: `translate`, `translateStream`, `chatStream`.
2. Register it in `lib/llm/index.ts` — one `case` in `buildProvider` and one entry in `PROVIDER_DEFAULTS`.
3. Set `LLM_PROVIDER=myprovider` in `.env.local`.

## Output Schema (Decode Mode)

```json
{
  "raw_input":           "string",
  "translation":         "string",
  "underlying_need":     "string",
  "underlying_need_hue": 0-360,
  "urgency_level":       1-5,
  "urgency_label":       "string",
  "urgency_summary":     "string",
  "action_plan":         ["string", "string", "string"],
  "follow_ups":          ["string", "string", "string"]
}
```

## Rate Limiting

In-memory sliding-window limiter (10 req / 60s per IP, configurable via env).
Applies to both the legacy `/api/translate` endpoint and the `/api/rooms/[id]/messages` POST.
