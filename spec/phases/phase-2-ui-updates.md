# Phase 2 – UI Updates (Navigation, Conversation, Admin Prompts)

## Context (Current Status)

- App shell:
  - Left sidebar added with modes: Home, Conversation, Review, Settings, Admin.
  - Collapse button toggles a `.collapsed` class on the sidebar; however, the main content grid does not expand/contract because the grid columns are fixed at `240px 1fr`.
- Conversation view:
  - Session form currently includes Level, Persona, Strictness, and Output Script selectors (duplicating Settings intent).
  - Scenario (prompt) selection lists DB-backed templates filtered by language + level.
- Settings view:
  - Allows editing target language, persona, strictness, and character rendering.
  - Persists via `GET/PUT /settings`; updates local UI state on save.
- Admin view (Prompts authoring):
  - Two modes: Edit and New.
  - Edit: choose Language → Level → Scenario (template id), load and edit starting prompt, then save changes.
  - New: choose Language + Level, enter scenario and starting prompt, save new (id auto-generated server-side).
  - Uses DB-backed templates via `GET /templates`, `GET /templates/:id`, `POST /templates`, `PUT /templates/:id`.

## Goals

1. Sidebar fully collapses and expands the main stage area (responsive, accessible, and stateful).
2. Conversation view no longer requires Level, Persona, Strictness, or Output Script inputs; it should use saved Settings.
3. Admin view gains clear sub-navigation:
   - Main Configuration (placeholder for system/content settings to define later)
   - Prompts (Template authoring) — enhanced UX.
4. Prompts authoring UX improvements:
   - Show a browsable list of existing prompts with language/level filters and quick search.
   - Selecting a prompt loads it for editing; clicking New opens an empty form for creation.
   - Id remains auto-managed; focus on language, level, scenario, and starting prompt.

## Non‑Goals (for this update)

- Implementing actual Review drills or Home dashboard widgets.
- Advanced admin content types beyond prompt/templates.
- Role-based UI beyond current ADMIN_EMAILS gating.

## Information Architecture

- Sidebar (always visible; collapsible):
  - Home: Dashboard (placeholder for now).
  - Conversation: Start or continue a conversation using Settings defaults.
  - Review: Drills and spaced-repetition (placeholder for now).
  - Settings: Personal defaults (language, persona, strictness, script).
  - Admin: Sub-navigation (Main Configuration, Prompts authoring).

## Detailed UX Requirements

### 1) Sidebar Collapse Behavior

- Collapse/Expand:
  - Collapsed width: 64px; Expanded width: 240px.
  - Main content should dynamically expand to fill space when collapsed.
  - Add a class to the root shell (e.g., `.app-shell.is-collapsed`) and use CSS to switch grid columns: `grid-template-columns: 64px 1fr` vs. `240px 1fr`.
- Content:
  - In collapsed state, show only icons (or compact initials) with tooltips; labels hidden.
  - Active view is visually distinct in both states.
- Persistence:
  - Persist collapsed state in `localStorage` and restore on load.
- Accessibility:
  - Collapse button is a toggle with `aria-pressed` and `aria-label`.
  - Nav items are keyboard-focusable; add `aria-current="page"` on active.
  - Ensure contrast and focus rings meet WCAG AA.

### 2) Conversation View Uses Settings Defaults

- Remove the following inputs from the Conversation session form:
  - Level, Persona, Strictness, Output Script.
- Show instead:
  - Scenario selector (templates filtered by language + level derived from Settings).
  - A compact summary of current Settings (e.g., "Japanese • Beginner • Encouraging • Standard • Kanji"), with a link to Settings to modify.
- Behavior:
  - On session start, use values from `GET /settings` (or last-saved local state) for language, level (if added later), persona, strictness, and render mode.
  - If settings are missing, show a one-time inline prompt to visit Settings.
- Validation & Errors:
  - Disable Start if no scenario is selected; show an inline message.
  - Surface network errors from session start, clearly actionable.

### 3) Admin Sections

- Admin landing shows internal sub-navigation (tabs or vertical pills):
  - Main Configuration: placeholder for future system/content settings (e.g., rate limits, feature flags, content packs).
  - Prompts (Templates): authoring UI described below.
- Tabs update URL hash (e.g., `#admin=prompts`) for deep-linking and preservation on reload.

