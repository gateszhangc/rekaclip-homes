import pino from "pino";

const level =
  process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

const root = pino({
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const logger = root;

export function createLogger(scope: string) {
  return root.child({ scope });
}
