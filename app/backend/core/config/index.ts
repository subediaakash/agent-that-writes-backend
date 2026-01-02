import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default(
        "development",
    ),
    PORT: z.string().default("8080").transform(Number),
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
    OPENAI_MODEL: z.string().default("gpt-4o"),
    WORKSPACE_ROOT: z.string().default("./workspace"),
    MAX_FILES_PER_JOB: z.string().default("20").transform(Number),
    MAX_PROMPT_LENGTH: z.string().default("5000").transform(Number),
    RATE_LIMIT_WINDOW_MS: z.string().default("60000").transform(Number),
    RATE_LIMIT_MAX_REQUESTS: z.string().default("10").transform(Number),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"])
        .default("info"),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    DATABASE_URL: z.string().default("postgresql://localhost:5432/poll_db"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const config = {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    openai: {
        apiKey: parsed.data.OPENAI_API_KEY,
        model: parsed.data.OPENAI_MODEL,
    },
    workspaceRoot: parsed.data.WORKSPACE_ROOT,
    limits: {
        maxFilesPerJob: parsed.data.MAX_FILES_PER_JOB,
        maxPromptLength: parsed.data.MAX_PROMPT_LENGTH,
    },
    rateLimit: {
        windowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
        maxRequests: parsed.data.RATE_LIMIT_MAX_REQUESTS,
    },
    logLevel: parsed.data.LOG_LEVEL,
    isProduction: parsed.data.NODE_ENV === "production",
    isDevelopment: parsed.data.NODE_ENV === "development",
    redisUrl: parsed.data.REDIS_URL,
    databaseUrl: parsed.data.DATABASE_URL,
} as const;

export type Config = typeof config;
