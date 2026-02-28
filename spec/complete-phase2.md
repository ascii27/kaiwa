# Phase 2 Completion Plan

This document catalogues what is **already done** and what **remains to be built** to satisfy the Phase 2 exit criteria defined in `spec/phases/phase-2-feedback-intelligence.md` and `spec/phases/phase-2-ui-updates.md`.

---

## Status Summary

| Area                                                         | Status     |
| ------------------------------------------------------------ | ---------- |
| DB-backed templates (CRUD + seed)                            | ✅ Done    |
| Conversation uses Settings defaults                          | ✅ Done    |
| Sidebar collapse + localStorage                              | ✅ Done    |
| Admin prompts two-pane UI                                    | ✅ Done    |
| Mistake detection (subcategory, severityScore, drills, hash) | ✅ Done    |
| Level assessment prompt                                      | ❌ Missing |
| Level-differentiated AI prompts                              | ❌ Missing |
| Mistake recurrence grouping + frequency badges               | ❌ Missing |
| Leitner spaced-repetition scheduling service                 | ❌ Missing |
| Review page (flashcard drill UI)                             | ❌ Missing |
| Vocabulary mastery toggle                                    | ❌ Missing |
| defaultLevel in UserSettings (persisted)                     | ❌ Missing |
| Admin sub-navigation (Main Config + Prompts)                 | ❌ Missing |
| Sidebar icons + tooltips in collapsed state                  | ❌ Missing |
| `aria-current="page"` on active nav items                    | ❌ Missing |
| DELETE /templates/:id (admin)                                | ❌ Missing |
| Persona/prompt snapshot tests                                | ❌ Missing |
| Nightly summary job                                          | ❌ Missing |

---

## Remaining Work — Step by Step

---

### Step 1 — Persist `defaultLevel` in UserSettings

**Why:** `settings.level` in the client is a local tracked field that defaults to `'beginner'` and is never saved. All level-based template filtering and session creation relies on this value, so intermediate/advanced scenarios are unreachable unless level is persisted.

**Server changes:**

1. Add `defaultLevel` column to `UserSettings` in `server/prisma/schema.prisma`:
   ```prisma
   model UserSettings {
     ...
     defaultLevel String @default("beginner")
   }
   ```
2. Generate and run a migration: `pnpm --filter @kaiwa/server prisma:migrate`.
3. In `server/src/routes/settings.ts`:
   - Add `defaultLevel: z.enum(["beginner", "intermediate", "advanced"]).default("beginner")` to `settingsSchema`.
   - Include `defaultLevel` in the `toResponse` mapper, the `upsert.update` block, and the `upsert.create` block.

**Client changes:**

4. In `client/app/templates/settings.hbs`, add a Level `<select>` (Beginner / Intermediate / Advanced) bound to `this.settings.defaultLevel` using the same `handleChange` pattern as existing fields.
5. In `client/app/services/settings.js`:
   - Add `@tracked defaultLevel = 'beginner';`.
   - In `load()`, map `settings.defaultLevel` → `this.defaultLevel`.
   - Rename the existing local `level` tracked property to `defaultLevel` so the conversation controller reference (`this.settings.level`) is updated too (update that callsite to `this.settings.defaultLevel`).

---

### Step 2 — Level-Differentiated AI System Prompts

**Why:** The current system prompt in `conversationService.ts` is identical for all levels. Phase 2 requires tailored cultural context, tone rules, and progression cues per level.

**Server changes (`server/src/services/conversationService.ts`):**

1. Add a `levelPrompts` map:
   ```ts
   const levelPrompts: Record<string, string> = {
     beginner:
       "Use simple vocabulary and short sentences. Favour hiragana over kanji when possible. Be encouraging and patient.",
     intermediate:
       "Use natural conversational Japanese with a mix of kanji and kana. Include cultural nuance and idiomatic expressions where appropriate.",
     advanced:
       "Use sophisticated vocabulary, keigo (honorific speech), and complex grammar structures. Challenge the learner with nuanced topics and cultural context.",
   };
   ```
