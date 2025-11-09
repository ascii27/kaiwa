import { prisma } from "../db/prisma.js";
import type { PersonaTone, StrictnessLevel } from "@kaiwa/shared";

export interface StartSessionInput {
  userId: string;
  language: string;
  level: "beginner" | "intermediate" | "advanced";
  persona: PersonaTone;
  strictness: StrictnessLevel;
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
      scenarioId: input.scenarioId ?? null
    }
  });
};

export const getSessionById = async (id: string, userId: string) => {
  return prisma.session.findFirst({
    where: { id, userId },
    include: {
      turns: {
        orderBy: { createdAt: "asc" }
      },
      mistakes: true,
      vocabulary: true
    }
  });
};

export const listSessionsForUser = async (userId: string) => {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20
  });
};

export const endSession = async (id: string, userId: string) => {
  return prisma.session.updateMany({
    where: { id, userId },
    data: { status: "ENDED" }
  });
};

export const saveTurn = async (sessionId: string, role: "user" | "ai", text: string) => {
  return prisma.turn.create({
    data: {
      sessionId,
      role,
      text
    }
  });
};

export const getRecentTurns = async (sessionId: string, limit = 12) => {
  const turns = await prisma.turn.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit
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
          correction: mistake.correction
        }
      })
    )
  );

  return created;
};

export interface VocabularyInput {
  sessionId: string;
  phrase: string;
  translation: string;
  context: string;
}

export const saveVocabulary = async (items: VocabularyInput[]) => {
  if (!items.length) return [];
  const created = await prisma.$transaction(
    items.map((item) =>
      prisma.vocabularyItem.create({
        data: {
          sessionId: item.sessionId,
          phrase: item.phrase,
          translation: item.translation,
          context: item.context
        }
      })
    )
  );

  return created;
};
