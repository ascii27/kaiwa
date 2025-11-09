import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

import type { TemplateMetadata } from "@kaiwa/shared";

const candidateRoots = [
  path.resolve(process.cwd(), "content/templates"),
  path.resolve(process.cwd(), "../content/templates")
];

const templateRoot = candidateRoots.find((dir) => fs.existsSync(dir)) ?? candidateRoots[0];
let cachedTemplates: TemplateMetadata[] | null = null;

const readTemplateFiles = async () => {
  let languages: string[] = [];
  try {
    languages = await fsPromises.readdir(templateRoot);
  } catch {
    return [];
  }
  const templates: TemplateMetadata[] = [];
  for (const language of languages) {
    const languageDir = path.join(templateRoot, language);
    const levels = await fsPromises.readdir(languageDir);
    for (const level of levels) {
      const levelDir = path.join(languageDir, level);
      const files = await fsPromises.readdir(levelDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(levelDir, file);
        const raw = await fsPromises.readFile(filePath, "utf-8");
        const data = JSON.parse(raw) as TemplateMetadata;
        templates.push(data);
      }
    }
  }

  return templates;
};

const ensureTemplates = async () => {
  if (!cachedTemplates) {
    cachedTemplates = await readTemplateFiles();
  }
  return cachedTemplates;
};

export const listTemplates = async (filters?: { language?: string; level?: string }) => {
  const templates = await ensureTemplates();
  return templates.filter((template) => {
    if (filters?.language && template.language !== filters.language) return false;
    if (filters?.level && template.level !== filters.level) return false;
    return true;
  });
};

export const getTemplateById = async (id: string) => {
  const templates = await ensureTemplates();
  return templates.find((template) => template.id === id) ?? null;
};
