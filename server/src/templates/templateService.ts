import type { TemplateMetadata } from "@kaiwa/shared";
import { prisma } from "../db/prisma.js";

const mapRow = (row: any): TemplateMetadata => {
  const data = (row.data ?? {}) as any;
  const starterTurns = Array.isArray(data?.starterTurns)
    ? data.starterTurns
    : typeof data?.startingPrompt === "string" && data.startingPrompt.length
      ? [{ role: "user", text: data.startingPrompt }]
      : [];
  return {
    id: row.id,
    language: row.language,
    level: row.level,
    scenario: row.scenario,
    summary: row.summary,
    starterTurns,
    vocabulary: Array.isArray(data?.vocabulary) ? data.vocabulary : [],
  };
};

export const listTemplates = async (filters?: { language?: string; level?: string }) => {
  const rows = await prisma.template.findMany({
    where: {
      language: filters?.language ?? undefined,
      level: filters?.level ?? undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(mapRow);
};

export const getTemplateById = async (id: string) => {
  const row = await prisma.template.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
};
