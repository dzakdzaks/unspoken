# Product Requirements Document — Unspoken

**Document owner:** Product
**Status:** Reverse-engineered from codebase (living document)
**Last updated:** 2026-06-13
**Version:** 1.0

> This PRD is derived from the actual implementation in this repository, not from prior product docs. Where the code and any earlier documentation disagree, the code is treated as the source of truth.

---

## 1. Overview

**Unspoken** is an AI-powered relationship communication decoder. A user pastes something their partner said or did that left them confused; Unspoken returns a plain-language read of what it actually means, the emotional need underneath it, an urgency rating, and a concrete action plan they can act on today. After that first "decode," the room becomes a persistent, multi-turn chat where the user can ask follow-ups, add context, vent, or push back — and get warm, conversational advice that remembers the whole thread.

The product is built as a mobile-first Next.js web app backed by MongoDB, with a pluggable multi-provider LLM layer (OpenAI, Anthropic, Gemini, Groq), structured-output enforcement via Zod, rolling conversation summarization, prompt caching, a scope guardrail, and full Langfuse observability.

### One-line positioning
> Type what your partner said. Find out what they really meant — then figure out what to do next.

---

## 2. Problem Statement

People in relationships routinely misread their partner's words and behavior. Indirect communication ("Fine, do whatever you want"), mixed signals ("I'm not mad"), and loaded statements ("You never listen to me") create anxiety and conflict because the listener doesn't know:

1. **What it actually means** — the literal vs. intended message.
2. **What the partner actually needs** — the emotional driver underneath.
3. **How serious it is** — whether to relax or act now.
4. **What to do about it** — concrete, immediate next steps.

Existing options are inadequate: generic chatbots give clinical, hedged, or off-topic answers; friends are biased and not always available; advice blogs are generic. Users need an on-demand, judgment-free, specific, and actionable read — and a place to keep working the problem over time.

---

## 3. Goals & Non-Goals

### 3.1 Product Goals
- **G1 — Decode accurately and specifically.** Turn a short, often-emotional input into a structured, situation-specific interpretation (no canned phrasing).
- **G2 — Make it actionable.** Always deliver exactly 3 concrete, verb-led steps the user can take today.
- **G3 — Sustain the conversation.** Let users continue the thread with full context across many turns and many separate rooms.
- **G4 — Feel like a trusted friend.** Warm, direct, slightly witty tone; never clinical, never judgmental.
- **G5 — Be fast and alive.** Stream results so the dashboard and replies fill in live rather than after a long wait.
- **G6 — Stay in scope.** Politely decline off-topic asks (code, recipes, essays) without blocking legitimate, ambiguous relationship inputs.

### 3.2 Engineering / Platform Goals
- **G7 — Provider independence.** Swap LLM provider via one env var or per-request override, with no route changes.
- **G8 — Bounded context cost.** Keep token cost flat as conversations grow via recent-window + rolling summary.
- **G9 — Observability by default.** Every send is traced with per-call token usage and cost in Langfuse.
- **G10 — Bilingual.** Full English and Indonesian UI and prompts, with response language auto-detected from user input.

### 3.3 Non-Goals (current scope)
- Not a licensed therapy, crisis, or medical service (it has a safety posture, but it is not a clinical tool).
- No real-time partner-to-partner messaging or couples' shared accounts.
- No voice, image, or file input — text only.
- No social/sharing, no mobile native apps (responsive web only).
- No team/enterprise/admin surfaces.
- No payment/subscription/billing in the current implementation.

---

## 4. Target Users & Personas

- **Primary — "The Confused Partner."** In a romantic relationship, recently received a confusing or loaded message, wants a fast read and a plan. Mobile-first, emotionally activated, low patience for hedging.
- **Secondary — "The Over-thinker."** Returns repeatedly, keeps multiple rooms for different situations, uses follow-ups heavily to talk through scenarios.
- **Tertiary — "The Recruiter / Technical Evaluator."** This is also a portfolio project; a technical audience evaluates the GenAI architecture (structured outputs, multi-provider registry, summarization, observability).

Language audiences: English and Indonesian speakers (first-class support for both).

---

## 5. User Experience & Core Flows

### 5.1 Authentication
- Email + password sign-up / sign-in (`AuthScreen`).
- Server issues an HS256 JWT (`jose`) with the user's MongoDB `_id` as `sub`, stored in an httpOnly cookie (`unspoken_session`), 30-day expiry, `secure` in production.
- All room/message access is scoped to the authenticated user; unauthenticated API calls return `401`.
- Passwords hashed with bcrypt.

