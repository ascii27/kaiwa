import { PrismaClient } from "@prisma/client";

import { env } from "../env.js";
import { logger } from "../logger.js";

export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});

prisma.$on("error", (error) => {
  logger.error({ error }, "Prisma error");
});
