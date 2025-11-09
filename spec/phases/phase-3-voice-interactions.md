# Phase 3 – Voice Interaction Foundation

## Objectives

- Enable hands-free practice by adding reliable voice input (speech capture + transcription) alongside the existing text chat.
- Deliver natural AI partner audio replies using text-to-speech with persona-aware tone.
- Provide pronunciation feedback after each spoken turn so learners know what to improve.

## Technical Tasks

1. **Client Capture & Controls**
   - Build microphone controls in the chat composer (record, pause, cancel) with visual levels + timers.
   - Use Web Speech API for browsers that support it; fall back to a WASM/MediaRecorder pipeline that streams audio chunks (PCM/Opus) to the backend.
   - Handle permissions gracefully (prompts, fallback, retry instructions) and persist user preference (voice vs. text).
2. **Audio Ingestion Service**
   - Create `/voice/upload` WebSocket or streaming endpoint that accepts audio chunks, stores temporary blobs (S3/local), and assembles them when recording stops.
   - Invoke OpenAI Whisper (or Speech-to-Text) with language hints + diarization disabled; return transcript, confidence, and timing data.
   - Attach transcript as a normal `Turn` in the session so downstream logic (ai response, mistakes) reuses existing pipeline.
3. **AI Audio Responses**
   - Extend conversation service to request OpenAI TTS (or alternate) for each AI turn. Cache generated audio URLs per turn and stream them to the client.
   - Add playback controls to chat bubbles (play/pause, scrub) and prefetch next audio clip to minimize latency.
4. **Pronunciation Scoring**
   - Build comparison service that aligns transcript vs. ideal sentence (LLM output or template) using phoneme distance (e.g., running external API or open-source aligner).
   - Return per-word accuracy + overall score, convert to friendly labels (Excellent/Needs practice) and surface inside side panel with tips.
   - Store scores on `Mistake` or dedicated `PronunciationFeedback` table for future analytics.
5. **Resilience & Telemetry**
   - Add circuit breakers for Whisper/TTS latency; fall back to text-only reply and surface toast if audio fails.
   - Emit metrics: voice session count, avg transcription latency, audio error rate, pronunciation score distribution.
   - Update QA plan to include accessibility (keyboard shortcuts for record) and device coverage (desktop/mobile browsers).

## Validation & Exit Criteria

- Learner can start recording, speak, and see their words transcribed into the chat within 2 seconds after stopping.
- AI responses include both text and playable audio; playback works on Chrome + Safari desktop/mobile.
- Pronunciation feedback appears after each spoken turn with a score and highlighted trouble words.
- Voice errors (mic blocked, transcription fail, TTS timeout) show actionable UI guidance without breaking the session.
- Telemetry dashboard (temporary log or metrics endpoint) reports transcription latency and audio success rate for smoke tests.