### 5.2 New chat → Decode (first message)
1. From the empty state, the user types what their partner said/did (or taps an example chip) and sends.
2. A room is created (titled from the first ~60 chars of input).
3. **Scope guardrail** runs (cheap model): if off-topic, a warm refusal is streamed and saved; the flow stops.
4. **Clarify decision** (up to `MAX_CLARIFY_QUESTIONS = 3`): the model may ask one focused clarifying question at a time, each with 2–3 tappable quick-reply chips, when missing context would materially change the decode. The user can **Skip & decode now** at any time.
5. When ready, **Decode mode** runs: the model returns structured JSON, streamed and parsed incrementally so dashboard cards fill in live, then validated with Zod.
6. The decode is saved as a `kind: "decode"` message containing the full structured object so the dashboard re-renders from history.

### 5.3 Follow-up conversation (text mode)
- Any message after a decode exists routes to **text mode**: a free-form Markdown reply streamed token by token.
- Context = rolling room summary (older turns) + recent verbatim turns + the new message; decode results are flattened to readable text for context.
- After each reply, a cheap second call generates 2–3 first-person **suggested reply** chips.

### 5.4 Room management
- Sidebar lists rooms (most-recently-updated first), supports new chat, select, and delete (with confirm). Rename is supported at the API level.
- Per-room streaming survives room switches; a sidebar indicator shows rooms with an active background stream.
- Multiple rooms can stream concurrently (one `AbortController` per room).

### 5.5 Decode dashboard (output surface)
Rendered from the structured result:
- **What She Really Meant** — the translation (lead line).
- **What She Actually Needs** — `underlying_need`, colored by a model-chosen HSL hue (`underlying_need_hue`).
- **How Serious Is This** — urgency meter (1–5) with label and summary.
- **What You Should Do** — exactly 3 action-plan steps (each markable done/not-done).
- **Suggested replies** — exactly 3 first-person follow-up chips.
- Copy and "decode another" quick actions.

### 5.6 Error & retry handling
- Network/stream/parse errors surface an error bubble with **Try Again**.
- Retry logic recreates identical conditions: an orphaned trailing user turn (reply failed) is dropped locally and server-side before resend, preventing duplicate turns and preserving correct decode-vs-text mode.
- Friendly, localized error copy for empty input, over-length input, off-topic, and generic failures.

### 5.7 Settings
- Per-request override panel: provider, model, and (optionally) the user's own API key (stored only in the browser, never persisted server-side). Falls back to server defaults.
- Language switcher (EN/ID).

---

## 6. Functional Requirements

### 6.1 Decode (structured output)
- **FR-1** The first message in a room (no prior decode) MUST produce a structured decode conforming to `TranslationResultSchema`.
- **FR-2** The decode MUST be streamed and parsed incrementally for live dashboard rendering, then validated with Zod before persistence; validation/parse failure MUST surface a friendly error (no partial/invalid persistence).
- **FR-3** `action_plan` and `follow_ups` MUST each contain exactly 3 items.
- **FR-4** `underlying_need_hue` MUST be an integer 0–360; `urgency_level` an integer 1–5.
- **FR-5** `raw_input` MUST echo the user's original text verbatim.

### 6.2 Clarify
- **FR-6** Before decoding, the system MAY ask up to 3 clarifying questions, one per turn, only when the missing detail would materially change the decode.
- **FR-7** Each clarify turn MUST include 2–3 first-person quick-reply options.
- **FR-8** The user MUST be able to skip clarification and force a decode (`skipClarify`), except after a decode already exists.
- **FR-9** If the clarify decision can't be parsed, the system MUST fail toward decoding (never block the user).

### 6.3 Chat (follow-ups)
- **FR-10** Messages after a decode MUST route to free-text Markdown chat.
- **FR-11** Replies MUST be streamed token by token.
- **FR-12** Each reply MUST be followed by a best-effort generation of 2–3 suggestion chips (failure returns an empty list, never an error).

### 6.4 Context management
- **FR-13** The recent window is the last `RECENT_MESSAGE_LIMIT = 20` messages, kept verbatim.
- **FR-14** Older messages MUST be folded into a per-room rolling `contextSummary` (cheap model), tracked by `summaryThroughMessageId` to avoid re-summarizing.
- **FR-15** Summarization failure MUST return the existing summary unchanged (never throw).

### 6.5 Guardrail
- **FR-16** Each non-skip user message MUST pass a scope guardrail (cheap model, low reasoning effort).
- **FR-17** The guardrail MUST default strongly to on-topic; bare quotes/short emotional phrases are valid relationship input.
- **FR-18** Off-topic messages MUST receive a warm, localized refusal (saved as an assistant text message).
- **FR-19** The guardrail MUST fail open on error/unparseable output (never block a legitimate user).

