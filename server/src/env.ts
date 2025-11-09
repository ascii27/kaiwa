import fs from "node:fs";

import dotenv from "dotenv";
import dotenvSafe from "dotenv-safe";
import { z } from "zod";

const envPath = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
dotenvSafe.config({
  path: envPath,
  allowEmptyValues: false,
  example: ".env.example"
});

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  OPENAI_API_KEY: z.string().min(10),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_TIMEOUT_MS: z.coerce.number().default(15000)
});

export const env = envSchema.parse(process.env);
