# Kaiwa Conversational Language Partner PRD

## Vision
Kaiwa helps learners build conversational fluency by simulating realistic, level-appropriate dialogues and surfacing targeted corrections. It combines a responsive chat interface, configurable coaching styles, OpenAI-powered coaching intelligence, and ongoing vocabulary tracking to keep practice sessions focused and motivating.

## Goals
- Provide a smooth chat-based practice experience that mimics real conversations.
- Support progressive learning paths (beginner → intermediate → advanced) with topical variety (casual, business, scenario-specific).
- Deliver real-time feedback by flagging grammar, pronunciation, and vocabulary mistakes.
- Use OpenAI models for both conversation generation and automated error detection.
- Capture mistakes and key vocabulary in a review panel for spaced repetition.
- Allow learners to configure personality tone and strictness of the language partner.

## Target Users
- Self-directed learners seeking daily speaking practice.
- Language students supplementing classroom instruction.
- Professionals preparing for domain-specific conversations (e.g., sales calls, travel, negotiations).

## Key Experience Requirements
1. **Chat workspace**
   - Responsive, mobile-friendly layout using Bootstrap.
   - Conversation thread with alternating user/partner bubbles, timestamps, and level/topic indicators.
   - Input composer with language selection, quick-reply suggestions, and strictness/personality toggles.
2. **Insight side panel**
   - Persistent list of detected mistakes grouped by type (grammar, pronunciation, vocabulary).
   - Vocabulary bank with translation, example sentence, and completion state.
   - Ability to mark items as “mastered” or add notes.
3. **Conversation management**
   - Library of scripted and dynamic conversation templates per level/topic.
   - Session state persisted per user (ongoing dialogue, pending corrections, saved vocab).
   - Progression cues that unlock higher difficulty once mastery thresholds are met.
4. **Configuration**
   - Personality presets (encouraging, neutral, blunt, humorous) affecting tone of responses.
   - Strictness slider controlling frequency and directness of corrections.
   - Language and dialect selection with locale-aware examples.
5. **Feedback loop**
   - Mistake detection pipeline driven by OpenAI models plus guardrail rules, providing inline highlights and side-panel entries.
   - Immediate suggestions for corrections + follow-up practice prompts.
   - Weekly summary email (later phase) with aggregate mistakes, vocab mastery, and suggested goals.

## Functional Requirements
- Authenticated user sessions with profile settings for targets and preferences.
- CRUD APIs for conversation templates, vocabulary items, mistakes, and sessions.
- Real-time messaging channel between frontend and backend (websocket preferred; fallback to long polling).
- OpenAI LLM integration for dialogue generation, intent detection, error classification, and level calibration (with abstractions for future providers).
- Admin console (future) to add/edit conversation packs and monitor usage.

## Open Questions & Decisions
- Conversation prompt templates will be generated ahead of time and stored under language-specific directories to keep content organized and extensible.
- Japanese is the first supported language; learners can toggle between kanji + furigana or hiragana-only rendering.
- Alpha release focuses on text chat; voice input/output work begins after the interaction model is validated.
- No fallback LLM provider—surface a clear error to users if OpenAI is unavailable.
