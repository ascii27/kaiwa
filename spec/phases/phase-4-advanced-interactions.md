# Phase 4 – Advanced Interaction Modes

## Objectives
- Add voice input/output to complement text chat, including pronunciation scoring.
- Introduce adaptive learning paths and gamification to boost engagement.
- Deliver PWA + offline vocab review for mobile-first users.

## Technical Tasks
1. **Voice Input/Output**
   - Integrate Web Speech API for browser voice capture; fall back to recorder component for unsupported browsers.
   - Send audio to backend for transcription via OpenAI Whisper or Speech-to-Text endpoint; merge text into session turn.
   - Generate AI partner audio replies using TTS (OpenAI text-to-speech or compatible provider); stream audio URLs to client.
   - Add pronunciation scoring by comparing user transcript vs. canonical sentence using alignment algorithms; display score + suggestions.
2. **Adaptive Learning Paths**
   - Build adaptive engine that consumes mistake history, proficiency assessments, and user goals to recommend next scenario/level.
   - Extend session start flow with “Recommended next step” card and allow override.
   - Log adaptation decisions for analytics + feedback loop.
3. **Gamification**
   - Implement streak tracking, badges for milestones (e.g., “10 perfect sessions”), and challenge modes.
   - Add achievements service + UI widgets in dashboard/sidebar.
4. **Mobile & PWA Enhancements**
   - Configure PWA manifest, service worker caching for shell + assets, offline fallback page.
   - Enable offline vocabulary review by caching due items locally and syncing mastery updates when back online.
   - Optimize responsive design for small screens (gesture-friendly controls, collapsible side panel).

## Validation & Exit Criteria
- Users can hold voice-enabled sessions end-to-end: record speech, receive transcription + AI audio responses.
- Pronunciation scoring appears after voice turns with actionable feedback.
- Adaptive recommendations adjust after user mastery changes; analytics capture chosen recommendations vs. overrides.
- Gamification UI reflects streaks/badges and updates in real time.
- PWA passes Lighthouse install criteria and offline vocab review functions when network is disabled.
