import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { getDashboardData } from "../services/dashboardService.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/", async (req, res) => {
  const data = await getDashboardData(req.userId!);
  res.json(data);
});
