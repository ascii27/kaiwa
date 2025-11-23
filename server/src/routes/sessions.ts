import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import {
  endSession,
  getSessionById,
  listSessionsForUser,
  saveVocabulary,
  startSession,
} from "../services/sessionService.js";
import { getTemplateById } from "../templates/templateService.js";

const startSessionSchema = z.object({
  language: z.string().default("japanese"),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  persona: z.enum(["encouraging", "neutral", "blunt", "humorous"]).default("encouraging"),
  strictness: z.enum(["gentle", "standard", "strict"]).default("standard"),
  characterStyle: z.enum(["kanji", "hiragana", "romaji"]).default("kanji"),
  scenarioId: z.string().optional(),
});

const vocabularySchema = z.object({
  phrase: z.string().min(1),
  translation: z.string().min(1),
  context: z.string().min(1),
});

export const sessionRouter = Router();

sessionRouter.use(requireAuth);

sessionRouter.post("/", async (req, res) => {
  const body = startSessionSchema.parse(req.body);
  const session = await startSession({
    userId: req.userId!,
    ...body,
  });

  let template = null;
  if (body.scenarioId) {
    template = await getTemplateById(body.scenarioId);
    if (template) {
      await saveVocabulary(
        template.vocabulary.map((item) => ({
          sessionId: session.id,
          phrase: item.phrase,
          translation: item.translation,
          context: template.summary,
        })),
      );
    }
  }

  res.status(201).json({ session, template });
});

sessionRouter.get("/", async (req, res) => {
  const sessions = await listSessionsForUser(req.userId!);
  res.json({ sessions });
});

sessionRouter.get("/:id", async (req, res) => {
  const session = await getSessionById(req.params.id, req.userId!);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json({ session });
});

sessionRouter.post("/:id/end", async (req, res) => {
  await endSession(req.params.id, req.userId!);
  res.json({ status: "ended" });
});

sessionRouter.post("/:id/vocabulary", async (req, res) => {
  const session = await getSessionById(req.params.id, req.userId!);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  const payload = vocabularySchema.parse(req.body);
  const vocab = await saveVocabulary([
    {
      sessionId: req.params.id,
      phrase: payload.phrase,
      translation: payload.translation,
      context: payload.context,
    },
  ]);

  res.status(201).json({ vocabulary: vocab });
});