2. Add `level: string` to the `buildSystemPrompt` parameter object and inject the level prompt line into the returned system prompt string.
3. Thread `session.level` (already stored on the `Session` row) through `chatGateway.ts → handleUserMessage → generatePartnerResponse`. The `level` field is already saved on `Session`; it just needs to be read and passed.
   - In `chatGateway.ts`: add `level: session.level` to the `handleUserMessage` call signature and the inner `generatePartnerResponse` call.
   - In `conversationService.ts`: add `level` to the `generatePartnerResponse` input interface and pass it to `buildSystemPrompt`.

---

### Step 3 — Level Assessment Prompt (Periodic Proficiency Check)

**Why:** Phase 2 requires an OpenAI-driven assessment every N turns that evaluates user proficiency and suggests a level change.

**Server changes:**

1. Create `server/src/services/levelAssessmentService.ts`:
   - Export `assessProficiency(turns: ConversationTurn[], currentLevel: string, language: string): Promise<{ suggestedLevel: string; rationale: string } | null>`.
   - Prompt asks the model to evaluate the last N turns and return JSON `{"suggestedLevel":"beginner"|"intermediate"|"advanced","rationale":"..."}` or `null` if no change needed.
   - Return `null` if the suggestion matches `currentLevel` (no change).

2. In `chatGateway.ts`, after saving the AI turn:
   - Count turns for the session. If `turns.length % 10 === 0` (configurable constant), call `assessProficiency`.
   - If the result suggests a different level, emit a new WS message type `level_suggestion` with `{ suggestedLevel, rationale }`.

3. **Client (`client/app/controllers/conversation.js`):**
   - Add a `@tracked levelSuggestion = null` property.
   - In `connectSocket`, register a handler for `'level_suggestion'`: set `this.levelSuggestion = payload`.
   - In `client/app/templates/conversation.hbs`, render a dismissible `alert-info` banner when `levelSuggestion` is set: e.g., "Based on your conversation, you might be ready for **Intermediate**. [Update in Settings]".

---

### Step 4 — Mistake Recurrence Grouping + Frequency Badges

**Why:** The spec requires mistakes to be clustered by their `hash` value and show recurrence counts. Currently, every mistake is appended individually to the list with no deduplication or frequency display.

**Client changes (`client/app/controllers/conversation.js`):**

1. Replace the flat `mistakes` array with a grouped structure. When a `mistakes_update` event arrives:
   - Merge new mistakes into an existing map keyed by `hash`.
   - If a hash already exists, increment its `recurrence` count rather than adding a duplicate entry.
   - Keep the map as the source of truth; derive a `sortedMistakes` getter that orders by `recurrence` descending, then `createdAt` descending.

2. Update `client/app/templates/conversation.hbs` in the mistakes panel:
   - Use `sortedMistakes` instead of `mistakes`.
   - Show a `<span class="badge bg-danger">×{{mk.recurrence}}</span>` badge (hidden when `recurrence === 1`) alongside the type/subcategory badges.
   - Show `severityScore` as a small progress bar or numeric label when present.
   - Render `recommendedDrills` as a collapsed section (e.g., `<details><summary>Drills</summary>...</details>`) when the array is non-empty.

---

### Step 5 — Vocabulary Mastery Toggle

**Why:** The spec and PRD require users to mark vocabulary items as mastered; this drives spaced repetition. The field exists in DB (`mastery`, `dueAt`) but there is no UI or API surface to update it.

**Server changes:**

1. Add `PATCH /sessions/:id/vocabulary/:vocabId` to `server/src/routes/sessions.ts`:
   - Accepts `{ mastery: "new" | "learning" | "mastered" }`.
   - Validates ownership (session belongs to `req.userId`).
   - Updates `VocabularyItem.mastery` and sets `dueAt` using Leitner intervals (see Step 6).

2. Add `updateVocabularyMastery(vocabId: string, mastery: string, dueAt: Date)` to `server/src/services/sessionService.ts`.

**Client changes:**

3. In `client/app/services/api.js`, add `updateVocabMastery(token, sessionId, vocabId, mastery)` using the new PATCH endpoint.

4. In `client/app/templates/conversation.hbs` (vocab section):
   - Add three small action buttons/links per vocab item: **New**, **Learning**, **Mastered** — highlighting the current `mastery` state.
   - Clicking a button calls a controller action.

