export type StrictnessLevel = "gentle" | "standard" | "strict";

export type PersonaTone = "encouraging" | "neutral" | "blunt" | "humorous";

export interface UserSettings {
  id: string;
  userId: string;
  targetLanguage: string;
  persona: PersonaTone;
  strictness: StrictnessLevel;
  renderMode: "kanji" | "hiragana";
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
  createdAt: Date;
}

export interface VocabularyItem {
  id: string;
  sessionId: string;
  phrase: string;
  translation: string;
  context: string;
  mastery: "new" | "learning" | "mastered";
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
