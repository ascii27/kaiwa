import { prisma } from "../db/prisma.js";
import type { CharacterStyle, PersonaTone, StrictnessLevel } from "@kaiwa/shared";
import { computeNextDueAt } from "./spacedRepetitionService.js";

export interface StartSessionInput {
  userId: string;
  language: string;
  level: "beginner" | "intermediate" | "advanced";
  persona: PersonaTone;
  strictness: StrictnessLevel;
  characterStyle: CharacterStyle;
  scenarioId?: string;
}

export const startSession = async (input: StartSessionInput) => {
  return prisma.session.create({
    data: {
      userId: input.userId,
      language: input.language,
      level: input.level,
      persona: input.persona.toUpperCase() as any,
      strictness: input.strictness.toUpperCase() as any,
      characterStyle: input.characterStyle.toUpperCase() as any,
      scenarioId: input.scenarioId ?? null,
    },
  });
};

export const getSessionById = async (id: string, userId: string) => {
  return prisma.session.findFirst({
    where: { id, userId },
    include: {
      turns: {
        orderBy: { createdAt: "asc" },
      },
      mistakes: true,
      vocabulary: true,
    },
  });
};

export const listSessionsForUser = async (userId: string) => {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
};

export const endSession = async (id: string, userId: string) => {
  return prisma.session.updateMany({
    where: { id, userId },
    data: { status: "ENDED" },
  });
};

export const saveTurn = async (
  sessionId: string,
  role: "user" | "ai",
  text: string,
  translation?: string | null,
) => {
  return prisma.turn.create({
    data: {
      sessionId,
      role,
      text,
      translation: translation ?? null,
    },
  });
};

export const getRecentTurns = async (sessionId: string, limit = 12) => {
  const turns = await prisma.turn.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return turns.reverse();
};

export interface MistakeInput {
  sessionId: string;
  turnId: string;
  type: "grammar" | "pronunciation" | "vocabulary";
  severity: "low" | "medium" | "high";
  message: string;
  correction: string;
}

export const saveMistakes = async (mistakes: MistakeInput[]) => {
  if (!mistakes.length) return [];
  const created = await prisma.$transaction(
    mistakes.map((mistake) =>
      prisma.mistake.create({
        data: {
          sessionId: mistake.sessionId,
          turnId: mistake.turnId,
          type: mistake.type.toUpperCase() as any,
          severity: mistake.severity,
          message: mistake.message,
          correction: mistake.correction,
        },
      }),
    ),
  );

  return created;
};

export interface VocabularyInput {
  sessionId: string;
  phrase: string;
  translation: string;
  context: string;
}

export const updateVocabularyMastery = async (vocabId: string, userId: string, mastery: string) => {
  const item = await prisma.vocabularyItem.findFirst({
    where: { id: vocabId, session: { userId } },
  });
  if (!item) return null;
  const dueAt = computeNextDueAt(mastery);
  return prisma.vocabularyItem.update({
    where: { id: vocabId },
    data: { mastery: mastery.toUpperCase() as any, dueAt },
  });
};

export const getDueVocabularyForUser = async (userId: string, limit = 20) => {
  return prisma.vocabularyItem.findMany({
    where: {
      session: { userId },
      dueAt: { lte: new Date() },
    },
    orderBy: { dueAt: "asc" },
    take: limit,
  });
};

export const saveVocabulary = async (items: VocabularyInput[]) => {
  if (!items.length) return [];
  const created = await prisma.$transaction(
    items.map((item) =>
      prisma.vocabularyItem.create({
        data: {
          sessionId: item.sessionId,
          phrase: item.phrase,
          translation: item.translation,
          context: item.context,
        },
      }),
    ),
  );

  return created;
};