5. In `client/app/controllers/conversation.js`, add `@action async setVocabMastery(vocabId, mastery)`:
   - Calls `api.updateVocabMastery(...)`.
   - Updates the local `vocabulary` array reactively so the UI reflects the new state without a reload.

---

### Step 6 — Leitner Spaced-Repetition Scheduling Service

**Why:** `dueAt` on `VocabularyItem` is never written after initial creation (it defaults to `now()`). The review queue needs scheduling logic to space repetitions intelligently.

**Server changes:**

1. Create `server/src/services/spacedRepetitionService.ts`:
   - Export `computeNextDueAt(mastery: string, previousDueAt: Date): Date`.
   - Leitner intervals: `new` → +1 day, `learning` → +3 days, `mastered` → +7 days.

2. Call `computeNextDueAt` in the `updateVocabularyMastery` function added in Step 5 to populate `dueAt` on each mastery update.

3. Add a query to `sessionService.ts`: `getDueVocabularyForUser(userId: string, limit = 20): Promise<VocabularyItem[]>` — joins `Session → VocabularyItem` where `userId` matches and `dueAt <= now()`, ordered by `dueAt` ascending.

4. Add `GET /review/due` (new route file `server/src/routes/review.ts`, registered in `app.ts`):
   - Protected by `requireAuth`.
   - Returns `{ items: VocabularyItem[] }` from `getDueVocabularyForUser`.

---

### Step 7 — Review Page (Flashcard Drill UI)

**Why:** The Review route currently renders only a placeholder. Phase 2 exit criteria requires a functional spaced-repetition review flow that lets users practice due vocabulary items.

**Client changes:**

1. Create `client/app/routes/review.js`:
   - In `beforeModel`, redirect to `auth` if not logged in.
   - In `model`, call `api.getDueVocab(token)` → `GET /review/due`.
   - Return `{ items }`.

2. Add `getDueVocab(token)` to `client/app/services/api.js`.

3. Create `client/app/controllers/review.js`:
   - `@tracked items = []` — populated from `model.items`.
   - `@tracked currentIndex = 0` — pointer into the deck.
   - `@tracked showAnswer = false`.
   - Getter `currentItem` returns `items[currentIndex]`.
   - Getter `isDone` — true when `currentIndex >= items.length`.
   - `@action reveal()` — sets `showAnswer = true`.
   - `@action grade(mastery)` — calls `api.updateVocabMastery(...)` for the current item, advances `currentIndex`, resets `showAnswer`.
   - `@action restart()` — resets index/showAnswer, re-fetches due items.

4. Replace `client/app/templates/review.hbs` with a flashcard UI:
   - Empty state when `isDone`: "All caught up! Come back later."
   - Progress indicator: "Card X of Y".
   - Front face: phrase in the target language.
   - Back face (shown after reveal): translation + context sentence.
   - Three grade buttons after reveal: **Again (New)**, **Good (Learning)**, **Easy (Mastered)**.

---

### Step 8 — Admin Sub-Navigation (Main Configuration + Prompts Tabs)

**Why:** The spec requires the Admin view to expose sub-navigation between "Main Configuration" and "Prompts", with hash-based deep-linking. Currently the Admin view renders only the Prompts panel with no tabs or section switching.

**Client changes:**

1. In `client/app/controllers/admin.js`:
   - Add `@tracked activeTab = 'prompts'`.
   - In `constructor`, read `window.location.hash` and set `activeTab` to `'config'` or `'prompts'` accordingly.
   - Add `@action setTab(tab)` — sets `activeTab`, updates `window.location.hash`.

