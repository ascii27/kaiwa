import cors from "cors";
import express from "express";
import helmet from "helmet";

import { httpLogger } from "./logger.js";
import { authRouter } from "./routes/auth.js";
import { sessionRouter } from "./routes/sessions.js";
import { templateRouter } from "./routes/templates.js";
import { settingsRouter } from "./routes/settings.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      const allowed = ["http://localhost:4200", "http://localhost:5173"];
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    optionsSuccessStatus: 204,
  };
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));
  app.use(httpLogger);

  app.get("/health", (_, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/sessions", sessionRouter);
  app.use("/templates", templateRouter);
  app.use("/settings", settingsRouter);

  return app;
};
