# Kaiwa
Kaiwa is a conversational language partner that simulates realistic dialogues, highlights mistakes, and helps learners review vocabulary. The app pairs a Bootstrap chat frontend with a Node.js backend and OpenAI-powered coaching intelligence.

## Why Kaiwa?
Traditional language apps drill vocabulary in isolation, but real fluency comes from confident conversation. Kaiwa drops you into lifelike chats—casual catch-ups, business meetings, or travel emergencies—and coaches you in real time. OpenAI models keep the partner responsive and personable while flagging grammar slips, pronunciation gaps, and missing expressions. A dedicated review panel turns every mistake into a learning opportunity so you retain more, faster.

- **Level up continuously:** Start with guided beginner scripts and progress toward intermediate and advanced scenarios as you demonstrate mastery.
- **Feedback that sticks:** Inline highlights plus a side-panel review queue ensure you revisit tricky grammar and vocabulary until it “clicks.”
- **Personalized coaching:** Configure persona tone and strictness to match how you like to be coached—encouraging, blunt, or somewhere in between.
- **Japanese-first focus:** Practice in Japanese with the option to see Kanji + furigana or hiragana-only, then expand to more languages as the platform grows.

Kaiwa is your always-available conversation partner that spots mistakes, tracks vocabulary, and keeps you motivated through clear progress signals.

## Repository Structure
- `/server` – Express + WebSocket backend, OpenAI integration, data access layer.
- `/client` – Vite + Bootstrap frontend for chat UI, mistake/vocab panels, and controls.
- `/shared` – Cross-cutting TypeScript types, utilities, and config.
- `/content` – Language-specific conversation templates (e.g., `content/templates/japanese/beginner`).
- `/spec` – Product requirements, phased implementation plans, and other docs; start with `spec/prd.md`.
- `/spec/phases` – Detailed technical direction for each delivery phase.
- `AGENTS.md` – Coding standards, repo map, and workflow expectations for contributors (including AI agents).

## Getting Started
1. Install dependencies: `pnpm install`
2. Copy `server/.env.example` to `server/.env` and fill in `DATABASE_URL`, `JWT_SECRET`, and `OPENAI_API_KEY`. (For automated testing/downstream agents, `server/.env.test` is already provided.)
3. Run database migrations (Prisma): `pnpm --filter @kaiwa/server prisma migrate dev`
4. Seed conversation templates by storing JSON files under `content/templates/<language>/<level>/`.

### Local Development
- Backend: `pnpm --filter @kaiwa/server dev`
- Frontend: `pnpm --filter @kaiwa/client dev`

Vite proxies API calls to the Node server on port 4000. WebSocket traffic is sent directly to `ws://localhost:4000/ws/chat`.

### Testing & Linting
- Run lint across all packages: `pnpm lint`
- Run tests: `pnpm test`
- Format files: `pnpm format`

## Development Workflow
1. Read the relevant spec/phase doc plus `AGENTS.md`.
2. Create a feature branch from `main` using `feature/<description>` naming.
3. Use pnpm workspaces; install deps via `pnpm install`.
4. Run `pnpm lint` and `pnpm test` before pushing; ensure UI flows are validated manually when applicable.
5. Open a PR referencing the associated phase/spec; require review and squash merge when approved.

## Documentation
- **Product vision & requirements:** `spec/prd.md`
- **Implementation roadmap:** `spec/implementation-plan.md`
- **Phase execution guides:** `spec/phases/*.md`
- **Contributor handbook:** `AGENTS.md`