2. In `client/app/templates/admin.hbs`:
   - Wrap the existing prompts content in a conditional: `{{#if (eq this.activeTab 'prompts')}}...{{/if}}`.
   - Add tab/pill markup above it:
     ```hbs
     <ul class="nav nav-pills mb-3">
       <li class="nav-item">
         <button
           class="nav-link {{if (eq this.activeTab 'config') 'active'}}"
           {{on "click" (fn this.setTab "config")}}
         >Main Configuration</button>
       </li>
       <li class="nav-item">
         <button
           class="nav-link {{if (eq this.activeTab 'prompts') 'active'}}"
           {{on "click" (fn this.setTab "prompts")}}
         >Prompts</button>
       </li>
     </ul>
     ```
   - Add a "Main Configuration" placeholder panel for the `config` tab:
     ```hbs
     {{#if (eq this.activeTab "config")}}
       <div class="card border-0 shadow-sm"><div class="card-body text-muted">Main configuration
           options will appear here in a future phase.</div></div>
     {{/if}}
     ```

---

### Step 9 — Sidebar Icons + Tooltips in Collapsed State

**Why:** When collapsed (64px), nav labels are hidden via CSS, but no icons are shown — leaving blank nav links. The spec requires icons with tooltips in the collapsed state.

**Client changes:**

1. In `client/app/components/ui-side-nav.hbs`, add Bootstrap Icons (or Unicode emoji as a lightweight fallback) inside each `<LinkTo>`:

   ```hbs
   <li class="nav-item">
     <LinkTo @route="home" @activeClass="active" class="nav-link" title="Home">
       <span class="nav-icon" aria-hidden="true">🏠</span>
       <span class="nav-label">Home</span>
     </LinkTo>
   </li>
   ```

   Repeat for Conversation (💬), Review (🃏), Settings (⚙️), Admin (🛠).

   If Bootstrap Icons are preferred, install `bootstrap-icons` and use `<i class="bi bi-house-door"></i>`.

2. Add `title` attributes on each `<LinkTo>` — these act as native tooltips in collapsed mode.

3. Add `aria-current="page"` support: In `client/app/components/ui-side-nav.hbs`, Ember's `<LinkTo>` does not auto-set `aria-current`. Pass `@active` as an argument:
   - Add `@isActive` helper or check `@active` — in Octane the cleanest way is to use `this.router.currentRouteName` (passed down from the parent) and add a conditional attribute:
     ```hbs
     <LinkTo @route="home" @activeClass="active" class="nav-link" aria-current={{if (eq @active "home") "page"}}>
     ```
     Apply the same pattern to all five nav links.

4. In `client/app/styles/app.css`, ensure the icon is always visible:
   ```css
   .app-shell.is-collapsed .side-nav .nav-icon {
     display: inline;
   }
   .nav-icon {
     margin-right: 0.5rem;
   }
   .app-shell.is-collapsed .side-nav .nav-icon {
     margin-right: 0;
   }
   ```

---

### Step 10 — Unsaved Changes Guard for Ember Route Transitions (Admin)

**Why:** The current `beforeunload` guard only fires on browser close/reload. Navigating to another Ember route while editing a template silently discards changes.

**Client changes (`client/app/controllers/admin.js`):**

1. Inject the router service: `@service router`.
2. In `constructor`, subscribe to router `routeWillChange` event:
   ```js
   this._routeChangeHandler = (transition) => {
     if (this.isDirty) {
       if (!window.confirm("You have unsaved changes. Leave anyway?")) {
         transition.abort();
       }
     }
   };
   this.router.on("routeWillChange", this._routeChangeHandler);
   ```
3. In `willDestroy`, remove the handler:
   ```js
   this.router.off("routeWillChange", this._routeChangeHandler);
   ```

---

### Step 11 — DELETE /templates/:id Endpoint (Admin)

**Why:** The spec lists this as optional/future but the exit criteria mentions admin template management completeness. It is a small addition.

**Server changes:**

1. In `server/src/routes/templates.ts`, add:

   ```ts
   templateRouter.delete("/:id", requireAuth, adminOnly, async (req, res) => {
     const existing = await prisma.template.findUnique({ where: { id: req.params.id } });
     if (!existing) return res.status(404).json({ error: "Template not found" });
     await prisma.template.delete({ where: { id: req.params.id } });
     res.status(204).send();
   });
   ```

2. In `client/app/services/api.js`, add:

   ```js
   deleteTemplate(token, id) {
     return this.fetch(`/templates/${id}`, {
       method: 'DELETE',
       headers: token ? { Authorization: `Bearer ${token}` } : {},
     });
   }
   ```

