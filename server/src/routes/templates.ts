import { Router } from "express";

import { listTemplates } from "../templates/templateService.js";

export const templateRouter = Router();

templateRouter.get("/", async (req, res) => {
  const { language, level } = req.query;
  const templates = await listTemplates({
    language: typeof language === "string" ? language : undefined,
    level: typeof level === "string" ? level : undefined
  });
  res.json({ templates });
});
