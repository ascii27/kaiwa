# AGENTS Handbook

This document guides autonomous contributors working in the Kaiwa repo. Follow it to stay consistent with our architecture, coding style, and workflow expectations.

## Repository Map
- `/server`: Node.js + Express backend (TypeScript). Holds APIs, WebSocket gateway, OpenAI integration, data access.
- `/client`: Vite-based frontend using Bootstrap 5 plus lightweight JS helpers (Alpine.js/vanilla). Contains UI components, state stores, and service clients.
- `/shared`: Cross-cutting TypeScript types, utility functions, and shared config (ESLint, TS configs, constants).
- `/content`: Conversation templates organized by language/level (e.g., `content/templates/japanese/beginner`).
- `/spec`: Product docs, PRDs, phase plans. Read before implementing new work.

## Coding Style & Standards
1. **Languages & Tooling**
   - TypeScript everywhere (server, client, shared). Enable `strict` mode and incremental builds.
   - Use pnpm workspaces; run `pnpm lint` + `pnpm test` before pushing.
2. **Formatting & Linting**
   - Prettier for formatting (default settings, 2-space indent). ESLint extends `eslint:recommended` + TypeScript plugin.
   - No unused variables or implicit `any`. Favor descriptive names and typed function signatures.
3. **Architecture**
   - Separation of concerns: controllers → services → repositories. Keep business logic out of routes.
   - Centralized OpenAI client wrapper with typed request/response contracts. No direct SDK calls elsewhere.
   - Client uses modular components; prefer declarative templates with minimal DOM manipulation.
4. **Error Handling & Observability**
   - Server responses use structured error objects (`code`, `message`, `details`).
   - Log with pino; include correlation IDs per request/session.
   - Surface OpenAI outages explicitly to clients; do not silently fallback.
5. **Testing**
   - Unit tests for services/utilities, integration tests for APIs/WebSocket flows, and snapshot tests for AI prompt outputs.
   - Stub OpenAI calls using deterministic fixtures.

## Workflow Expectations
- Create feature branches from `main` named `feature/<description>` or `bugfix/<description>`.
- Keep commits scoped and include descriptive messages (imperative mood).
- Open pull requests with links to relevant phase docs/spec sections and checklist (tests run, lint pass).
- Require at least one review before merge; use squash merge unless chore.
- Keep `README.md` current whenever repo structure, setup steps, or workflows change.

## Agent Checklist Before PR
1. Specs/phase doc reviewed and requirements confirmed.
2. `pnpm install` or workspace-specific deps installed.
3. Code written with typing, lint, and test suites passing locally (`pnpm lint && pnpm test`).
4. Added/updated docs where behavior changes (README, spec, or inline comments when necessary).
5. Validated UI flows manually for any frontend change; attach screenshots/GIFs when helpful.

Adhering to this handbook keeps autonomous development predictable and high quality.