3. In `client/app/templates/admin.hbs`, add a **Delete** button in the editor (visible only when editing an existing template, not when `isNew`).

4. In `client/app/controllers/admin.js`, add `@action async deleteTemplate()`:
   - Show `window.confirm(...)`.
   - Call `api.deleteTemplate(...)`, clear editor, refresh list.

---

### Step 12 — Persona Snapshot Tests + Service Unit Tests

**Why:** Phase 2 exit criteria require snapshot tests proving distinct phrasing per persona and unit coverage for the main AI services.

**Server changes (`server/tests/`):**

1. Create `server/tests/conversationService.test.ts`:
   - Stub `sendChatCompletion` with `vi.mock`.
   - Test `buildSystemPrompt` with each persona × strictness combination and assert the returned string contains the expected persona and strictness phrases (snapshot test with `toMatchSnapshot()`).
   - Test `parsePartnerResponse` with valid JSON, JSON embedded in prose, and invalid input.

2. Create `server/tests/mistakeService.test.ts`:
   - Stub `sendChatCompletion` to return a fixture JSON array.
   - Assert that `analyzeMistakes` returns the correct shape, filters malformed entries, and limits to 3 results.

3. Create `server/tests/spacedRepetitionService.test.ts` (after Step 6):
   - Assert `computeNextDueAt("new", ...)` returns a date approximately 1 day ahead, etc.

4. Create `server/tests/sessions.api.test.ts`:
   - Use `supertest` against `createApp()`.
   - Test `POST /sessions`, `GET /sessions/:id`, `POST /sessions/:id/vocabulary`, and the new `PATCH /sessions/:id/vocabulary/:vocabId`.
   - Stub Prisma with `vi.mock('../src/db/prisma.js', ...)` or use a test DB (`.env.test` already provided).

---

### Step 13 — Nightly Summary Job (Stub / Staging)

**Why:** Exit criteria explicitly calls for a weekly summary job running in staging.

**Server changes:**

1. Create `server/src/jobs/weeklySummaryJob.ts`:
   - Export `runWeeklySummary(): Promise<void>`.
   - Query: for each user, fetch mistakes from the past 7 days grouped by `type`, count them, find top-3 recurring mistake hashes.
   - Fetch vocabulary items with `mastery !== 'mastered'` as the review queue size.
   - Log a structured pino entry with the metrics (`logger.info({ userId, topMistakes, reviewQueueSize }, 'weekly_summary')`).
   - No email sending yet — log output is the deliverable for staging validation.

2. Create `server/src/jobs/index.ts` that exports a `startJobs()` function:
   - Schedules `runWeeklySummary` using `setInterval` (every 24h) or a simple cron-style check on startup when `NODE_ENV !== 'test'`.
   - For a real scheduler, consider adding `node-cron` as a dependency; alternatively, call the function once on startup in non-production environments as a smoke test.

3. Call `startJobs()` from `server/src/index.ts` after the server starts listening.

---

## Exit Criteria Checklist

After completing the steps above, verify:

- [ ] Switching persona preset (Settings → new session) yields observably different AI phrasing; snapshot tests pass.
- [ ] Conversation side panel groups repeated mistakes and shows `×N` recurrence badge; `recommendedDrills` appear in an expandable section.
- [ ] After a conversation with 10+ turns, a level suggestion banner appears (or is suppressed) appropriately.
- [ ] Review page shows due vocabulary as flashcards; grading an item updates its mastery and due date; "All caught up" state displays when queue is empty.
- [ ] Settings page includes a Level dropdown; selection persists on reload; conversation scenario list reflects the saved level.
- [ ] Admin view shows "Main Configuration" and "Prompts" tabs; correct tab opens when navigating to `#admin=config` or `#admin=prompts`.
- [ ] Navigating away from the Admin view with unsaved prompt edits shows a confirmation dialog.
- [ ] Collapsed sidebar shows icons with native tooltips and active nav item has `aria-current="page"`.
- [ ] `DELETE /templates/:id` removes the template and it disappears from the admin list.
- [ ] Weekly summary job logs structured output in staging; no crashes on startup.
- [ ] `pnpm lint && pnpm test` pass with no errors.
