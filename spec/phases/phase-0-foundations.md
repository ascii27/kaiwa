# Phase 0 – Foundations

## Objectives
- Stand up the mono-repo structure (`/server`, `/client`, `/shared`) with Node.js + TypeScript toolchains.
- Provide a reusable OpenAI integration layer and environment management to unblock downstream AI work.
- Define baseline domain models, database schema migrations, and seed data scaffolding.

## Technical Tasks
1. **Repo & Tooling Setup**
   - Initialize `package.json` at root with workspaces for `server`, `client`, `shared`.
   - Configure TypeScript, ESLint, Prettier, and Jest/Test Runner per package; share common configs via `/shared/config`.
   - Add Git hooks (Husky) enforcing lint/test on commit.
2. **Server Foundations**
   - Inside `/server`, scaffold Express app with health check route, logging middleware (pino), error handler, and WebSocket placeholder (ws or socket.io).
   - Configure environment loading (dotenv-safe) with schema validation using zod.
   - Create base modules for auth (JWT verifier stub), session store interface, and OpenAI client wrapper registration.
3. **Client Foundations**
   - Create `/client` Vite project using Bootstrap 5 + lightweight JS framework (e.g., Alpine.js). Include global styles + theme variables.
   - Implement layout shell (chat area + side panel placeholders) with responsive grid and color tokens.
   - Set up state management scaffold (simple store module) and service layer for API/WebSocket calls (mock endpoints for now).
4. **Shared Models & DB**
   - Define TypeScript interfaces for `User`, `Session`, `Turn`, `Mistake`, `VocabularyItem`, `Template`, `UserSettings` in `/shared/types`.
   - Provision PostgreSQL schema via migration tool (Prisma or Knex). Include tables for each domain object plus enums for language, strictness, persona.
   - Configure Redis connection helper for session caching; add docker-compose for Postgres + Redis for local dev.
5. **OpenAI Integration Layer**
   - Create `/server/src/ai/openaiClient.ts` wrapping official SDK. Support configurable model (`gpt-4o` default), temperature, timeout, retries, and telemetry hooks.
   - Add prompt registry structure with versioned YAML/JSON definitions for personas and mistake detection (placeholders referencing upcoming Phase 1/2 promps).
   - Implement error mapping that surfaces “OpenAI unavailable” state to callers; no fallback provider.

## Validation & Exit Criteria
- `pnpm test` + `pnpm lint` succeed across workspaces.
- Hitting `/health` returns 200 and environment validation passes with sample `.env.example`.
- Client dev server renders chat shell + side panel placeholders without runtime errors.
- Database migrations apply cleanly to local Postgres; tables visible via inspection command.
- OpenAI wrapper can execute a sample `pingPrompt` (mocked in tests) and returns structured response/error objects.
