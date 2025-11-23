import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db/prisma.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

const settingsSchema = z.object({
  targetLang: z.string().min(2),
  persona: z.enum(["encouraging", "neutral", "blunt", "humorous"]).default("encouraging"),
  strictness: z.enum(["gentle", "standard", "strict"]).default("standard"),
  renderMode: z.enum(["kanji", "hiragana", "romaji"]).default("kanji"),
});

const toResponse = (row: any) => ({
  targetLang: row?.targetLang ?? "japanese",
  persona: (row?.persona ?? "ENCOURAGING").toString().toLowerCase(),
  strictness: (row?.strictness ?? "STANDARD").toString().toLowerCase(),
  renderMode: (row?.renderMode ?? "kanji").toString().toLowerCase(),
});

settingsRouter.get("/", async (req, res) => {
  const settings = await prisma.userSettings.findUnique({ where: { userId: req.userId! } });
  return res.json({ settings: toResponse(settings) });
});

settingsRouter.put("/", async (req, res) => {
  const body = settingsSchema.parse(req.body);
  const upserted = await prisma.userSettings.upsert({
    where: { userId: req.userId! },
    update: {
      targetLang: body.targetLang,
      persona: body.persona.toUpperCase() as any,
      strictness: body.strictness.toUpperCase() as any,
      renderMode: body.renderMode,
    },
    create: {
      userId: req.userId!,
      targetLang: body.targetLang,
      persona: body.persona.toUpperCase() as any,
      strictness: body.strictness.toUpperCase() as any,
      renderMode: body.renderMode,
    },
  });
  return res.json({ settings: toResponse(upserted) });
});
