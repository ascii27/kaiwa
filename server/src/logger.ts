import pino from "pino";
import pinoHttp from "pino-http";

// Allow overriding the log level via env vars. Defaults:
// - development/test: debug
// - production: info
const envLevel = process.env.PINO_LOG_LEVEL || process.env.LOG_LEVEL;
const defaultLevel = process.env.NODE_ENV === "production" ? "info" : "debug";
const level = envLevel || defaultLevel;

export const logger = pino({
  level,
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  customSuccessMessage: function () {
    return "request completed";
  },
});
