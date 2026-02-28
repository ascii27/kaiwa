const INTERVALS_DAYS: Record<string, number> = {
  new: 1,
  learning: 3,
  mastered: 7,
};

export const computeNextDueAt = (mastery: string, from: Date = new Date()): Date => {
  const days = INTERVALS_DAYS[mastery.toLowerCase()] ?? 1;
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
};