### 6.6 Multi-provider LLM
- **FR-20** The system MUST support OpenAI, Anthropic, Gemini, and Groq behind one `LLMProvider` interface (`translate`, `translateStream`, `chatStream`).
- **FR-21** Provider/model/API key MUST be configurable via env and overridable per request.
- **FR-22** A cheaper model MUST handle suggestions, summaries, guardrail, and clarify where applicable.
- **FR-23** Adding a provider MUST require only a new `lib/llm/<provider>.ts` plus registry entries — no route changes.

### 6.7 Persistence & identity
- **FR-24** Users, rooms, and messages MUST persist in MongoDB; all room/message reads/writes MUST be scoped by `userId`.
- **FR-25** Decode messages MUST store the full structured `decoded` object for history re-rendering.
- **FR-26** Deleting a room MUST delete all its messages.

### 6.8 Internationalization
- **FR-27** UI MUST be fully available in English and Indonesian.
- **FR-28** LLM responses MUST match the language of the user's input, auto-detected from the input itself (not from a setting); `raw_input` stays verbatim.

### 6.9 Rate limiting
- **FR-29** A sliding-window rate limiter (default 10 requests / 60s per IP, env-configurable) MUST apply to message sends; exceeding it returns `429` with `Retry-After`.

### 6.10 Observability
- **FR-30** Every `POST /api/rooms/[id]/messages` MUST produce a `send-message` Langfuse trace with nested generation observations (`guardrail`, `clarify-decision`, `decode`, `chat`, `suggestions`, summary), each recording model, input, output, and token usage; grouped by `userId` and `sessionId` (room id).
- **FR-31** When Langfuse keys are absent, tracing MUST be a no-op with no errors and no performance impact.

---

## 7. Safety & Trust Requirements

- **SR-1** If input describes real danger, threats, or abuse, the model MUST prioritize the user's safety above all other guidance (encoded in all relevant system prompts).
- **SR-2** The product MUST stay grounded in what the user actually shared — no invented backstory or unfounded assumptions.
- **SR-3** Tone MUST remain warm and non-judgmental; refusals MUST be gentle and invite the user back on-topic.
- **SR-4** User API keys provided via Settings MUST never be persisted server-side (browser-only).

---

## 8. Data Model (MongoDB)

**users**: `{ _id, name, email, passwordHash, createdAt }`

**rooms**: `{ _id, userId, title, lang, contextSummary?, summaryThroughMessageId?, createdAt, updatedAt }`

**messages**: `{ _id, roomId, role, kind, content, decoded?, suggestions?, createdAt }`
- `role`: `user | assistant`
- `kind`: `text | decode | clarify`
- `decoded`: full `TranslationResult` (decode messages only)

**Decode output schema (`TranslationResult`):**
`raw_input`, `translation`, `underlying_need`, `underlying_need_hue (0–360)`, `urgency_level (1–5)`, `urgency_label`, `urgency_summary`, `action_plan[3]`, `follow_ups[3]`.

---

## 9. API Surface

| Method & Path | Purpose |
| --- | --- |
| `POST /api/auth/signup` | Create account, set session cookie |
| `POST /api/auth/signin` | Verify password, set session cookie |
| `POST /api/auth/signout` | Clear session cookie |
| `GET /api/auth/me` | Current user from cookie |
| `GET /api/rooms` | List rooms for user |
| `POST /api/rooms` | Create room |
| `PATCH /api/rooms/[id]` | Rename room |
| `DELETE /api/rooms/[id]` | Delete room + all messages |
| `GET /api/rooms/[id]/messages` | Load room + message history |
| `POST /api/rooms/[id]/messages` | Send message (SSE stream response) |
| `POST /api/translate` | Legacy single-shot decode endpoint (retained) |
| `GET /api/health` | Health check |

**Streaming protocol (SSE events on send):** `meta` (mode + optional persisted user message), `chunk` (decode JSON fragments), `delta` (text/clarify tokens), `done` (final persisted message), `error` (code + localized message).

---

## 10. Technical Architecture (as built)

- **Frontend/Backend:** Next.js 15 App Router (TypeScript), React 19, Tailwind CSS v3 (mobile-first), `next-themes`.
- **LLM registry (`lib/llm/`):** one interface, four providers; main model for decode/chat, cheap model for suggestions/summaries/guardrail/clarify.
  - OpenAI `gpt-4.1` (structured outputs via `zodResponseFormat`), Anthropic `claude-sonnet-4-5` (forced tool-use JSON), Gemini `gemini-2.5-flash` (`responseMimeType` + schema), Groq `openai/gpt-oss-120b` (OpenAI-compatible).
