# Phase 1 – Core Conversation MVP

## Objectives
- Deliver an end-to-end text chat experience (user ↔ AI partner) for beginner-level scenarios.
- Persist conversation sessions, mistakes, and vocabulary items per user.
- Surface minimal AI-powered mistake detection in the side panel.

## Technical Tasks
1. **Auth & Session APIs**
   - Implement email/password signup + login (bcrypt, JWT). Provide `/auth/signup`, `/auth/login`, `/auth/me` endpoints.
   - Create session lifecycle endpoints: `POST /sessions` (start conversation, accepts language, persona, strictness), `GET /sessions/:id`, `GET /sessions` (history), `POST /sessions/:id/end`.
2. **Messaging & WebSockets**
   - Establish WebSocket channel `/ws/chat` authenticating via JWT. Maintain conversation context keyed by session ID in Redis.
   - On each user message: persist turn, enqueue OpenAI completion request with persona + strictness prompt, stream AI response back over socket.
   - Implement retry/backoff for OpenAI failures; on persistent failure surface “OpenAI unavailable” event to client.
3. **Conversation Templates**
   - Create `content/templates/japanese/beginner` directory with YAML/JSON prompt scaffolds (casual, travel, business). Include topic metadata, starter turns, vocab hints.
   - Build seeding script to load templates into DB; expose `/templates` endpoint filtered by language/level.
4. **Mistake Detection (Baseline)**
   - After each AI response, call OpenAI with light-weight prompt instructing it to analyze the user’s latest turn for grammar/vocab mistakes (limit to 3 findings).
   - Map response to `Mistake` records (type, severity, correction text, explanation) and push updates via socket side-channel.
5. **Vocabulary Capture**
   - Allow AI responses to tag vocabulary (structured JSON from prompt) or let user mark text to add manual vocab entry.
   - Persist `VocabularyItem` with fields: phrase, translation, context sentence, mastery state.
6. **Frontend Experience**
   - Integrate REST + WebSocket services. Render chat bubbles, persona/strictness toggles, template selector, typing indicator.
   - Side panel sections: Mistakes (list with type chips, correction text) and Vocabulary (list with translation + mastery toggle).
   - Display error toast/banner when OpenAI fails, instructing user to retry later.
7. **Telemetry & Logging**
   - Capture metrics: session length, messages per session, OpenAI latency, error counts. Ship to console/log file initially.
   - Add feature flags/config allowing template-driven vs. free-form conversation for experimentation.

## Validation & Exit Criteria
- User can sign up, start a Japanese beginner session, and exchange at least 10 back-and-forth turns without errors.
- Mistakes panel populates with AI-detected entries for deliberate incorrect inputs.
- Vocabulary panel supports both auto-suggested items and manual additions.
- Templates are fetched from language-specific directory and influence opening prompts.
- Simulated OpenAI outage produces visible UI error and clean server logs (no crashes).
