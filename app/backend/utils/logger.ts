import pino from "pino";
import { config } from "../config/index.js";

export const logger = pino({
    level: config.logLevel,
    transport: config.isDevelopment
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
            },
        }
        : undefined,
    base: {
        env: config.nodeEnv,
    },
    formatters: {
        level: (label) => ({ level: label }),
    },
});

export const createChildLogger = (context: Record<string, unknown>) => {
    return logger.child(context);
};

export type Logger = typeof logger;
