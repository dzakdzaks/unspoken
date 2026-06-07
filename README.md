# Unspoken

A context-aware relationship communication decoder with persistent, multi-turn chat rooms. Tell Unspoken what your partner said or did — get the real meaning, the emotional need behind it, an urgency rating, and a concrete action plan. Then keep talking: ask follow-ups, share more context, and get warm conversational advice across multiple saved rooms — all powered by a structured-output LLM pipeline backed by MongoDB.

Built as a portfolio project demonstrating production-grade Generative AI workflows: multi-turn chat architecture, Zod-enforced structured JSON from LLMs, a pluggable multi-provider LLM registry, rolling conversation summarization, prompt caching, LLM observability, and mobile-first Next.js engineering.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                               │
│                                                                     │
│   Email + password sign-in → httpOnly JWT session cookie            │
│   (scopes all rooms and messages to the authenticated user)         │
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
│   POST /api/auth/signup          — create account + set cookie     │
│   POST /api/auth/signin          — verify password + set cookie    │
│   POST /api/auth/signout         — clear cookie                     │
│   GET  /api/auth/me              — current user from cookie         │
│                                                                     │
│   GET  /api/rooms                — list rooms for user             │
│   POST /api/rooms                — create room                      │
│   PATCH /api/rooms/[id]          — rename room                      │
│   DELETE /api/rooms/[id]         — delete room + all messages       │
│   GET  /api/rooms/[id]/messages  — load room + message history     │
│   POST /api/rooms/[id]/messages  — send message (SSE response)     │
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
│     LLM registry     │   │     with rolling summary  │
│   → live partial     │   │     + recent turns        │
│     parse → cards    │   │   → suggestion chips      │
│   → Zod validation   │   │   → SSE deltas            │
│   → SSE chunks       │   │                           │
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
│        ├── "gemini"    → gemini-2.5-flash                           │
│        │                translateStream: responseMimeType+schema    │
│        │                chatStream: multi-turn contents[]           │
│        │                                                            │
│        └── "groq"      → openai/gpt-oss-120b                        │
│                         OpenAI-compatible chat.completions          │
│                                                                     │
│   A cheaper model (LLM_CHEAP_MODEL, Groq: openai/gpt-oss-20b)       │
│   handles follow-up suggestions and rolling conversation summaries. │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MONGODB  (Atlas or local)                        │
│                                                                     │
│   Collection: users                                                │
│     { _id, name, email, passwordHash, createdAt }                  │
│                                                                     │
│   Collection: rooms                                                │
│     { _id, userId, title, lang, contextSummary?,                   │
│       summaryThroughMessageId?, createdAt, updatedAt }             │
│                                                                     │
│   Collection: messages                                             │
│     { _id, roomId, role, kind, content,                            │
│       decoded?, suggestions?, createdAt }                          │
│                                                                     │
│   All room/message reads/writes scoped by userId.                  │
│   Decode messages store the full structured JSON in decoded{}      │
│   so the UI can re-render the dashboard card from history.         │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** v3 (mobile-first) + `next-themes` (dark mode)
- **MongoDB** v7 — Atlas or local; stores users, rooms, and messages
- **OpenAI** `gpt-4.1` via Structured Outputs (`zodResponseFormat`) + plain chat
- **Anthropic** `claude-sonnet-4-5` via forced tool-use JSON + plain streaming
- **Google Gemini** `gemini-2.5-flash` via `responseMimeType` + multi-turn `contents[]`
- **Groq** `openai/gpt-oss-120b` via the OpenAI-compatible API; cheap background calls use `openai/gpt-oss-20b`
- **Zod** v3 — shared schema for LLM output enforcement and API validation
- **jose** + **bcryptjs** — JWT session cookies and password hashing
- **react-markdown** + **remark-gfm** — rendering streamed Markdown chat replies
- **Langfuse** — OpenTelemetry-based LLM observability (traces, token usage, cost)
- **Bun** as package manager and runtime

## Key Features

- **Two-phase conversation** — the first message in a room produces a structured "decode" dashboard; every follow-up is free conversational text with full context.
- **Pluggable LLM registry** — four providers behind one interface; switch with a single env var or override per request.
- **Streaming everywhere** — decode JSON is parsed incrementally so dashboard cards fill in live; chat replies stream token by token.
- **Rolling summarization** — recent turns are kept verbatim while older turns are folded into a per-room running summary, keeping context bounded as conversations grow.
- **Follow-up suggestions** — a cheap second LLM call proposes tappable next-message chips after each reply.
- **Prompt caching** — stable per-locale cache keys let providers reuse cached system prompts.
- **Bilingual** — full English and Indonesian UI and prompts.
- **Observability** — every send is traced in Langfuse with nested generation spans and token usage.

