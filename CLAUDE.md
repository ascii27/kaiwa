# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Kaiwa

Kaiwa is a Japanese-first conversational language learning app. Users practice through realistic chat dialogues powered by OpenAI. The backend analyzes mistakes in real time, tracks vocabulary with spaced repetition, and serves configurable AI personas (tone, strictness, character style).

## Commands

All commands run from the repo root using pnpm workspaces.

```bash
# Install dependencies
pnpm install

# Run dev servers
pnpm --filter @kaiwa/server dev      # Backend on port 4000 (tsx watch)
pnpm --filter client-ember start     # Frontend on port 4200 (Ember CLI)

# Run all tests / lint / format
pnpm test
pnpm lint
pnpm format

# Run server tests only (faster)
pnpm --filter @kaiwa/server test

# Run a single server test file
pnpm --filter @kaiwa/server exec vitest run src/path/to/file.test.ts

# Prisma
pnpm --filter @kaiwa/server prisma:migrate    # Run migrations (dev)
pnpm --filter @kaiwa/server prisma:generate   # Regenerate Prisma client
pnpm --filter @kaiwa/server prisma:seed       # Seed DB
```

## Server Environment Variables

Copy `server/.env.example` to `server/.env`. The required variables (validated with Zod in `server/src/env.ts`):

| Variable            | Notes                                         |
| ------------------- | --------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL connection string                  |
| `JWT_SECRET`        | Min 16 chars                                  |
| `OPENAI_API_KEY`    | Min 10 chars                                  |
| `OPENAI_MODEL`      | Defaults to `gpt-4o-mini`                     |
| `OPENAI_TIMEOUT_MS` | Defaults to `15000`                           |
| `PORT`              | Defaults to `4000`                            |
| `ADMIN_EMAILS`      | Comma-separated; gates `adminOnly` middleware |

For tests, `server/.env.test` is pre-provided and loaded automatically when `NODE_ENV=test`.

## Architecture

### Monorepo Layout

```
/server    – Express + WebSocket backend (TypeScript, ESM)
/client    – Ember.js Octane frontend (JavaScript, Ember CLI)
/shared    – TypeScript types shared across packages
/content   – Conversation template JSON files (language/level hierarchy)
/spec      – PRDs, phase plans, implementation roadmap
```

### Backend (`/server/src`)

Entry point: `index.ts` creates the HTTP server and attaches the WebSocket gateway.

**Request flow (HTTP):**

```
Express app (app.ts) → route handlers (/routes) → services → Prisma (db/prisma.ts)
```

Routes: `/auth`, `/sessions`, `/templates`, `/settings`. Templates and sessions are the primary data APIs; settings and auth are user management.

**WebSocket flow:**

```
ws://host:4000/ws/chat?token=<jwt>&sessionId=<id>
  → chatGateway.ts authenticates JWT + verifies session ownership
  → user_message  → generatePartnerResponse() + analyzeMistakes() → emit chat_message + mistakes_update
  → session_prompt → same as user_message but skips mistake analysis
  → add_vocab     → saveVocabulary() → emit vocab_update
```

**OpenAI integration:**
All OpenAI calls funnel through `ai/openaiClient.ts::sendChatCompletion()`. Never call the OpenAI SDK directly elsewhere. Throws `OpenAIUnavailableError` on any failure; the gateway catches this and sends an `openai_error` WS message to the client.

Two AI services exist:

- `conversationService.ts` – builds the system prompt (persona + strictness + characterStyle) and generates the partner's reply as `{"reply":"...","translation":"..."}` JSON.
- `mistakeService.ts` – analyzes user input and returns up to 3 mistakes with type, severity, subcategory, and recommended drills.

**Enum conventions:**
Prisma/DB enums are UPPER_CASE (`ENCOURAGING`, `GENTLE`). The shared TypeScript types and API payloads use lowercase (`encouraging`, `gentle`). Routes convert between them (e.g., `.toUpperCase()` on upsert, `.toLowerCase()` on read).

**Admin middleware:**
`middleware/admin.ts` gates certain routes (template create/update) by checking `ADMIN_EMAILS`. Applied as `requireAuth, adminOnly` middleware pair.

**Logging:** pino + pino-http. Use the `logger` import from `src/logger.ts`; correlation IDs are attached per request.

### Frontend (`/client/app`)

Ember.js Octane (v5), classic JavaScript (no TypeScript in client yet). Ember CLI dev server runs on port 4200.

**Routes:** `home`, `auth`, `conversation`, `review`, `settings`, `admin`

**Services (injected via `@service`):**

- `api` – wraps `fetch()` with base URL from `config.APP.API_URL`; all REST calls go here.
- `chat-socket` – manages the WebSocket connection (`config.APP.WS_URL`), event subscription (`on`/`off`/`emit`), and outbound message helpers (`sendUserMessage`, `sendSessionPrompt`).
- `session` – stores the JWT token and user identity.
- `settings` – caches user preferences (targetLang, level, persona, strictness).
- `logger` – thin wrapper for structured client-side logging.

**Config:** `client/config/environment.js` exposes `APP.API_URL` and `APP.WS_URL`. In dev these default to `http://localhost:4000` and `ws://localhost:4000`. Override via `VITE_API_URL` / `VITE_WS_URL` env vars.

**Auth guard:** Routes that require login call `this.replaceWith('auth')` in `beforeModel()` if `session.token` is absent.

### Shared (`/shared/src/index.ts`)

TypeScript interfaces and union types for `User`, `Session`, `Turn`, `Mistake`, `VocabularyItem`, `TemplateMetadata`, `PersonaTone`, `StrictnessLevel`, `CharacterStyle`. Import these as `@kaiwa/shared` in server code.

### Data Model (Prisma)

Key entities: `User` → `Session` → `Turn` → `Mistake`. `VocabularyItem` belongs to `Session`. `Template` is independent (seeded via `server/prisma/seed.ts`). `UserSettings` is 1-to-1 with `User`.

`VocabularyItem` has `mastery` (NEW/LEARNING/MASTERED) and `dueAt` for spaced repetition (Phase 2).

## Key Conventions

- **No direct OpenAI SDK calls** outside `ai/openaiClient.ts`.
- **Zod** for all request body validation in routes.
- **Structured errors** from the API: `{ error: string, details?: ... }`.
- **Feature branches** from `main`: `feature/<description>` or `bugfix/<description>`.
- **Spec docs** in `/spec/phases/` define what belongs to each delivery phase; read the relevant phase doc before implementing new work.
