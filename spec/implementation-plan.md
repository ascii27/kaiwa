# Kaiwa Implementation Plan

## Phase 0 – Foundations

- Finalize tech stack: Node.js backend (Express + WebSocket), PostgreSQL, Redis, Bootstrap + lightweight JS framework (Alpine.js or vanilla + HTMX style patterns).
- Define data models (users, sessions, turns, mistakes, vocabulary, templates, settings).
- Set up repo structure (`/server`, `/web`, `/shared`), linting, TypeScript configuration, testing harness.
- Establish design system tokens (colors, typography) aligned with Bootstrap customization.
- Implement OpenAI client wrapper with prompt/version management, secret storage, and telemetry hooks (leave abstraction for future providers).

## Phase 1 – Core Conversation MVP

- Build REST + WebSocket APIs for auth, session creation, message exchange.
- Implement conversation template seeding for beginner scenarios across casual, travel, business topics.
- Create frontend chat UI (Bootstrap layout, message bubbles, composer controls for persona + strictness).
- Connect chat turns to OpenAI chat completions for partner responses using deterministic system prompts per persona/strictness.
- Persist session state per user; wire minimal OpenAI-based mistake detection prompts feeding the side panel.
- Add vocabulary capture workflow (manual tagging + automatic from templates).
- Ship basic telemetry (API logs, conversation length metrics).

## Phase 2 – Feedback Intelligence & Personalization

- Extend OpenAI integration for mistake detection, persona-driven responses, and level assessment (fine-tuned prompts + evaluation dataset).
- Expand conversation templates to intermediate/advanced; enable scenario selection UI.
- Enhance side panel with grouping, mastery toggles, spaced-repetition scheduling.
- Implement strictness slider logic impacting correction frequency/detail.
- Add profile settings page for long-term preferences and learning goals.
- Prototype fallback strategy (secondary provider or heuristic rules) for when OpenAI is unavailable; add health monitoring.

## Phase 3 – Voice Interaction Foundation

- Add microphone capture, streaming upload, and Whisper-based transcription integrated with existing turns/mistake pipeline.
- Generate persona-aware AI audio replies via TTS with playback controls and caching.
- Provide pronunciation scoring + feedback per spoken turn; log voice metrics and resilience paths.

## Phase 4 – Engagement & Learning Enhancements

- Adaptive learning recommendations informed by mistake/vocab history.
- Gamification features (streaks, badges, challenge modes) covering API + UI.
- PWA upgrades with offline vocabulary review and responsive mobile polish.

## Phase 5 – Continuous Improvement

- User feedback loops (in-app surveys, A/B testing infrastructure).
- Content authoring tools for educators/partners.
- Marketplace for community conversation packs and downloadable vocab decks.
