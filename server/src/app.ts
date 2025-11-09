import cors from "cors";
import express from "express";
import helmet from "helmet";

import { httpLogger } from "./logger.js";
import { authRouter } from "./routes/auth.js";
import { sessionRouter } from "./routes/sessions.js";
import { templateRouter } from "./routes/templates.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: "*"
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(httpLogger);

  app.get("/health", (_, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/sessions", sessionRouter);
  app.use("/templates", templateRouter);

  return app;
};
