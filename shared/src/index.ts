export type StrictnessLevel = "gentle" | "standard" | "strict";

export type PersonaTone = "encouraging" | "neutral" | "blunt" | "humorous";

export type CharacterStyle = "kanji" | "hiragana" | "romaji";

export interface UserSettings {
  id: string;
  userId: string;
  targetLanguage: string;
  persona: PersonaTone;
  strictness: StrictnessLevel;
  renderMode: CharacterStyle;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  settings?: UserSettings;
}

export interface Session {
  id: string;
  userId: string;
  language: string;
  level: "beginner" | "intermediate" | "advanced";
  persona: PersonaTone;
  strictness: StrictnessLevel;
  characterStyle: CharacterStyle;
  scenarioId?: string;
  status: "active" | "ended";
  createdAt: Date;
  updatedAt: Date;
}

export interface Turn {
  id: string;
  sessionId: string;
  role: "user" | "ai";
  text: string;
  translation?: string | null;
  createdAt: Date;
}

export type MistakeType = "grammar" | "pronunciation" | "vocabulary";

export interface Mistake {
  id: string;
  sessionId: string;
  turnId: string;
  type: MistakeType;
  severity: "low" | "medium" | "high";
  message: string;
  correction: string;
  // Phase 2 extensions (optional for backward compat)
  subcategory?: string;
  severityScore?: number; // 0-1 normalized severity
  hash?: string; // stable grouping key for recurrence
  recurrence?: number; // frequency counter when grouped
  createdAt: Date;
}

export interface VocabularyItem {
  id: string;
  sessionId: string;
  phrase: string;
  translation: string;
  context: string;
  mastery: "new" | "learning" | "mastered";
  // Phase 2: spaced repetition scheduling
  dueAt?: Date;
  createdAt: Date;
}

export interface TemplateMetadata {
  id: string;
  language: string;
  level: string;
  scenario: string;
  summary: string;
  starterTurns: Array<{ role: "user" | "ai"; text: string }>;
  vocabulary: Array<{ phrase: string; translation: string }>;
}