### 4) Prompts (Templates) Authoring UX

- Layout:
  - Two-pane layout: left list (filters + results), right editor (form).
- Filters (top of left pane):
  - Language select (from known languages + those present in DB)
  - Level select (beginner/intermediate/advanced; constrained by language)
  - Search input (filters list by scenario substring)
  - New button (opens empty form in editor)
- List (left pane):
  - Rows show: scenario (primary), level pill, language pill (if multi-lang), and last updated (if available later).
  - Selecting a row: loads template into the editor on the right.
- Editor (right pane):
  - For existing:
    - Language (select), Level (select), Scenario (text), Starting Prompt (textarea)
    - Save Changes button (enabled only if dirty)
  - For new:
    - Language (select), Level (select), Scenario (text), Starting Prompt (textarea)
    - Save New button (creates, auto-generates id)
  - Validation:
    - Scenario: required, >= 2 chars
    - Starting prompt: required, >= 1 char
  - Feedback:
    - Success/Failure toasts or inline alerts
    - Unsaved changes guard (warn before navigating away)
- Data model/Endpoints (reuse existing):
  - List: `GET /templates?language&level` (already returns TemplateMetadata[])
  - Get one: `GET /templates/:id` (returns TemplateMetadata)
  - Create: `POST /templates` { language, level, scenario, startingPrompt }
  - Update: `PUT /templates/:id` { language, level, scenario, startingPrompt }
  - Optional (future): `DELETE /templates/:id` — add with 2-step confirm (and revert via re-create if needed)

## Technical Plan

### Sidebar

- Add `.app-shell.is-collapsed` on container when toggled; update CSS grid columns to 64px/240px.
- Add icon set (Bootstrap icons or inline SVGs) for collapsed labels.
- Persist collapsed state in `localStorage` and restore on init.

### Conversation

- Remove persona/strictness/level/script inputs from session form; show Settings summary + link.
- Ensure `startSession` uses values from Settings state (fetched on app init or when Settings saved).
- Filter scenario list by Settings language + level (if "level" is added to UserSettings later, otherwise continue using in-memory state, but default it from Settings on load).

### Admin – Sections

- Replace current Admin card with sub-navigation (tabs/pills) to switch between:
  - Main Configuration (placeholder body)
  - Prompts (existing authoring UI moved into this pane)
- When entering Admin, default to Prompts.
- Wire hash/URL state so deep links open the right tab.

### Admin – Prompts Authoring Enhancements

- Left pane: add filters, search, and list.
- Right pane: simplify editor per spec; add dirty-state detection and confirm on navigate away.
- Normalize existing endpoints’ responses (already done) so editor uses `TemplateMetadata`.
- Optional: add `DELETE /templates/:id` endpoint with admin guard.

### Settings

- No API changes required; ensure Settings remains the single source of truth for persona, strictness, script, and target language.
- (Optional) Add `defaultLevel` to UserSettings + Prisma schema and reflect in Conversation view filtering.

## Validation & Exit Criteria

- Sidebar collapse fully expands the main stage and persists state; keyboard and screen-reader accessible.
- Conversation start no longer displays Persona/Strictness/Script/Level selectors; uses Settings values automatically.
- Admin view shows sub-navigation (Main Configuration, Prompts). Prompts shows filterable list and a functional editor.
- Creating a new prompt saves with auto id and appears in the list; editing an existing prompt updates it and reflects immediately.
- All changes survive reloads and remain consistent when switching views.

## QA Checklist

- Sidebar
  - Collapse/expand toggles layout width; icons visible in collapsed; tooltips present.
  - Focus order logical; ESC/Enter not trapped; `aria-current` set on active.
- Conversation
  - Settings changes affect new sessions; session start works without extra fields.
  - Errors from API are visible and actionable.
- Admin
  - Filters narrow list; search matches scenario substring.
  - New → Save New creates and lists; Edit → Save Changes persists updates.
  - Try navigating away with unsaved changes; confirm dialog appears.
- Accessibility
  - Sufficient contrast; focus outlines; form labels present; inputs have names.

## Open Questions

- Should we add `defaultLevel` into `UserSettings` now to remove the remaining level picker dependency in Conversation?
- Do we want a soft-delete or versioning for prompts?
- Should Admin allow importing/exporting prompts as JSON for bulk authorship?
