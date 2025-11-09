# Phase 2 – Feedback Intelligence & Personalization

## Objectives

- Deepen AI feedback quality (persona fidelity, level assessment, mistake grouping, spaced repetition).
- Expand content to intermediate/advanced levels with scenario selection UI.
- Introduce profile settings and weekly summaries to personalize learning paths.

## Technical Tasks

1. **Advanced OpenAI Prompts**
   - Create prompt versions for intermediate/advanced personas with cultural context, tone rules, and progression cues.
   - Add level assessment prompt that periodically (every N turns) evaluates user proficiency and suggests next level.
   - Implement strictness slider weighting in prompts (controls detail/volume of corrections).
2. **Mistake Intelligence**
   - Extend detection prompt to return structured JSON grouping mistakes by `type` + `subcategory`, severity score, recommended drills.
   - Introduce clustering by recurring mistakes (hash rule) and show frequency badges in UI.
   - Schedule nightly job summarizing top mistakes per user for spaced repetition queue.
3. **Spaced Repetition & Mastery**
   - Add `dueAt` field to `VocabularyItem` and `MistakeReview` tables. Implement Leitner-style scheduling service.
   - Build review UI in side panel allowing users to practice due items (flashcard mini-flow) and update mastery state.
4. **Scenario Selection & Content Expansion**
   - Add intermediate/advanced template directories (e.g., `content/templates/japanese/intermediate`, `.../advanced`). Cover business meetings, negotiations, casual storytelling.
   - Enhance session start modal to choose level + scenario; persist choice for analytics.
5. **Profile Settings & Goals**
   - Create `/settings` page where users set target proficiency, preferred personas, strictness defaults, study cadence.
   - Store settings in DB; auto-apply defaults when starting new sessions.

## Validation & Exit Criteria

- Persona differences are testable: switching tone presets yields distinct phrasing tracked via snapshot tests.
- Mistake panel shows grouped entries with severity + recurrence counts; spaced repetition review flow schedules at least 3 due items after test conversation.
- Users can select intermediate/advanced scenarios and receive tailored prompts/content.
- Profile settings persist and auto-apply to new sessions; strictness slider visibly changes correction density.
- Weekly summary job runs in staging, sending mock email with metrics derived from sample data.
- OpenAI health dashboard reflects simulated outage and triggers alert log entry.
