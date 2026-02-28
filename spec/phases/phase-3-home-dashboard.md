# Phase 3: Home Dashboard

## Goal

Replace the placeholder home page with a meaningful progress dashboard that gives learners an at-a-glance view of their activity, current proficiency assessment, vocabulary status, and personalised guidance on what to focus on next.

---

## Sections

### 1. Stats Bar (top row — 3–4 metric cards)

| Metric              | Source                                                      |
| ------------------- | ----------------------------------------------------------- |
| Total sessions      | `Session` count for user                                    |
| Total practice time | Sum of (session `updatedAt - createdAt`) for ENDED sessions |
| Current streak      | Consecutive calendar days with at least one session         |
| Vocabulary learned  | `VocabularyItem` count where `mastery != NEW`               |

Display as compact Bootstrap cards with a number, label, and subtle icon. No charts needed in v1.

---

### 2. Current Level & Assessment

- Show the user's `defaultLevel` from `UserSettings` (Beginner / Intermediate / Advanced).
- Display a short rationale summary pulled from the most recent level assessment in session history (store as a new optional `levelAssessmentNote` on `UserSettings`, updated whenever the AI suggests a level change and the user accepts it).
- Include a "What this means" blurb tailored to the level:
  - **Beginner**: Focus on common phrases and basic grammar. Short sessions, high repetition.
  - **Intermediate**: Build sentence variety, tackle connectors and verb conjugations.
  - **Advanced**: Work on nuance, natural flow, idiomatic expressions, domain vocabulary.

---

### 3. Guidance — What to Focus On

Derived automatically from session data; no user input required.

Priority rules (evaluate in order; show top 2–3 recommendations):

1. **Repeat mistakes** — If any mistake type (grammar / vocabulary / pronunciation) has recurrence ≥ 3 across recent sessions, surface it: "You've made recurring grammar mistakes. Consider a grammar drill session."
2. **Vocabulary due for review** — If `VocabularyItem` count with `dueAt <= now` > 0, surface: "N vocabulary items are due for review."
3. **No recent practice** — If last session was > 3 days ago: "You haven't practiced in X days. Even a 5-minute session helps retention."
4. **Level upgrade available** — If the AI has suggested a higher level (stored flag): "Your recent conversations suggest you may be ready to move up to Intermediate."
5. **Default / fallback** — "Keep it up! Start a new conversation to keep your streak going."

Each recommendation is rendered as a Bootstrap `alert` with an icon and a CTA button (e.g., "Go to Review", "Start a conversation").

---

### 4. Vocabulary Mastery Progress

A simple three-column summary:

| Column   | Content                                  |
| -------- | ---------------------------------------- |
| New      | Count of items with `mastery = NEW`      |
| Learning | Count of items with `mastery = LEARNING` |
| Mastered | Count of items with `mastery = MASTERED` |

Show as a Bootstrap progress bar segmented by mastery state, plus the three counts below it.

Due-today count prominently below: **"5 items due for review today"** with a link to `/review`.

---

### 5. Recent Sessions (last 5)

A compact table/list:

- Date, scenario/language, level, duration, mistake count
- Click row → navigates to that session (read-only view; future work — for now, omit if session detail page doesn't exist)

---

## Data Requirements

### New API endpoint — `GET /dashboard`

Returns a single payload to avoid N+1 round trips:

```json
{
  "stats": {
    "totalSessions": 12,
    "totalMinutes": 87,
    "currentStreak": 3,
    "vocabularyLearned": 34
  },
  "level": "intermediate",
  "levelNote": "Your sentence structure is solid; work on connectors.",
  "guidance": [
    { "type": "vocab_due", "count": 5 },
    { "type": "repeat_mistake", "mistakeType": "grammar", "recurrence": 4 }
  ],
  "vocabSummary": { "new": 8, "learning": 18, "mastered": 14 },
  "recentSessions": [
    {
      "id": "...",
      "createdAt": "...",
      "level": "intermediate",
      "durationMinutes": 9,
      "mistakeCount": 3
    }
  ]
}
```

### Schema changes

- Add `levelAssessmentNote String?` to `UserSettings` — stores the last AI rationale for level.
- Add `levelSuggested String?` to `UserSettings` — stores a pending level suggestion the user hasn't accepted yet (used for "ready to move up" guidance card).

---

## Implementation Plan

### Server

1. **`server/src/routes/dashboard.ts`** — new router, single `GET /` handler
   - Compute stats with Prisma aggregation queries
   - Derive guidance rules in service layer
   - Return combined payload
2. **`server/src/services/dashboardService.ts`** — pure data-fetching + rule evaluation
3. **Prisma migration** — add `levelAssessmentNote` and `levelSuggested` to `UserSettings`
4. **`server/src/routes/sessions.ts`** — `PATCH /sessions/:id/vocabulary/:vocabId` already exists; no change
5. **Register** `dashboardRouter` in `app.ts` at `/dashboard`

### Client

1. **`client/app/routes/home.js`** — call `api.getDashboard()`, return model
2. **`client/app/controllers/home.js`** — expose model properties, computed `guidanceItems`
3. **`client/app/templates/home.hbs`** — full template with 5 sections above
4. **`client/app/services/api.js`** — add `getDashboard(token)` method
5. **No new helpers needed** (re-use `eq`, `gt`)

---

## Out of Scope (this phase)

- Charts / trend graphs (save for Phase 5)
- Session detail / replay page
- Weekly email summary
- Leaderboard or social features
