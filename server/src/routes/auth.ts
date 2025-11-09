import { Router } from "express";
import { z } from "zod";

import { signUp, login } from "../services/authService.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db/prisma.js";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const result = await signUp(email, password);
    res.status(201).json({
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        settings: result.user.settings
      }
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const result = await login(email, password);
    res.json({
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        settings: result.user.settings
      }
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: { settings: true }
  });
  res.json({ user });
});
