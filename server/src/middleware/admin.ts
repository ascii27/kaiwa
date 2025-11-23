import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth.js";
import { env } from "../env.js";
import { prisma } from "../db/prisma.js";

const adminEmails = new Set(
  (env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export const adminOnly = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (adminEmails.size === 0) {
    return res.status(403).json({ error: "Admin disabled" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (!user.email || !adminEmails.has(user.email.toLowerCase())) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
};
