import { prisma } from "../db/prisma.js";

export interface GuidanceItem {
  type: "repeat_mistake" | "vocab_due" | "inactive" | "level_suggestion" | "default";
  count?: number;
  mistakeType?: string;
}

export interface DashboardPayload {
  stats: {
    totalSessions: number;
    totalMinutes: number;
    currentStreak: number;
    vocabularyLearned: number;
  };
  level: string | null;
  levelNote: string | null;
  guidance: GuidanceItem[];
  vocabSummary: { new: number; learning: number; mastered: number };
  recentSessions: Array<{
    id: string;
    createdAt: string;
    level: string;
    durationMinutes: number;
    mistakeCount: number;
  }>;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeStreak(sessionDates: Date[]): number {
  if (sessionDates.length === 0) return 0;

  const uniqueDays = [...new Set(sessionDates.map(toIsoDate))].sort((a, b) => (a > b ? -1 : 1)); // descending

  const today = toIsoDate(new Date());
  const yesterday = toIsoDate(new Date(Date.now() - 86_400_000));

  // Streak must include today or yesterday to be active
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function getDashboardData(userId: string): Promise<DashboardPayload> {
  const [
    totalSessions,
    endedSessions,
    allSessionDates,
    vocabularyLearned,
    userSettings,
    repeatMistakeGroups,
    vocabDueCount,
    vocabGroups,
    recentSessions,
  ] = await Promise.all([
    prisma.session.count({ where: { userId } }),

    prisma.session.findMany({
      where: { userId, status: "ENDED" },
      select: { createdAt: true, updatedAt: true },
    }),

    prisma.session.findMany({
      where: { userId },
      select: { createdAt: true },
    }),

    prisma.vocabularyItem.count({
      where: { session: { userId }, mastery: { not: "NEW" } },
    }),

    prisma.userSettings.findUnique({ where: { userId } }),

    prisma.mistake.groupBy({
      by: ["type"],
      where: { session: { userId } },
      _count: { _all: true },
    }),

    prisma.vocabularyItem.count({
      where: { session: { userId }, dueAt: { lte: new Date() } },
    }),

    prisma.vocabularyItem.groupBy({
      by: ["mastery"],
      where: { session: { userId } },
      _count: true,
    }),

    prisma.session.findMany({
      take: 5,
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        level: true,
        _count: { select: { mistakes: true } },
      },
    }),
  ]);

  // Stats
  const totalMinutes = Math.round(
    endedSessions.reduce((sum, s) => sum + (s.updatedAt.getTime() - s.createdAt.getTime()), 0) /
      60_000,
  );

  const currentStreak = computeStreak(allSessionDates.map((s) => s.createdAt));

  // Level + note
  const level = userSettings?.defaultLevel ?? null;
  const levelNote = userSettings?.levelAssessmentNote ?? null;

  // Guidance (max 3)
  const guidance: GuidanceItem[] = [];

  for (const g of repeatMistakeGroups) {
    if (guidance.length >= 3) break;
    if (g._count._all >= 3) {
      guidance.push({
        type: "repeat_mistake",
        mistakeType: g.type.toLowerCase(),
        count: g._count._all,
      });
    }
  }

  if (guidance.length < 3 && vocabDueCount > 0) {
    guidance.push({ type: "vocab_due", count: vocabDueCount });
  }

  if (guidance.length < 3) {
    const lastSession = allSessionDates
      .map((s) => s.createdAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const threeDaysAgo = Date.now() - 3 * 86_400_000;
    if (!lastSession || lastSession.getTime() < threeDaysAgo) {
      guidance.push({ type: "inactive" });
    }
  }

  if (guidance.length < 3 && userSettings?.levelSuggested) {
    guidance.push({ type: "level_suggestion" });
  }

  if (guidance.length < 3) {
    guidance.push({ type: "default" });
  }

  // Vocab summary
  const masteryMap: Record<string, number> = { NEW: 0, LEARNING: 0, MASTERED: 0 };
  for (const g of vocabGroups) {
    masteryMap[g.mastery] = g._count;
  }
  const vocabSummary = {
    new: masteryMap["NEW"],
    learning: masteryMap["LEARNING"],
    mastered: masteryMap["MASTERED"],
  };

  // Recent sessions
  const recentSessionsMapped = recentSessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    level: s.level,
    durationMinutes: Math.round((s.updatedAt.getTime() - s.createdAt.getTime()) / 60_000),
    mistakeCount: s._count.mistakes,
  }));

  return {
    stats: { totalSessions, totalMinutes, currentStreak, vocabularyLearned },
    level,
    levelNote,
    guidance,
    vocabSummary,
    recentSessions: recentSessionsMapped,
  };
}
