# Phase 4 – Engagement & Learning Enhancements

## Objectives

- Personalize practice flows via adaptive recommendations that react to a learner’s mistake history and goals.
- Increase motivation with streaks, badges, and challenge modes.
- Improve mobile accessibility through PWA capabilities and offline vocabulary review.

## Technical Tasks

1. **Adaptive Learning Engine**
   - Aggregate mistake/vocab data per user and compute mastery scores per topic/skill.
   - Build recommendation service that suggests next scenario/level; expose via `/recommendations/next-session`.
   - Update session start modal with “Recommended next” card, confidence indicator, and override button. Log chosen option for analytics.
2. **Gamification Layer**
   - Design streak model (day-based) stored in Redis + Postgres for durability.
   - Implement badge definitions (JSON config) with unlock criteria; create achievements API + UI widgets in sidebar/profile.
   - Add challenge mode sessions (timed or constraint-based) with scoreboard scaffolding.
3. **PWA & Offline Vocab**
   - Add manifest + icons, service worker caching of shell/assets/API fallbacks; pass Lighthouse PWA checks.
   - Cache due vocabulary + mistake review decks using IndexedDB; enable offline review mode with sync-on-reconnect logic.
   - Optimize responsive layout (gesture-friendly controls, collapsible side panel) for phones/tablets.
4. **Analytics & QA**
   - Track recommendation adoption, streak retention, badge unlock counts, offline review completion.
   - Instrument experiments (feature flags) for adaptive/gamification rollout.
   - Expand automated UI tests to cover recommendation card, streak counter, and offline review flow.

## Validation & Exit Criteria

- Recommendation service produces visible suggestions driven by real session data; users can accept or override and both paths log correctly.
- Streaks increment/decrement accurately across timezone boundaries; badges unlock when criteria met and display immediately.
- Challenge mode sessions enforce rules (e.g., timed responses) and record performance summaries.
- App installs as a PWA and operates offline for vocabulary review, syncing progress when back online.
- Analytics dashboard (or exported report) shows key engagement metrics for a test cohort.
