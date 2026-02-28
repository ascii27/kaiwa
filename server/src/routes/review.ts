import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { getDueVocabularyForUser } from "../services/sessionService.js";

export const reviewRouter = Router();

reviewRouter.use(requireAuth);

reviewRouter.get("/due", async (req, res) => {
  const items = await getDueVocabularyForUser(req.userId!);
  res.json({ items });
});