## Authentication

Email/password accounts with a 30-day signed session:

- Passwords are hashed with **bcrypt** (`lib/auth/password.ts`).
- On sign-up / sign-in the server issues an **HS256 JWT** (`jose`) whose `sub` is the user's MongoDB `_id`, stored in an **httpOnly** cookie (`unspoken_session`); `secure` in production.
- Route handlers resolve the user via `getUserId()` (`lib/api/auth.ts`) — all room and message access is scoped to that id and returns `401` without a valid cookie.
- The browser is gated by `AuthScreen.tsx`; sign-in state is provided by `lib/auth/context.tsx`.

## Observability (Langfuse)

Every `POST /api/rooms/[id]/messages` request produces a `send-message` trace in [Langfuse](https://langfuse.com) with nested generation observations for each LLM call:

| Observation   | Description                                              |
| ------------- | -------------------------------------------------------- |
| `decode`      | First-message structured-output call (translate to JSON) |
| `chat`        | Follow-up conversational reply (and summary merges)      |
| `suggestions` | Lightweight follow-up suggestion generation              |

Each generation records the model name, input messages, full output, and token usage (input / output / total) so Langfuse can compute cost. Traces are grouped by `userId` and `sessionId` (the room id).

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
# Edit .env.local — set your LLM API key, MONGODB_URI, and AUTH_SECRET
```

A quick start is **Groq** (the default in `.env.example`): grab a free key at <https://console.groq.com/keys>, set `GROQ_API_KEY`, and point `MONGODB_URI` at a local or Atlas database.

### Environment Variables

| Variable               | Required           | Default                      | Description                                              |
| ---------------------- | ------------------ | ---------------------------- | -------------------------------------------------------- |
| `LLM_PROVIDER`         | No                 | `openai`                     | Active provider: `openai`, `anthropic`, `gemini`, `groq` |
| `LLM_MODEL`            | No                 | Per-provider default         | Override the main model name                             |
| `LLM_CHEAP_MODEL`      | No                 | Per-provider cheap default   | Model for suggestions and summaries                      |
| `OPENAI_API_KEY`       | If using OpenAI    | —                            | OpenAI API key                                           |
| `ANTHROPIC_API_KEY`    | If using Anthropic | —                            | Anthropic API key                                        |
| `GOOGLE_API_KEY`       | If using Gemini    | —                            | Google AI Studio API key                                 |
| `GROQ_API_KEY`         | If using Groq      | —                            | Groq API key (free tier)                                 |
| `MONGODB_URI`          | Yes                | —                            | MongoDB connection string (Atlas or local)               |
| `MONGODB_DB`           | No                 | `unspoken`                   | Database name                                            |
| `AUTH_SECRET`          | Yes                | —                            | Random 32+ char string used to sign session JWTs         |
| `RATE_LIMIT_MAX`       | No                 | `10`                         | Max requests per window per IP                           |
| `RATE_LIMIT_WINDOW_MS` | No                 | `60000`                      | Rate limit window in milliseconds                        |
| `LANGFUSE_PUBLIC_KEY`  | No                 | —                            | Langfuse public key — traces are skipped when absent     |
| `LANGFUSE_SECRET_KEY`  | No                 | —                            | Langfuse secret key                                      |
| `LANGFUSE_BASE_URL`    | No                 | `https://cloud.langfuse.com` | Langfuse region URL (EU / US / JP / HIPAA)               |

```bash
# 3. Run development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start a room.

## Architecture

```
app/
├── page.tsx                         ← chat shell (auth gate + sidebar + thread + composer)
├── globals.css                      ← custom keyframes (blink, bounce-dot)
├── layout.tsx
└── api/
    ├── health/route.ts
    ├── translate/route.ts           ← legacy single-shot endpoint (kept)
    ├── auth/
    │   ├── signup/route.ts          ← create account + set session cookie
    │   ├── signin/route.ts          ← verify password + set session cookie
    │   ├── signout/route.ts         ← clear cookie
    │   └── me/route.ts              ← current user from cookie
    └── rooms/
        ├── route.ts                 ← GET list / POST create room
        └── [id]/
            ├── route.ts             ← PATCH rename / DELETE room
            └── messages/route.ts   ← GET history / POST send (SSE)

lib/
├── schema.ts                        ← Zod schemas (TranslationResult, auth, rooms, messages)
├── prompt.ts                        ← system prompts: decode / chat / suggestions / summarize (en+id)
├── partialParse.ts                  ← incremental JSON parsing for live decode cards
├── rateLimit.ts                     ← in-memory sliding window (Upstash-swappable)
├── api/auth.ts                      ← resolve userId from session cookie
├── auth/
│   ├── session.ts                   ← JWT create/verify + cookie options (jose)
│   ├── password.ts                  ← bcrypt hash/verify
│   ├── users.ts                     ← user repository (find/create, PublicUser)
│   └── context.tsx                  ← client AuthProvider + useAuth hook
├── chat/
│   ├── types.ts                     ← Room + Message types (client-safe, no MongoDB)
│   ├── context.ts                   ← history/summary builders, decode→text flattening
│   └── client.ts                    ← browser fetch/SSE + auth helpers
├── db/
│   ├── mongo.ts                     ← cached MongoClient connection
│   └── repository.ts                ← rooms/messages CRUD + summary persistence
├── i18n/
│   ├── translations.ts              ← en + id strings
│   └── context.tsx                  ← LanguageProvider + useI18n hook
└── llm/
    ├── types.ts                     ← LLMProvider interface (translate + chat)
    ├── openai.ts                    ← zodResponseFormat + plain chat completions
    ├── anthropic.ts                 ← forced tool_use + plain messages.stream
    ├── gemini.ts                    ← responseMimeType + multi-turn contents[]
    ├── gemini-cache.ts              ← Gemini cached-content helper
    ├── groq.ts                      ← OpenAI-compatible chat.completions
    ├── cache.ts                     ← prompt cache key helper
    └── index.ts                     ← registry + translateStream/chatStream + suggestions/summary

components/
├── AuthScreen.tsx                   ← sign-in / sign-up gate
├── ChatSidebar.tsx                  ← room list + new chat + delete
├── ChatThread.tsx                   ← message bubbles, decode dashboard, streaming
├── ChatComposer.tsx                 ← auto-grow textarea, Enter to send
├── SuggestionChips.tsx             ← tappable follow-up suggestions
├── DecodeQuickActions.tsx           ← quick actions under a decode result
├── ResultsDashboard.tsx             ← decode result cards (reused in thread)
├── StreamingResults.tsx             ← skeleton cards during decode streaming
├── Markdown.tsx                     ← react-markdown + remark-gfm renderer
├── CopyButton.tsx
├── LiteralTranslation.tsx
├── UnderlyingNeedBadge.tsx
├── UrgencyMeter.tsx
├── ActionPlan.tsx
├── TranslatorInput.tsx              ← kept (used on empty state)
├── LanguageSwitcher.tsx
└── SettingsPanel.tsx                ← per-request provider/model/apiKey override
```

## Chat Flow

1. **New chat:** user sends the first message → room created in MongoDB → `translateStream` produces structured decode → streamed JSON is parsed incrementally into dashboard cards → validated with Zod → stored as a `kind: "decode"` message with the full `decoded` object.

2. **Follow-up:** every subsequent message → history loaded from MongoDB → older turns beyond the recent window are merged into the room's rolling `contextSummary` (cheap model) → `chatStream` sends `[summary] + recent turns + new message` to the LLM (decode results are flattened to readable text) → a Markdown reply streams back token by token → a lightweight second call generates follow-up suggestion chips.

3. **Identity:** users sign up with email + password. A signed JWT session cookie scopes every room and message to their account; clearing cookies or signing out ends the session.

## Adding a New LLM Provider

1. Create `lib/llm/myprovider.ts` implementing the `LLMProvider` interface — all three methods: `translate`, `translateStream`, `chatStream`.
2. Register it in `lib/llm/index.ts` — one `case` in `buildProvider`, plus entries in `PROVIDER_DEFAULTS` and `CHEAP_MODEL_DEFAULTS`.
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

`action_plan` and `follow_ups` are each exactly 3 items (enforced by Zod).

## Rate Limiting

In-memory sliding-window limiter (10 req / 60s per IP, configurable via env). The interface is intentionally Upstash-Redis-swappable — replace the internals of `lib/rateLimit.ts` and route handlers need no changes. Applies to both the legacy `/api/translate` endpoint and the `/api/rooms/[id]/messages` POST.

```

```