- **Validation:** Zod schemas shared between LLM output enforcement and API request validation.
- **Auth:** `jose` (JWT) + bcryptjs.
- **Persistence:** MongoDB v7 (Atlas or local), cached client connection.
- **Observability:** Langfuse over OpenTelemetry.
- **Rate limiting:** in-memory sliding window (interface is Upstash-Redis-swappable).
- **Prompt caching:** stable per-locale cache keys for system-prompt reuse.

---

## 11. Non-Functional Requirements

- **NFR-1 — Performance/UX:** All model output is streamed; the decode dashboard renders incrementally. No blocking spinners for the main result.
- **NFR-2 — Cost control:** Cheap model for background calls; bounded context via summarization; prompt caching.
- **NFR-3 — Resilience:** Best-effort features (suggestions, summary, guardrail) never break the core flow; guardrail and clarify fail open.
- **NFR-4 — Security:** httpOnly secure cookies, per-user data scoping, bcrypt hashing, input length caps (≤500 chars), user keys never persisted server-side.
- **NFR-5 — Portability:** Provider-agnostic core; runs against free Groq tier for zero-cost setup.
- **NFR-6 — Accessibility/Responsiveness:** Mobile-first layout, ARIA labels on key controls, dark-mode support.

---

## 12. Success Metrics (proposed)

> The codebase emits Langfuse traces with token usage/cost; product-level metrics below are proposed instrumentation targets, not all currently tracked.

- **Activation:** % of new accounts that complete ≥1 decode.
- **Core value:** Decode completion rate (sends that yield a valid Zod-passing decode) and parse/validation failure rate (< target threshold).
- **Engagement:** Avg. follow-up turns per room; % of rooms with ≥1 follow-up; returning-user rate; rooms per user.
- **Clarify quality:** Skip-clarify rate vs. answered-clarify rate; decodes after clarify vs. without.
- **Guardrail precision:** Off-topic refusal rate; false-refusal rate on legitimate inputs (should be near zero given fail-open design).
- **Suggestion utility:** Suggestion-chip tap-through rate.
- **Cost/latency:** Median tokens and cost per decode and per follow-up; time-to-first-token.
- **Reliability:** Error-bubble rate; retry success rate; 429 rate.

---

## 13. Risks & Open Questions

**Risks**
- **R1 — Safety ceiling.** The product handles emotionally charged and potentially abusive situations but is not a crisis service. There is a prompt-level safety posture but no explicit crisis-resource handoff (e.g., hotline surfacing). *Consider an explicit safety escalation UX.*
- **R2 — Rate limiter is in-memory.** Not durable or multi-instance safe; needs Redis/Upstash before horizontal scaling.
- **R3 — Provider variability.** Structured-output reliability differs per provider; parse-failure fallback exists but quality varies.
- **R4 — Gendered copy.** Default English copy ("What She Really Meant") assumes a specific framing; may alienate some users. *Consider gender-neutral defaults.*
- **R5 — No automated tests present in the repo.** Core flows (decode validation, retry, context split) are untested in CI.

**Open Questions**
- Q1 — Should clarify question count adapt to input complexity rather than a fixed max of 3?
- Q2 — Should summaries be exposed to users (transparency) or stay internal?
- Q3 — Is there a monetization plan (the per-request user-key override hints at a BYO-key model)?
- Q4 — Should off-topic refusals be silent (not persisted) to avoid cluttering history?
- Q5 — Retention/deletion policy for sensitive relationship data (GDPR-style export/delete)?

---

## 14. Future Considerations (not in current scope)
- Crisis-resource surfacing and a clearer safety escalation path.
- Durable, distributed rate limiting and abuse protection.
- Automated test coverage for decode validation, context windowing, and retry semantics.
- Gender-neutral and configurable framing/copy.
- Additional locales beyond EN/ID.
- User data export/delete and explicit privacy controls.
- Optional voice/image input; richer history search.

---

## Appendix A — Glossary
- **Decode:** The first-message structured analysis (translation, need, urgency, action plan).
- **Clarify:** A pre-decode question (max 3) gathering missing context, with quick-reply chips.
- **Text/Chat mode:** Free-form Markdown follow-up conversation after a decode exists.
- **Rolling summary:** Per-room running summary of older turns to bound context cost.
- **Guardrail:** Cheap-model scope check that politely refuses off-topic requests.
- **Cheap model:** A lower-cost model used for suggestions, summaries, guardrail, and clarify.
